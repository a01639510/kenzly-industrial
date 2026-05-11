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
    id: 'a1', severity: 'critical', machineId: 'M03', machineName: 'Soldadora Robótica',
    description: 'Vibración excede umbral crítico (8.2 mm/s). Riesgo de falla inminente.',
    timestamp: new Date(Date.now() - 1000 * 60 * 8), acknowledged: false,
  },
  {
    id: 'a2', severity: 'high', machineId: 'M01', machineName: 'Prensa Hidráulica 1',
    description: 'Temperatura de aceite elevada (82°C). Verificar sistema de enfriamiento.',
    timestamp: new Date(Date.now() - 1000 * 60 * 23), acknowledged: false,
  },
  {
    id: 'a3', severity: 'medium', machineId: 'M02', machineName: 'CNC Mazak 450',
    description: 'Producción por hora 15% debajo del objetivo. Revisar programa CNC.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), acknowledged: false,
  },
  {
    id: 'a4', severity: 'low', machineId: 'M05', machineName: 'Cortadora Láser',
    description: 'Mantenimiento preventivo programado para mañana. Preparar refacciones.',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), acknowledged: false,
  },
  {
    id: 'a5', severity: 'high', machineId: 'M04', machineName: 'Torno CNC T200',
    description: 'OEE por debajo de objetivo (61%). Evaluar causa raíz.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), acknowledged: true,
    acknowledgedBy: 'Ing. García', acknowledgedAt: new Date(Date.now() - 1000 * 60 * 100),
  },
  {
    id: 'a6', severity: 'medium', machineId: 'M06', machineName: 'Centro de Maquinado',
    description: 'Consumo energético 12% superior al promedio. Revisar parámetros.',
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
