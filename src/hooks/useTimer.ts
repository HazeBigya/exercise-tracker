import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_LABELS, PHASES } from '../constants/workoutConstants'
import useAudioCues from './useAudioCues'
import type { TimerHookResult, TimerStep, WorkoutConfig } from '../types'
import { getTotalRemainingTime, normalizeWorkoutConfig } from '../utils/timeHelpers'

const TICK_INTERVAL_MS = 250

const FALLBACK_STEP: TimerStep = {
  key: PHASES.FINISHED,
  label: PHASE_LABELS[PHASES.FINISHED],
  duration: 0,
  currentSet: 1,
  currentRound: 1,
}

function buildSequence(config: WorkoutConfig): TimerStep[] {
  const sequence: TimerStep[] = []

  if (config.warmupTime > 0) {
    sequence.push({
      key: PHASES.WARMUP,
      label: PHASE_LABELS[PHASES.WARMUP],
      duration: config.warmupTime,
      currentSet: 1,
      currentRound: 1,
    })
  }

  for (let currentSet = 1; currentSet <= config.totalSets; currentSet += 1) {
    for (let currentRound = 1; currentRound <= config.rounds; currentRound += 1) {
      const isFinalRound = currentRound === config.rounds
      const isFinalSet = currentSet === config.totalSets

      sequence.push({
        key: PHASES.EXERCISE,
        label: PHASE_LABELS[PHASES.EXERCISE],
        duration: config.exerciseTime,
        currentSet,
        currentRound,
      })

      if (!isFinalRound && config.restTime > 0) {
        sequence.push({
          key: PHASES.REST,
          label: PHASE_LABELS[PHASES.REST],
          duration: config.restTime,
          currentSet,
          currentRound,
        })
      }

      if (isFinalRound && !isFinalSet && config.setRest > 0) {
        sequence.push({
          key: PHASES.SET_REST,
          label: PHASE_LABELS[PHASES.SET_REST],
          duration: config.setRest,
          currentSet,
          currentRound,
        })
      }
    }
  }

  if (config.cooldownTime > 0) {
    sequence.push({
      key: PHASES.COOLDOWN,
      label: PHASE_LABELS[PHASES.COOLDOWN],
      duration: config.cooldownTime,
      currentSet: config.totalSets,
      currentRound: config.rounds,
    })
  }

  sequence.push({
    key: PHASES.FINISHED,
    label: PHASE_LABELS[PHASES.FINISHED],
    duration: 0,
    currentSet: config.totalSets,
    currentRound: config.rounds,
  })

  return sequence
}

function getElapsedForPhaseIndex(sequence: TimerStep[], targetIndex: number): number {
  return sequence
    .slice(0, targetIndex)
    .reduce((sum, step) => sum + step.duration * 1000, 0)
}

function getExerciseDurationFromElapsed(sequence: TimerStep[], elapsedMs: number): number {
  let remainingMs = Math.max(0, elapsedMs)
  let exerciseMs = 0

  for (const step of sequence) {
    if (step.key === PHASES.FINISHED || remainingMs <= 0) {
      break
    }

    const stepDurationMs = step.duration * 1000
    const consumedMs = Math.min(remainingMs, stepDurationMs)

    if (step.key === PHASES.EXERCISE) {
      exerciseMs += consumedMs
    }

    remainingMs -= consumedMs
  }

  return Math.max(0, Math.floor(exerciseMs / 1000))
}

function getStepStateFromElapsed(sequence: TimerStep[], elapsedMs: number) {
  const safeElapsed = Math.max(0, elapsedMs)
  let accumulatedMs = 0

  for (let index = 0; index < sequence.length; index += 1) {
    const step = sequence[index] ?? FALLBACK_STEP

    if (step.key === PHASES.FINISHED) {
      return { phaseIndex: index, timeLeft: 0 }
    }

    const stepDurationMs = step.duration * 1000

    if (safeElapsed < accumulatedMs + stepDurationMs) {
      const remainingMs = accumulatedMs + stepDurationMs - safeElapsed

      return {
        phaseIndex: index,
        timeLeft: Math.max(0, Math.ceil(remainingMs / 1000)),
      }
    }

    accumulatedMs += stepDurationMs
  }

  return {
    phaseIndex: Math.max(sequence.length - 1, 0),
    timeLeft: 0,
  }
}

