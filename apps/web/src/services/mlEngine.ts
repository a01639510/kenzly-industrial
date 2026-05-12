import { THRESHOLDS } from '@/config/thresholds'
import type { SensorReading } from '@/data/mockSensors'

// ── Math helpers ──────────────────────────────────────────────
function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function std(vals: number[]): number {
  const m = avg(vals)
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length)
}

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

// ── MTBF ─────────────────────────────────────────────────────
export function calculateMTBF(readings: SensorReading[]): number {
  const faultCount = readings.filter(r => r.isFault).length
  if (faultCount === 0) return Infinity
  const totalHours = readings.length * 8
  return Math.round(totalHours / faultCount)
}

// ── Result interface ──────────────────────────────────────────
export interface PredictionResult {
  // Core RUL
  rul:              number    // Remaining Useful Life in days (Infinity = no fault predicted)
  tempRul:          number    // Days to temperature critical threshold
  confidence:       number    // 0–100
  alert:            'ok' | 'warning' | 'critical'
  recommendation:   string

  // Current readings
  currentVib:       number
  currentTemp:      number

  // Vibration regression
  trendSlope:       number    // mm/s per day
  projectedVib30d:  number
  r2:               number
  mtbf:             number

  // Anomaly detection (Z-scores: how many std devs from mean)
  anomalyVib:       number
  anomalyTemp:      number

  // Wear dynamics
  wearAcceleration: number    // mm/s per day² — positive = degrading faster over time

  // Fault frequency
  faultDensity:     number    // fault events in last 30 readings

  // Composite risk (0–100)
  combinedRisk:     number
}

// ── Main prediction function ──────────────────────────────────
export function predictFailure(readings: SensorReading[]): PredictionResult {
  const empty: PredictionResult = {
    rul: Infinity, tempRul: Infinity, confidence: 0, alert: 'ok',
    recommendation: 'Insuficientes datos históricos (mínimo 30 días).',
    currentVib: 0, currentTemp: 0,
    trendSlope: 0, projectedVib30d: 0, r2: 0, mtbf: 0,
    anomalyVib: 0, anomalyTemp: 0, wearAcceleration: 0,
    faultDensity: 0, combinedRisk: 0,
  }
  if (readings.length < 30) return empty

  // Use last 90 days for regression window
  const window   = readings.slice(-90)
  const vibData  = window.map(r => r.vibration)
  const tempData = window.map(r => r.temperature)
  const n        = vibData.length

  const vibReg  = linearRegression(vibData)
  const tempReg = linearRegression(tempData)

  const currentVib  = vibData[n - 1]
  const currentTemp = tempData[n - 1]
  const projectedVib30d = predict(vibReg, n + 30)
  const mtbf = calculateMTBF(readings)

  // ── Vibration RUL
  let rul = Infinity
  if (vibReg.slope > 0) {
    rul = Math.max(0, Math.round((THRESHOLDS.vibration.critical - currentVib) / vibReg.slope))
  }

  // ── Temperature RUL
  let tempRul = Infinity
  if (tempReg.slope > 0) {
    tempRul = Math.max(0, Math.round((THRESHOLDS.temperature.critical - currentTemp) / tempReg.slope))
  }

  // ── Anomaly detection (Z-score from rolling window)
  const vibStd  = std(vibData)
  const tempStd = std(tempData)
  const anomalyVib  = vibStd  > 0 ? Math.round(Math.abs(currentVib  - avg(vibData))  / vibStd  * 100) / 100 : 0
  const anomalyTemp = tempStd > 0 ? Math.round(Math.abs(currentTemp - avg(tempData)) / tempStd * 100) / 100 : 0

  // ── Wear acceleration: compare slope of first vs second half of window
  const half        = Math.floor(n / 2)
  const slopeFirst  = linearRegression(vibData.slice(0, half)).slope
  const slopeSecond = linearRegression(vibData.slice(half)).slope
  const wearAcceleration = Math.round((slopeSecond - slopeFirst) * 10000) / 10000

  // ── Fault density: faults in last 30 readings
  const faultDensity = readings.slice(-30).filter(r => r.isFault).length

  // ── Combined risk score (0–100)
  // Each factor is normalized to 0–100 before weighting
  const vibFactor    = rul      === Infinity ? 0 : Math.min(100, Math.max(0, Math.round(100 - (rul      / 90) * 100)))
  const tempFactor   = tempRul  === Infinity ? 0 : Math.min(100, Math.max(0, Math.round(100 - (tempRul  / 60) * 100)))
  const anomalyFactor = Math.min(100, Math.round(anomalyVib * 22 + anomalyTemp * 14))
  const faultFactor  = Math.min(100, faultDensity * 15)
  const accelFactor  = wearAcceleration > 0 ? Math.min(100, Math.round(wearAcceleration * 5000)) : 0

  const combinedRisk = Math.min(100, Math.round(
    vibFactor    * 0.38 +
    tempFactor   * 0.22 +
    anomalyFactor * 0.18 +
    faultFactor  * 0.14 +
    accelFactor  * 0.08
  ))

  // ── Alert level driven by worst RUL
  const minRul = Math.min(rul, tempRul)
  const alert: PredictionResult['alert'] =
    minRul <= 7  ? 'critical' :
    minRul <= 21 ? 'warning'  :
    combinedRisk >= 65 ? 'warning' : 'ok'

  const confidence = Math.min(98, Math.round(vibReg.r2 * 80 + 18))

  const recommendation =
    alert === 'critical'
      ? `Falla estimada en ${rul === Infinity ? 'N/A' : rul + ' día' + (rul === 1 ? '' : 's')} (vib) / ${tempRul === Infinity ? 'N/A' : tempRul + 'd'} (temp). Programar mantenimiento URGENTE.`
      : alert === 'warning'
        ? `Tendencia de desgaste detectada. Revisar en los próximos ${Math.min(rul === Infinity ? 999 : rul, tempRul === Infinity ? 999 : tempRul)} días.`
        : 'Equipo operando dentro de parámetros normales. Seguimiento rutinario.'

  return {
    rul,
    tempRul,
    confidence,
    alert,
    recommendation,
    currentVib:       Math.round(currentVib  * 100) / 100,
    currentTemp:      Math.round(currentTemp * 10)  / 10,
    trendSlope:       Math.round(vibReg.slope * 1000) / 1000,
    projectedVib30d:  Math.round(Math.max(0, projectedVib30d) * 100) / 100,
    r2:               Math.round(vibReg.r2 * 100) / 100,
    mtbf,
    anomalyVib,
    anomalyTemp,
    wearAcceleration,
    faultDensity,
    combinedRisk,
  }
}
