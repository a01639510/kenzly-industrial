// [CONFIG] Edit this file for each client deployment

export const COMPANY_CONFIG = {
  name:        'Grupo Acero Norte',
  shortName:   'GAN',
  logo:        '/logo.svg',
  primaryColor:'#1A6DFF',   // azul eléctrico
  accentColor: '#8FAAC8',   // plata / silver-blue
  industry:    'manufactura',
  currency:    'MXN',
  timezone:    'America/Monterrey',

  kpis: {
    oeeTarget:    85,   // %
    uptimeTarget: 95,   // %
    mtbfTarget:   720,  // horas
    pphTarget:    450,  // piezas/hora
  },

  machines: [
    { id: 'M01', name: 'Prensa Hidráulica 1', area: 'Línea A', icon: '⚙️' },
    { id: 'M02', name: 'CNC Mazak 450',        area: 'Línea B', icon: '🔩' },
    { id: 'M03', name: 'Soldadora Robótica',   area: 'Ensamble', icon: '🤖' },
    { id: 'M04', name: 'Torno CNC T200',       area: 'Línea A', icon: '🔧' },
    { id: 'M05', name: 'Cortadora Láser',      area: 'Línea C', icon: '✂️' },
    { id: 'M06', name: 'Centro de Maquinado',  area: 'Línea B', icon: '🏭' },
  ],

  shifts: [
    { id: 'T1', name: 'Turno 1', start: '06:00', end: '14:00' },
    { id: 'T2', name: 'Turno 2', start: '14:00', end: '22:00' },
    { id: 'T3', name: 'Turno 3', start: '22:00', end: '06:00' },
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
