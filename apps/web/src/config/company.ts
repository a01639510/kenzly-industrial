// [CONFIG] Edit this file for each client deployment

export const COMPANY_CONFIG = {
  name:        'PlásticosMex Industrial S.A. de C.V.',
  shortName:   'PMX',
  logo:        '/logo.svg',
  primaryColor:'#0f62fe',   // azul IBM industrial
  accentColor: '#4d94ff',   // azul claro
  industry:    'inyección de plástico',
  currency:    'MXN',
  timezone:    'America/Monterrey',

  kpis: {
    oeeTarget:    82,   // %
    uptimeTarget: 93,   // %
    mtbfTarget:   600,  // horas
    pphTarget:    480,  // piezas/hora
  },

  machines: [
    { id: 'M01', name: 'Inyectora Haitian MA900/II', area: 'Línea de Inyección 1', icon: '⚙️' },
    { id: 'M02', name: 'Secador Drymax HopperLoader 200', area: 'Preparación de Material', icon: '🌡️' },
    { id: 'M03', name: 'CMM Mitutoyo CRYSTA-Apex',   area: 'Control de Calidad', icon: '📏' },
    { id: 'M04', name: 'ViSmart 3D Visión Artificial', area: 'Control de Calidad', icon: '👁️' },
    { id: 'M05', name: 'Chiller Frigel Microgel 7.5T', area: 'Línea de Inyección 1', icon: '❄️' },
    { id: 'M06', name: 'Tolva Gravimétrica 500L',    area: 'Preparación de Material', icon: '🏭' },
  ],

  shifts: [
    { id: 'T1', name: 'Turno Matutino',   start: '06:00', end: '14:00' },
    { id: 'T2', name: 'Turno Vespertino', start: '14:00', end: '22:00' },
    { id: 'T3', name: 'Turno Nocturno',   start: '22:00', end: '06:00' },
  ],

  modules: {
    dashboard:     true,
    maintenance:   true,
    reports:       true,
    alerts:        true,
    energyMonitor: true,
  },

  // [CONFIG] API base URL — set via VITE_API_URL env var
  apiUrl: (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3001',
} as const

export type Machine = typeof COMPANY_CONFIG.machines[number]
