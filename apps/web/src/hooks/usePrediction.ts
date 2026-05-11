import { useMemo } from 'react'
import { ALL_HISTORIES } from '@/data/mockSensors'
import { predictFailure, calculateMTBF, type PredictionResult } from '@/services/mlEngine'

export function usePrediction(machineId: string): PredictionResult {
  return useMemo(() => {
    const readings = ALL_HISTORIES[machineId]?.readings ?? []
    return predictFailure(readings)
  }, [machineId])
}
