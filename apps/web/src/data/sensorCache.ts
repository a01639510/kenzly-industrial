/**
 * sensorCache — single source of truth for sensor history.
 *
 * Starts with mock data (instant, no loading states anywhere).
 * Call refreshSensorCache() after login; it fetches all machines
 * from the API and silently replaces the mock readings.
 * Components that want reactive updates use useSensorHistory().
 */

import { useState, useEffect } from 'react'
import { ALL_HISTORIES, type SensorReading } from './mockSensors'
import { COMPANY_CONFIG } from '@/config/company'
import { apiFetch } from '@/lib/apiClient'

type ApiRow = {
  timestamp: string
  value: number
  metadata?: {
    vibration?:   { value: number }
    temperature?: { value: number }
    production?:  { value: number }
    energy?:      { value: number }
    uptime?:      { value: number }
    is_fault?:    { value: number }
  }
}

function transformRow(row: ApiRow): SensorReading {
  const m = row.metadata ?? {}
  return {
    date:        row.timestamp.split('T')[0],
    vibration:   m.vibration?.value   ?? 0,
    temperature: m.temperature?.value ?? 0,
    production:  m.production?.value  ?? row.value,
    energy:      m.energy?.value      ?? 0,
    uptime:      m.uptime?.value      ?? 0,
    isFault:     (m.is_fault?.value   ?? 0) === 1,
  }
}

// ── Mutable cache — starts with mock, replaced by API data ───────────────────
const cache: Record<string, SensorReading[]> = Object.fromEntries(
  COMPANY_CONFIG.machines.map(m => [m.id, ALL_HISTORIES[m.id]?.readings ?? []])
)

const subscribers = new Set<() => void>()

function notify() {
  subscribers.forEach(cb => cb())
}

/** Synchronous read — always returns something (mock at worst) */
export function getCachedHistory(machineId: string): SensorReading[] {
  return cache[machineId] ?? []
}

/** React hook — re-renders when API data arrives for this machine */
export function useSensorHistory(machineId: string): SensorReading[] {
  const [, tick] = useState(0)

  useEffect(() => {
    const unsub = () => tick(n => n + 1)
    subscribers.add(unsub)
    return () => { subscribers.delete(unsub) }
  }, [])

  return getCachedHistory(machineId)
}

/** Re-renders on ANY cache update — use in pages that access multiple machines */
export function useCacheVersion(): void {
  const [, tick] = useState(0)

  useEffect(() => {
    const unsub = () => tick(n => n + 1)
    subscribers.add(unsub)
    return () => { subscribers.delete(unsub) }
  }, [])
}

/** Call once after login. Fetches 30 days for all machines, replaces mock. */
export async function refreshSensorCache(hours = 720): Promise<void> {
  await Promise.all(
    COMPANY_CONFIG.machines.map(async m => {
      try {
        const rows = await apiFetch<ApiRow[]>(
          `/telemetry/history/${m.id}/sensors?hours=${hours}`
        )
        if (rows.length > 10) {
          cache[m.id] = rows.map(transformRow)
          notify()
        }
      } catch {
        // Keep mock data if API unavailable
      }
    })
  )
}
