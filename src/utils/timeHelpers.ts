import {
  DEFAULT_WORKOUT_CONFIG,
  PHASE_LABELS,
  PHASES,
} from '../constants/workoutConstants'
import type { TimerStep, WorkoutConfig } from '../types'

export function clampNumber(value: unknown, min: number, fallback: number): number {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(min, parsedValue)
}

type WorkoutConfigInput = Partial<WorkoutConfig> & {
  work?: unknown
  workout?: unknown
  rest?: unknown
  roundsPerSet?: unknown
  cooldown?: unknown
}

export function normalizeWorkoutConfig(config: WorkoutConfigInput = {}): WorkoutConfig {
  return {
    workTime: clampNumber(
      config.workTime ?? config.work ?? config.workout,
      1,
      DEFAULT_WORKOUT_CONFIG.workTime,
    ),
    restTime: clampNumber(
      config.restTime ?? config.rest,
      0,
      DEFAULT_WORKOUT_CONFIG.restTime,
    ),
    rounds: clampNumber(
      config.rounds ?? config.roundsPerSet,
      1,
      DEFAULT_WORKOUT_CONFIG.rounds,
    ),
    setRest: clampNumber(
      config.setRest ?? config.cooldown,
      0,
      DEFAULT_WORKOUT_CONFIG.setRest,
    ),
    totalSets: clampNumber(
      config.totalSets,
      1,
      DEFAULT_WORKOUT_CONFIG.totalSets,
    ),
  }
}

export function formatSecondsToClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function calculateWorkoutDuration(config: Partial<WorkoutConfig>): number {
  const { workTime, restTime, rounds, setRest, totalSets } = normalizeWorkoutConfig(config)

  return Math.max(
    0,
    ((workTime + restTime) * rounds - restTime + setRest) * totalSets - setRest,
  )
}

export function buildWorkoutSequence(config: Partial<WorkoutConfig>): TimerStep[] {
  const { workTime, restTime, rounds, setRest, totalSets } = normalizeWorkoutConfig(config)
  const sequence: TimerStep[] = []

  for (let currentSet = 1; currentSet <= totalSets; currentSet += 1) {
    for (let currentRound = 1; currentRound <= rounds; currentRound += 1) {
      const isFinalRound = currentRound === rounds
      const isFinalSet = currentSet === totalSets

      sequence.push({
        key: PHASES.WORK,
        label: PHASE_LABELS[PHASES.WORK],
        duration: workTime,
        currentSet,
        currentRound,
      })

      if (!isFinalRound && restTime > 0) {
        sequence.push({
          key: PHASES.REST,
          label: PHASE_LABELS[PHASES.REST],
          duration: restTime,
          currentSet,
          currentRound,
        })
      } else if (isFinalRound && !isFinalSet && setRest > 0) {
        sequence.push({
          key: PHASES.SET_REST,
          label: PHASE_LABELS[PHASES.SET_REST],
          duration: setRest,
          currentSet,
          currentRound,
        })
      }
    }
  }

  sequence.push({
    key: PHASES.FINISHED,
    label: PHASE_LABELS[PHASES.FINISHED],
    duration: 0,
    currentSet: totalSets,
    currentRound: rounds,
  })

  return sequence
}

export function getTotalRemainingTime(
  sequence: TimerStep[],
  phaseIndex: number,
  timeLeft: number,
): number {
  const futureDuration = sequence
    .slice(phaseIndex + 1)
    .reduce((sum, step) => sum + step.duration, 0)

  return Math.max(0, Math.floor(timeLeft) + futureDuration)
}
