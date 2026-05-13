import { create } from 'zustand'
import { COMPANY_CONFIG } from '@/config/company'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface Alert {
  id:           string
  severity:     Severity
  machineId:    string
  machineName:  string
  description:  string
  timestamp:    Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

interface AlertStore {
  alerts:       Alert[]
  acknowledge:  (id: string, user?: string) => void
  addAlert:     (alert: Omit<Alert, 'id' | 'acknowledged'>) => void
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'a1', severity: 'critical', machineId: 'M01', machineName: 'Inyectora Haitian MA900/II',
    description: 'Presión de inyección inestable (variación ±35 bar). Riesgo de short shot inminente.',
    timestamp: new Date(Date.now() - 1000 * 60 * 8), acknowledged: false,
  },
  {
    id: 'a2', severity: 'high', machineId: 'M05', machineName: 'Chiller Frigel Microgel 7.5T',
    description: 'Temperatura de agua de molde elevada (18.4°C, límite 16°C). Verificar condensador.',
    timestamp: new Date(Date.now() - 1000 * 60 * 23), acknowledged: false,
  },
  {
    id: 'a3', severity: 'medium', machineId: 'M02', machineName: 'Secador Drymax HopperLoader 200',
    description: 'Humedad residual en pellet PP fuera de spec (>0.03%). Extender tiempo de secado.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), acknowledged: false,
  },
  {
    id: 'a4', severity: 'low', machineId: 'M06', machineName: 'Tolva Gravimétrica 500L',
    description: 'Nivel de tolva bajo (22%). Reabastecer antes del siguiente turno.',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), acknowledged: false,
  },
  {
    id: 'a5', severity: 'high', machineId: 'M01', machineName: 'Inyectora Haitian MA900/II',
    description: 'OEE por debajo de objetivo (63%). Tasa de rechazo elevada — revisar proceso.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), acknowledged: true,
    acknowledgedBy: 'Ing. García', acknowledgedAt: new Date(Date.now() - 1000 * 60 * 100),
  },
  {
    id: 'a6', severity: 'medium', machineId: 'M03', machineName: 'CMM Mitutoyo CRYSTA-Apex',
    description: 'Calibración de palpadores vencida. Programar mantenimiento metrológico.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180), acknowledged: true,
    acknowledgedBy: 'Ing. López', acknowledgedAt: new Date(Date.now() - 1000 * 60 * 150),
  },
]

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: INITIAL_ALERTS,

  acknowledge: (id, user = 'Operador') =>
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === id
          ? { ...a, acknowledged: true, acknowledgedBy: user, acknowledgedAt: new Date() }
          : a
      ),
    })),

  addAlert: (alert) =>
    set(state => ({
      alerts: [
        { ...alert, id: `a${Date.now()}`, acknowledged: false },
        ...state.alerts,
      ],
    })),
}))
