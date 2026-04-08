export type AppView = "settings" | "timer" | "stats";

export type TimerPhase = "Warmup" | "Exercise" | "Rest" | "Set Rest" | "Cooldown" | "Finished";
export type TimerPhaseKey = "warmup" | "exercise" | "rest" | "set-rest" | "cooldown" | "finished";

export interface WorkoutConfig {
  warmupTime: number;
  exerciseTime: number;
  restTime: number;
  rounds: number;
  setRest: number;
  totalSets: number;
  cooldownTime: number;
}

export interface TimerState {
  currentPhase: TimerPhase;
  timeLeft: number;
  currentRound: number;
  currentSet: number;
  totalTimeRemaining: number;
  isRunning: boolean;
}

export interface TimerStep {
  key: TimerPhaseKey;
  label: TimerPhase;
  duration: number;
  currentRound: number;
  currentSet: number;
}

export interface Routine extends WorkoutConfig {
  id: string;
  user_id: string;
  name: string;
  created_at?: string | null;
}

export type WorkoutCategory =
  | "HIIT"
  | "Weights"
  | "Bodyweight"
  | "Running"
  | "Walking"
  | "Cycling"
  | "Swimming"
  | "Rowing"
  | "Yoga"
  | "Pilates"
  | "Boxing"
  | "Hiking"
  | "Sports"
  | "Other";

export interface WorkoutLog {
  id: string;
  user_id: string;
  routine_name?: string | null;
  category?: WorkoutCategory | string | null;
  exercise_duration_seconds: number;
  total_duration_seconds: number;
  rounds_completed?: number | null;
  sets_completed?: number | null;
  is_manual?: boolean | null;
  created_at?: string | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  logged_date: string;
  created_at?: string | null;
}

export interface Database {
  public: {
    Tables: {
      routines: {
        Row: Routine;
        Insert: Omit<Routine, "id" | "created_at"> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Routine>;
        Relationships: [];
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Omit<WorkoutLog, "id"> & {
          id?: string;
        };
        Update: Partial<WorkoutLog>;
        Relationships: [];
      };
      weight_logs: {
        Row: WeightLog;
        Insert: Omit<WeightLog, "id"> & {
          id?: string;
        };
        Update: Partial<WeightLog>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface TimerHookResult extends TimerState {
  phaseKey: TimerPhaseKey;
  phaseDuration: number;
  phaseIndex: number;
  sequence: TimerStep[];
  isMuted: boolean;
  toggleMute: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}
