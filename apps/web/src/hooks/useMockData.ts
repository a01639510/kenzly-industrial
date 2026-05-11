import { useState, useEffect } from 'react'
import { getOEEStats, getHourlyProduction } from '@/data/mockSensors'
import { getCachedHistory, useSensorHistory, useCacheVersion } from '@/data/sensorCache'
import { COMPANY_CONFIG } from '@/config/company'
import { THRESHOLDS } from '@/config/thresholds'
import { apiFetch } from '@/lib/apiClient'

type OEESummary = {
  oee: number
  availability: number
  performance:  number
  quality:      number
}

// ── Derive KPIs from sensor cache synchronously (instant, no API wait) ────────
function kpisFromCache(oee: OEESummary) {
  const uptime = Math.round(
    COMPANY_CONFIG.machines.reduce((s, m) => s + (getCachedHistory(m.id).slice(-1)[0]?.uptime ?? 0), 0) /
    COMPANY_CONFIG.machines.length
  )
  const production = COMPANY_CONFIG.machines.reduce(
    (s, m) => s + (getCachedHistory(m.id).slice(-1)[0]?.production ?? 0), 0
  )
  const energy = Math.round(
    COMPANY_CONFIG.machines.reduce((s, m) => s + (getCachedHistory(m.id).slice(-1)[0]?.energy ?? 0), 0)
  )
  return { ...oee, uptime, production, energy, alerts: 3 }
}

export function useLiveKPIs() {
  const [oee, setOee] = useState<OEESummary>({ oee: 82, availability: 90, performance: 88, quality: 95 })

  useEffect(() => {
    const fetch = () =>
      apiFetch<OEESummary>('/oee/summary')
        .then(data => setOee(data))
        .catch(() => {}) // keep previous on error

    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [])

  // sensor-based KPIs update reactively when sensorCache refreshes
  useCacheVersion()
  return kpisFromCache(oee)
}

// ── Machine statuses from real sensor cache ───────────────────────────────────
function statusFromCache(machineId: string) {
  const last = getCachedHistory(machineId).slice(-1)[0]
  if (!last) return { machineId, vibration: 0, temperature: 0, status: 'operating' as const, uptime: 0 }

  const status: 'operating' | 'warning' | 'fault' =
    last.isFault ||
    last.vibration   >= THRESHOLDS.vibration.critical ||
    last.temperature >= THRESHOLDS.temperature.critical
      ? 'fault'
      : last.vibration   >= THRESHOLDS.vibration.warning ||
        last.temperature >= THRESHOLDS.temperature.warning
        ? 'warning'
        : 'operating'

  return { machineId, vibration: last.vibration, temperature: last.temperature, status, uptime: last.uptime }
}

export function useMachineStatuses() {
  useCacheVersion()
  return COMPANY_CONFIG.machines.map(m => ({ machine: m, ...statusFromCache(m.id) }))
}

export function useHourlyProduction(machineId?: string) {
  const id = machineId ?? COMPANY_CONFIG.machines[0].id
  const [data, setData] = useState(() => getHourlyProduction(id))

  useEffect(() => {
    setData(getHourlyProduction(id))
    const interval = setInterval(() => setData(getHourlyProduction(id)), 30_000)
    return () => clearInterval(interval)
  }, [id])

  return data
}

export function useMachineHistory(machineId: string) {
  return useSensorHistory(machineId)
}
