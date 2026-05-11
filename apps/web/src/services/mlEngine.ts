import { THRESHOLDS } from '@/config/thresholds'
import type { SensorReading } from '@/data/mockSensors'

// ── Linear regression (no external library) ──────────────────────────
function linearRegression(values: number[]) {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 }

  const sumX  = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY  = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((s, y, i) => s + i * y, 0)

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const meanY  = sumY / n
  const ssTot  = values.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const ssRes  = values.reduce((s, y, i) => s + (y - (intercept + slope * i)) ** 2, 0)
  const r2     = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)

  return { slope, intercept, r2 }
}

function predict(reg: ReturnType<typeof linearRegression>, x: number) {
  return reg.intercept + reg.slope * x
}

// ── MTBF ─────────────────────────────────────────────────────────────
export function calculateMTBF(readings: SensorReading[]): number {
  const faultCount = readings.filter(r => r.isFault).length
  if (faultCount === 0) return Infinity
  const totalHours = readings.length * 8  // 8h/day assumed
  return Math.round(totalHours / faultCount)
}

// ── RUL Prediction ────────────────────────────────────────────────────
export interface PredictionResult {
  rul:             number      // Remaining Useful Life in days (Infinity = no fault predicted)
  confidence:      number      // 0–100
  alert:           'ok' | 'warning' | 'critical'
  recommendation:  string
  currentVib:      number
  trendSlope:      number      // mm/s per day
  projectedVib30d: number
  mtbf:            number
  r2:              number
}

export function predictFailure(readings: SensorReading[]): PredictionResult {
  if (readings.length < 30) {
    return {
      rul: Infinity, confidence: 0, alert: 'ok',
      recommendation: 'Insuficientes datos históricos (mínimo 30 días).',
      currentVib: 0, trendSlope: 0, projectedVib30d: 0,
      mtbf: 0, r2: 0,
    }
  }

  // Use last 90 days for trend
  const window  = readings.slice(-90)
  const vibData = window.map(r => r.vibration)
  const reg     = linearRegression(vibData)
  const n       = vibData.length
  const currentVib     = vibData[n - 1]
  const projectedVib30d = predict(reg, n + 30)

  const mtbf = calculateMTBF(readings)

  // Estimate days to critical threshold using slope
  let rul = Infinity
  if (reg.slope > 0) {
    const daysToThreshold = (THRESHOLDS.vibration.critical - currentVib) / reg.slope
    rul = Math.max(0, Math.round(daysToThreshold))
  }

  const alert: PredictionResult['alert'] =
    rul <= 7  ? 'critical' :
    rul <= 21 ? 'warning'  : 'ok'

  const confidence = Math.min(98, Math.round(reg.r2 * 80 + 18))

  const recommendation =
    alert === 'critical'
      ? `⚠️ Falla estimada en ${rul} día${rul === 1 ? '' : 's'}. Programar mantenimiento URGENTE.`
      : alert === 'warning'
        ? `Tendencia de desgaste detectada. Revisar en los próximos ${rul} días.`
        : 'Equipo operando dentro de parámetros normales. Seguimiento rutinario.'

  return {
    rul,
    confidence,
    alert,
    recommendation,
    currentVib:      Math.round(currentVib * 100) / 100,
    trendSlope:      Math.round(reg.slope * 1000) / 1000,
    projectedVib30d: Math.round(Math.max(0, projectedVib30d) * 100) / 100,
    mtbf,
    r2:              Math.round(reg.r2 * 100) / 100,
  }
}
