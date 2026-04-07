export type AppView = 'settings' | 'timer'

export type TimerPhase = 'Work' | 'Rest' | 'Set Rest' | 'Finished'
export type TimerPhaseKey = 'work' | 'rest' | 'set-rest' | 'finished'

export interface WorkoutConfig {
  workTime: number
  restTime: number
  rounds: number
  setRest: number
  totalSets: number
}

export interface TimerState {
  currentPhase: TimerPhase
  timeLeft: number
  currentRound: number
  currentSet: number
  totalTimeRemaining: number
  isRunning: boolean
}

export interface TimerStep {
  key: TimerPhaseKey
  label: TimerPhase
  duration: number
  currentRound: number
  currentSet: number
}

export interface Routine extends WorkoutConfig {
  id: string
  user_id: string
  name: string
  created_at?: string | null
}

export interface Database {
  public: {
    Tables: {
      routines: {
        Row: Routine
        Insert: Omit<Routine, 'id'> & { id?: string }
        Update: Partial<Routine>
        Relationships: []
      }
    }
  }
}

export interface TimerHookResult extends TimerState {
  phaseKey: TimerPhaseKey
  phaseDuration: number
  isMuted: boolean
  toggleMute: () => void
  play: () => void
  pause: () => void
  reset: () => void
}
