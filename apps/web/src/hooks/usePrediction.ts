import { useMemo } from 'react'
import { useSensorHistory } from '@/data/sensorCache'
import { predictFailure, type PredictionResult } from '@/services/mlEngine'

export function usePrediction(machineId: string): PredictionResult {
  const readings = useSensorHistory(machineId)
  return useMemo(() => predictFailure(readings), [readings])
}
