// [CONFIG] Alert thresholds per sensor type

export const THRESHOLDS = {
  vibration: {
    warning:  4.5,   // mm/s
    critical: 7.0,
  },
  temperature: {
    warning:  75,    // °C
    critical: 90,
  },
  oee: {
    warning:  70,    // %
    critical: 55,
  },
  uptime: {
    warning:  90,    // %
    critical: 80,
  },
  energy: {
    warning:  85,    // % of rated capacity
    critical: 95,
  },
} as const
