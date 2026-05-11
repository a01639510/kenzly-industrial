export interface Operator {
  id:         string
  name:       string
  initials:   string
  skillLevel: 'Junior' | 'Mid' | 'Senior' | 'Expert'
  shift:      'T1' | 'T2' | 'T3'
  stations:   string[]   // machine IDs the operator is certified for
}

export const WORKFORCE_CONFIG: Operator[] = [
  { id: 'OP-01', name: 'Mateo Chávez',    initials: 'MC', skillLevel: 'Senior', shift: 'T1', stations: ['M01', 'M04'] },
  { id: 'OP-02', name: 'Jorge Aguilar',   initials: 'JA', skillLevel: 'Expert', shift: 'T1', stations: ['M02', 'M06'] },
  { id: 'OP-03', name: 'Luis Ramírez',    initials: 'LR', skillLevel: 'Mid',    shift: 'T1', stations: ['M03'] },
  { id: 'OP-04', name: 'Ana Torres',      initials: 'AT', skillLevel: 'Senior', shift: 'T2', stations: ['M01', 'M03', 'M04'] },
  { id: 'OP-05', name: 'Carlos Mendoza',  initials: 'CM', skillLevel: 'Junior', shift: 'T2', stations: ['M05'] },
  { id: 'OP-06', name: 'Diana Flores',    initials: 'DF', skillLevel: 'Expert', shift: 'T2', stations: ['M02', 'M05', 'M06'] },
  { id: 'OP-07', name: 'Pedro Gutiérrez', initials: 'PG', skillLevel: 'Mid',    shift: 'T3', stations: ['M04', 'M06'] },
  { id: 'OP-08', name: 'Sofia Herrera',   initials: 'SH', skillLevel: 'Senior', shift: 'T3', stations: ['M01', 'M02', 'M03'] },
]

// Seeded mock stats per operator (deterministic)
function opSeed(id: string) {
  const n = parseInt(id.split('-')[1] ?? '1')
  return {
    unitsPerHour:   Math.round(380 + (n * 17 % 120)),
    rejectionRate:  Math.round((n * 0.7 % 5) * 10) / 10,
    safetyScore:    Math.min(100, 88 + (n * 3 % 12)),
    efficiency:     Math.round(78 + (n * 11 % 20)),
  }
}

export const OPERATOR_STATS = Object.fromEntries(
  WORKFORCE_CONFIG.map(op => [op.id, opSeed(op.id)])
)
