import { useState, useEffect, useRef } from 'react'
import { ALL_HISTORIES, getMachineStatus, getOEEStats, getHourlyProduction, generateRealtimeVariation } from '@/data/mockSensors'
import { COMPANY_CONFIG } from '@/config/company'

export function useLiveKPIs() {
  const [kpis, setKpis] = useState(() => computeKPIs())

  function computeKPIs() {
    const oeeAll = COMPANY_CONFIG.machines.map(m => getOEEStats(m.id).oee)
    const oee    = Math.round(oeeAll.reduce((a, b) => a + b, 0) / oeeAll.length)

    const uptimeAll = COMPANY_CONFIG.machines.map(m => {
      const last = ALL_HISTORIES[m.id].readings.slice(-1)[0]
      return last?.uptime ?? 0
    })
    const uptime = Math.round(uptimeAll.reduce((a, b) => a + b, 0) / uptimeAll.length)

    const production = COMPANY_CONFIG.machines.reduce((sum, m) => {
      const last = ALL_HISTORIES[m.id].readings.slice(-1)[0]
      return sum + (last?.production ?? 0)
    }, 0)

    return {
      oee:        generateRealtimeVariation(oee,    2),
      uptime:     generateRealtimeVariation(uptime, 1),
      production: Math.round(generateRealtimeVariation(production, production * 0.02)),
      alerts:     3,
      energy:     Math.round(generateRealtimeVariation(285, 15)),  // kWh
      temperature:Math.round(generateRealtimeVariation(22, 1.5)), // ambient °C
    }
  }

  useEffect(() => {
    const id = setInterval(() => setKpis(computeKPIs()), 5000)
    return () => clearInterval(id)
  }, [])

  return kpis
}

export function useMachineStatuses() {
  const [statuses, setStatuses] = useState(() =>
    COMPANY_CONFIG.machines.map(m => ({ machine: m, ...getMachineStatus(m.id) }))
  )

  useEffect(() => {
    const id = setInterval(() => {
      setStatuses(COMPANY_CONFIG.machines.map(m => ({ machine: m, ...getMachineStatus(m.id) })))
    }, 6000)
    return () => clearInterval(id)
  }, [])

  return statuses
}

export function useHourlyProduction(machineId?: string) {
  const id = machineId ?? COMPANY_CONFIG.machines[0].id
  const [data, setData] = useState(() => getHourlyProduction(id))

  useEffect(() => {
    setData(getHourlyProduction(id))
    const interval = setInterval(() => setData(getHourlyProduction(id)), 30000)
    return () => clearInterval(interval)
  }, [id])

  return data
}

export function useMachineHistory(machineId: string) {
  return ALL_HISTORIES[machineId]?.readings ?? []
}