function useTimer(config: WorkoutConfig, userId?: string, routineName?: string): TimerHookResult {
  const normalizedConfig = useMemo(() => normalizeWorkoutConfig(config), [config])
  const sequence = useMemo(() => buildSequence(normalizedConfig), [normalizedConfig])
  const initialStep = sequence[0] ?? FALLBACK_STEP
  const workoutDurationMs = useMemo(
    () => sequence.reduce((sum, step) => sum + step.duration * 1000, 0),
    [sequence],
  )

  const [phaseIndex, setPhaseIndex] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(initialStep.duration)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  const { isMuted, toggleMute, playDingDing, playBeeper } = useAudioCues()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const elapsedMsRef = useRef<number>(0)
  const configSignatureRef = useRef<string>(JSON.stringify(normalizedConfig))
  const countdownCueRef = useRef<string>('')
  const finishedCuePlayedRef = useRef<boolean>(false)
  const hasSavedWorkoutLogRef = useRef<boolean>(false)
  const sequenceRef = useRef<TimerStep[]>(sequence)
  const phaseIndexRef = useRef<number>(0)

  useEffect(() => {
    sequenceRef.current = sequence
  }, [sequence])

  useEffect(() => {
    phaseIndexRef.current = phaseIndex
  }, [phaseIndex])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const saveWorkoutLog = useCallback(
    async (exerciseDurationSeconds: number, totalDurationSeconds: number) => {
      if (!userId || !supabase) {
        return
      }

      const payload = {
        user_id: userId,
        routine_name: routineName?.trim() || 'Custom Exercise Session',
        category: 'HIIT',
        exercise_duration_seconds: exerciseDurationSeconds,
        total_duration_seconds: totalDurationSeconds,
        rounds_completed: normalizedConfig.rounds,
        sets_completed: normalizedConfig.totalSets,
        is_manual: false,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('workout_logs').insert(payload as never)

      if (error) {
        console.error('Unable to save workout log:', error.message)
      }
    },
    [normalizedConfig.rounds, normalizedConfig.totalSets, routineName, userId],
  )

  const syncFromElapsed = useCallback(
    (nextElapsedMs: number) => {
      const boundedElapsedMs = Math.max(0, Math.min(nextElapsedMs, workoutDurationMs))
      const { phaseIndex: nextPhaseIndex, timeLeft: nextTimeLeft } = getStepStateFromElapsed(
        sequenceRef.current,
        boundedElapsedMs,
      )
      const nextStep = sequenceRef.current[nextPhaseIndex] ?? FALLBACK_STEP

      elapsedMsRef.current = boundedElapsedMs
      phaseIndexRef.current = nextPhaseIndex
      setPhaseIndex(nextPhaseIndex)
      setTimeLeft(nextTimeLeft)

      if (nextStep.key === PHASES.FINISHED) {
        clearTimer()
        startedAtRef.current = null
        setIsRunning(false)

        if (!hasSavedWorkoutLogRef.current && boundedElapsedMs > 0) {
          hasSavedWorkoutLogRef.current = true
          void saveWorkoutLog(
            getExerciseDurationFromElapsed(sequenceRef.current, boundedElapsedMs),
            Math.max(0, Math.floor(boundedElapsedMs / 1000)),
          )
        }

        if (!finishedCuePlayedRef.current && workoutDurationMs > 0) {
          finishedCuePlayedRef.current = true
          playDingDing()
        }

        return
      }

      finishedCuePlayedRef.current = false
    },
    [clearTimer, playDingDing, saveWorkoutLog, workoutDurationMs],
  )

  const reset = useCallback(() => {
    clearTimer()

    const firstStep = sequenceRef.current[0] ?? FALLBACK_STEP

    startedAtRef.current = null
    elapsedMsRef.current = 0
    countdownCueRef.current = ''
    finishedCuePlayedRef.current = false
    hasSavedWorkoutLogRef.current = false
    phaseIndexRef.current = 0
    setPhaseIndex(0)
    setTimeLeft(firstStep.duration)
    setIsRunning(false)
  }, [clearTimer])

  useEffect(() => {
    const nextSignature = JSON.stringify(normalizedConfig)

    if (configSignatureRef.current === nextSignature) {
      return undefined
    }

    configSignatureRef.current = nextSignature

    const frameId = window.requestAnimationFrame(() => {
      reset()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [normalizedConfig, reset])

  const currentStep = sequence[phaseIndex] ?? sequence.at(-1) ?? FALLBACK_STEP

  const play = useCallback(() => {
    const activeStep = sequenceRef.current[phaseIndexRef.current] ?? FALLBACK_STEP

    if (activeStep.key === PHASES.FINISHED) {
      elapsedMsRef.current = 0
      finishedCuePlayedRef.current = false
      hasSavedWorkoutLogRef.current = false
      phaseIndexRef.current = 0
      setPhaseIndex(0)
      setTimeLeft((sequenceRef.current[0] ?? FALLBACK_STEP).duration)
    }

    startedAtRef.current = Date.now() - elapsedMsRef.current
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    clearTimer()

    if (startedAtRef.current !== null) {
      syncFromElapsed(Date.now() - startedAtRef.current)
    }

    startedAtRef.current = null
    setIsRunning(false)
  }, [clearTimer, syncFromElapsed])

  const skip = useCallback(() => {
    const activeStep = sequenceRef.current[phaseIndexRef.current] ?? FALLBACK_STEP

    if (activeStep.key === PHASES.FINISHED) {
      reset()
      return
    }

    const nextIndex = Math.min(phaseIndexRef.current + 1, sequenceRef.current.length - 1)
    const nextElapsedMs = getElapsedForPhaseIndex(sequenceRef.current, nextIndex)

    syncFromElapsed(nextElapsedMs)

    if ((sequenceRef.current[nextIndex] ?? FALLBACK_STEP).key !== PHASES.FINISHED && isRunning) {
      startedAtRef.current = Date.now() - nextElapsedMs
      setIsRunning(true)
    }
  }, [isRunning, reset, syncFromElapsed])

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      countdownCueRef.current = ''
      return undefined
    }

    if (timeLeft === 3) {
      const cueKey = `${phaseIndex}-${timeLeft}`

      if (countdownCueRef.current !== cueKey) {
        countdownCueRef.current = cueKey
        playBeeper()
      }
    } else if (timeLeft > 3 || timeLeft <= 0) {
      countdownCueRef.current = ''
    }

    return undefined
  }, [currentStep.key, isRunning, phaseIndex, playBeeper, timeLeft])

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      return undefined
    }

    intervalRef.current = setInterval(() => {
      if (startedAtRef.current === null) {
        return
      }

      syncFromElapsed(Date.now() - startedAtRef.current)
    }, TICK_INTERVAL_MS)

    return () => {
      clearTimer()
    }
  }, [clearTimer, currentStep.key, isRunning, syncFromElapsed])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      if (startedAtRef.current !== null) {
        syncFromElapsed(Date.now() - startedAtRef.current)
        return
      }

      syncFromElapsed(elapsedMsRef.current)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncFromElapsed])

  const totalTimeRemaining = useMemo(
    () => getTotalRemainingTime(sequence, phaseIndex, timeLeft),
    [phaseIndex, sequence, timeLeft],
  )

  return {
    currentPhase: currentStep.label,
    phaseKey: currentStep.key,
    timeLeft,
    currentRound: currentStep.currentRound,
    currentSet: currentStep.currentSet,
    totalTimeRemaining,
    phaseDuration: currentStep.duration,
    phaseIndex,
    sequence,
    isRunning,
    isMuted,
    toggleMute,
    play,
    pause,
    reset,
    skip,
  }
}

export default useTimer
