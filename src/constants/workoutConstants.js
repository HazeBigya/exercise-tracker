export const APP_VIEWS = Object.freeze({
  SETTINGS: 'settings',
  TIMER: 'timer',
})

export const PHASES = Object.freeze({
  WORK: 'work',
  REST: 'rest',
  SET_REST: 'set-rest',
  FINISHED: 'finished',
})

export const PHASE_LABELS = Object.freeze({
  [PHASES.WORK]: 'Work',
  [PHASES.REST]: 'Rest',
  [PHASES.SET_REST]: 'Set Rest',
  [PHASES.FINISHED]: 'Finished',
})

export const PHASE_THEMES = Object.freeze({
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
})

export const DEFAULT_WORKOUT_SETTINGS = Object.freeze({
  workTime: 40,
  restTime: 20,
  roundsPerSet: 8,
  setRest: 90,
  totalSets: 3,
})
