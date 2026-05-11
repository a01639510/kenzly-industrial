import { create } from 'zustand'

interface KioskState {
  active: boolean
  enter:  () => void
  exit:   () => void
}

export const useKioskStore = create<KioskState>(set => ({
  active: false,
  enter: () => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    set({ active: true })
  },
  exit: () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    set({ active: false })
  },
}))
