import { COMPANY_CONFIG } from '@/config/company'
import { THRESHOLDS } from '@/config/thresholds'

// ── Seeded PRNG (Mulberry32) for reproducibility ─────────────────────
function seedRandom(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Gaussian noise via Box-Muller
function gaussian(rng: () => number, mean: number, std: number) {
  const u = rng(), v = rng()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface SensorReading {
  date:        string
  vibration:   number  // mm/s
  temperature: number  // °C
  production:  number  // units
  energy:      number  // kWh
  uptime:      number  // %
  isFault:     boolean
}

export interface MachineHistory {
  machineId: string
  readings:  SensorReading[]
  faults:    number[]        // indices of fault events
}

const DAYS = 365

export function generateMachineHistory(machineId: string): MachineHistory {
  const seed = machineId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng  = seedRandom(seed)

  // Machine-specific base params
  const params: Record<string, { vib: number; temp: number; pph: number; kw: number }> = {
    M01: { vib: 2.2, temp: 58, pph: 420, kw: 38 },
    M02: { vib: 1.8, temp: 52, pph: 380, kw: 28 },
    M03: { vib: 3.1, temp: 65, pph: 290, kw: 52 },
    M04: { vib: 2.5, temp: 60, pph: 450, kw: 35 },
    M05: { vib: 1.5, temp: 45, pph: 510, kw: 22 },
    M06: { vib: 2.0, temp: 55, pph: 400, kw: 44 },
  }
  const p = params[machineId] ?? { vib: 2.0, temp: 55, pph: 400, kw: 35 }

  // Fault days — 3–5 per year
  const faultCount = 3 + Math.floor(rng() * 3)
  const faultDays  = new Set<number>()
  while (faultDays.size < faultCount) faultDays.add(20 + Math.floor(rng() * (DAYS - 30)))

  const readings: SensorReading[] = []
  const today = new Date()

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (DAYS - 1 - i))
    const dayStr = d.toISOString().split('T')[0]

    const isFault   = faultDays.has(i)
    const nearFault = [...faultDays].some(f => i >= f - 5 && i < f)

    // Vibration: gradual increase over year + pre-fault spike
    const wearTrend = (i / DAYS) * 1.2
    const faultBump  = nearFault ? 2 + rng() * 1.5 : 0
    const faultPeak  = isFault   ? 8 + rng() * 3   : 0
    const vibration  = isFault ? faultPeak :
      Math.max(0.5, gaussian(rng, p.vib + wearTrend + faultBump, 0.3))

    // Temperature: correlated with vibration
    const temperature = isFault
      ? 90 + rng() * 15
      : Math.max(20, gaussian(rng, p.temp + wearTrend * 2 + faultBump * 1.5, 1.5))

    // Uptime: drops on fault days
    const uptime = isFault ? 0 : nearFault
      ? gaussian(rng, 78, 4)
      : gaussian(rng, 94, 2)

    // Production: proportional to uptime
    const production = isFault ? 0 :
      Math.round(Math.max(0, gaussian(rng, p.pph * (uptime / 100) * 8, p.pph * 0.05)))

    // Energy
    const energy = isFault ? 0 :
      Math.max(0, gaussian(rng, p.kw * (uptime / 100) * 8, p.kw * 0.08))

    readings.push({
      date:        dayStr,
      vibration:   Math.round(vibration * 100) / 100,
      temperature: Math.round(temperature * 10) / 10,
      production:  Math.max(0, production),
      energy:      Math.round(energy * 10) / 10,
      uptime:      Math.round(Math.min(100, Math.max(0, uptime)) * 10) / 10,
      isFault,
    })
  }

  return { machineId, readings, faults: [...faultDays] }
}

// Pre-generate all machine histories
export const ALL_HISTORIES: Record<string, MachineHistory> = Object.fromEntries(
  COMPANY_CONFIG.machines.map(m => [m.id, generateMachineHistory(m.id)])
)

// Live sensor simulation
export function generateRealtimeVariation(base: number, variance: number, rng?: () => number) {
  const r = rng ?? Math.random
  return Math.round((base + (r() - 0.5) * 2 * variance) * 100) / 100
}

// Current machine status (last reading + live variation)
export function getMachineStatus(machineId: string) {
  const hist = ALL_HISTORIES[machineId]
  const last = hist.readings[hist.readings.length - 1]
  const rng  = seedRandom(Date.now() + machineId.charCodeAt(0))

  const vib  = generateRealtimeVariation(last.vibration,   0.4, rng)
  const temp = generateRealtimeVariation(last.temperature, 2.0, rng)

  const status: 'operating' | 'warning' | 'fault' =
    vib >= THRESHOLDS.vibration.critical || temp >= THRESHOLDS.temperature.critical
      ? 'fault'
      : vib >= THRESHOLDS.vibration.warning || temp >= THRESHOLDS.temperature.warning
        ? 'warning'
        : 'operating'

  return { machineId, vibration: vib, temperature: temp, status, uptime: last.uptime }
}

// OEE from last 7 days
export function getOEEStats(machineId: string) {
  const readings = ALL_HISTORIES[machineId].readings.slice(-7)
  const avg = (fn: (r: SensorReading) => number) =>
    readings.reduce((s, r) => s + fn(r), 0) / readings.length

  const availability = avg(r => r.uptime) / 100
  const performance  = avg(r => r.production) / (COMPANY_CONFIG.kpis.pphTarget * 8)
  const quality      = 0.95 + Math.random() * 0.04  // simulated

  return {
    availability: Math.round(Math.min(1, availability) * 100),
    performance:  Math.round(Math.min(1, performance)  * 100),
    quality:      Math.round(Math.min(1, quality)      * 100),
    oee:          Math.round(Math.min(1, availability * Math.min(1, performance) * quality) * 100),
  }
}

// Aggregate production last 24h (hourly)
export function getHourlyProduction(machineId: string): { hour: string; units: number }[] {
  const rng = seedRandom(machineId.charCodeAt(0) + 7)
  const base = COMPANY_CONFIG.kpis.pphTarget
  return Array.from({ length: 24 }, (_, h) => ({
    hour:  `${String(h).padStart(2, '0')}:00`,
    units: Math.round(generateRealtimeVariation(base, base * 0.2, rng)),
  }))
}
