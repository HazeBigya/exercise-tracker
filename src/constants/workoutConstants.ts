import type { TimerPhase, TimerPhaseKey, WorkoutConfig } from '../types'

export const APP_VIEWS = {
  SETTINGS: 'settings',
  TIMER: 'timer',
  STATS: 'stats',
} as const

export const PHASES = {
  WARMUP: 'warmup',
  EXERCISE: 'exercise',
  REST: 'rest',
  SET_REST: 'set-rest',
  COOLDOWN: 'cooldown',
  FINISHED: 'finished',
} as const satisfies Record<
  'WARMUP' | 'EXERCISE' | 'REST' | 'SET_REST' | 'COOLDOWN' | 'FINISHED',
  TimerPhaseKey
>

export const PHASE_LABELS: Record<TimerPhaseKey, TimerPhase> = {
  [PHASES.WARMUP]: 'Warmup',
  [PHASES.EXERCISE]: 'Exercise',
  [PHASES.REST]: 'Rest',
  [PHASES.SET_REST]: 'Set Rest',
  [PHASES.COOLDOWN]: 'Cooldown',
  [PHASES.FINISHED]: 'Finished',
}

export const DEFAULT_WORKOUT_CONFIG: WorkoutConfig = {
  warmupTime: 10,
  exerciseTime: 40,
  restTime: 20,
  rounds: 8,
  setRest: 90,
  totalSets: 3,
  cooldownTime: 10,
}

export const PHASE_THEMES = {
  [PHASES.WARMUP]: {
    color: '#ffd60a',
    glow: 'rgba(255, 214, 10, 0.42)',
    accent: 'rgba(255, 214, 10, 0.12)',
    chip: 'Prepare',
  },
  [PHASES.EXERCISE]: {
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
  [PHASES.COOLDOWN]: {
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.42)',
    accent: 'rgba(167, 139, 250, 0.12)',
    chip: 'Ease Off',
  },
  [PHASES.FINISHED]: {
    color: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.42)',
    accent: 'rgba(196, 181, 253, 0.12)',
    chip: 'Complete',
  },
} as const
