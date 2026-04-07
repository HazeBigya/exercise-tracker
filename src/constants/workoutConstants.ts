import type { TimerPhase, TimerPhaseKey, WorkoutConfig } from '../types'

export const APP_VIEWS = {
  SETTINGS: 'settings',
  TIMER: 'timer',
} as const

export const PHASES: Record<'WORK' | 'REST' | 'SET_REST' | 'FINISHED', TimerPhaseKey> = {
  WORK: 'work',
  REST: 'rest',
  SET_REST: 'set-rest',
  FINISHED: 'finished',
}

export const PHASE_LABELS: Record<TimerPhaseKey, TimerPhase> = {
  [PHASES.WORK]: 'Work',
  [PHASES.REST]: 'Rest',
  [PHASES.SET_REST]: 'Set Rest',
  [PHASES.FINISHED]: 'Finished',
}

export const DEFAULT_WORKOUT_CONFIG: WorkoutConfig = {
  workTime: 40,
  restTime: 20,
  rounds: 8,
  setRest: 90,
  totalSets: 3,
}

export const PHASE_THEMES = {
  [PHASES.WORK]: {
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.45)',
    accent: 'rgba(251, 146, 60, 0.12)',
    chip: 'Push',
  },
  [PHASES.REST]: {
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.42)',
    accent: 'rgba(52, 211, 153, 0.12)',
    chip: 'Recover',
  },
  [PHASES.SET_REST]: {
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.42)',
    accent: 'rgba(96, 165, 250, 0.12)',
    chip: 'Reset',
  },
  [PHASES.FINISHED]: {
    color: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.42)',
    accent: 'rgba(196, 181, 253, 0.12)',
    chip: 'Complete',
  },
} as const
