import {
  DEFAULT_WORKOUT_SETTINGS,
  PHASE_LABELS,
  PHASES,
} from '../constants/workoutConstants'

export function clampNumber(value, min = 0, fallback = min) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(min, parsedValue)
}

export function normalizeWorkoutSettings(settings = {}) {
  return {
    workTime: clampNumber(
      settings.workTime ?? settings.work ?? settings.workout,
      1,
      DEFAULT_WORKOUT_SETTINGS.workTime,
    ),
    restTime: clampNumber(
      settings.restTime ?? settings.rest,
      0,
      DEFAULT_WORKOUT_SETTINGS.restTime,
    ),
    roundsPerSet: clampNumber(
      settings.roundsPerSet ?? settings.rounds,
      1,
      DEFAULT_WORKOUT_SETTINGS.roundsPerSet,
    ),
    setRest: clampNumber(
      settings.setRest ?? settings.cooldown,
      0,
      DEFAULT_WORKOUT_SETTINGS.setRest,
    ),
    totalSets: clampNumber(
      settings.totalSets,
      1,
      DEFAULT_WORKOUT_SETTINGS.totalSets,
    ),
  }
}

export function formatSecondsToClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function calculateWorkoutDuration(settings = {}) {
  const { workTime, restTime, roundsPerSet, setRest, totalSets } =
    normalizeWorkoutSettings(settings)

  return Math.max(
    0,
    ((workTime + restTime) * roundsPerSet - restTime + setRest) * totalSets - setRest,
  )
}

export function buildWorkoutSequence(settings = {}) {
  const { workTime, restTime, roundsPerSet, setRest, totalSets } =
    normalizeWorkoutSettings(settings)

  const steps = []

  for (let set = 1; set <= totalSets; set += 1) {
    for (let round = 1; round <= roundsPerSet; round += 1) {
      const isFinalRound = round === roundsPerSet
      const isFinalSet = set === totalSets

      steps.push({
        key: PHASES.WORK,
        label: PHASE_LABELS[PHASES.WORK],
        duration: workTime,
        set,
        round,
      })

      if (!isFinalRound && restTime > 0) {
        steps.push({
          key: PHASES.REST,
          label: PHASE_LABELS[PHASES.REST],
          duration: restTime,
          set,
          round,
        })
      } else if (isFinalRound && !isFinalSet && setRest > 0) {
        steps.push({
          key: PHASES.SET_REST,
          label: PHASE_LABELS[PHASES.SET_REST],
          duration: setRest,
          set,
          round,
        })
      }
    }
  }

  steps.push({
    key: PHASES.FINISHED,
    label: PHASE_LABELS[PHASES.FINISHED],
    duration: 0,
    set: totalSets,
    round: roundsPerSet,
  })

  return steps
}

export function getTotalRemainingTime(sequence, phaseIndex, timeLeft) {
  const futureDuration = sequence
    .slice(phaseIndex + 1)
    .reduce((sum, step) => sum + step.duration, 0)

  return Math.max(0, Math.floor(timeLeft) + futureDuration)
}
