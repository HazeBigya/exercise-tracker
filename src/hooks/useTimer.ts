import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PHASES } from '../constants/workoutConstants'
import useAudioCues from './useAudioCues'
import type { TimerHookResult, TimerStep, WorkoutConfig } from '../types'
import {
  buildWorkoutSequence,
  getTotalRemainingTime,
  normalizeWorkoutConfig,
} from '../utils/timeHelpers'

const TICK_INTERVAL_MS = 250
const FALLBACK_STEP: TimerStep = {
  key: PHASES.FINISHED,
  label: 'Finished',
  duration: 0,
  currentSet: 1,
  currentRound: 1,
}

function useTimer(config: WorkoutConfig): TimerHookResult {
  const normalizedConfig = useMemo(() => normalizeWorkoutConfig(config), [config])
  const sequence = useMemo(
    () => buildWorkoutSequence(normalizedConfig),
    [normalizedConfig],
  )
  const initialStep = useMemo<TimerStep>(() => sequence[0] ?? FALLBACK_STEP, [sequence])

  const [phaseIndex, setPhaseIndex] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(initialStep.duration)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  const { isMuted, toggleMute, playDingDing, playBeeper } = useAudioCues()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const remainingMsRef = useRef<number>(initialStep.duration * 1000)
  const configSignatureRef = useRef<string>(JSON.stringify(normalizedConfig))
  const hasStartedWorkoutRef = useRef<boolean>(false)
  const countdownCueRef = useRef<string>('')

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    deadlineRef.current = null
    remainingMsRef.current = initialStep.duration * 1000
    hasStartedWorkoutRef.current = false
    countdownCueRef.current = ''
    setPhaseIndex(0)
    setTimeLeft(initialStep.duration)
    setIsRunning(false)
  }, [clearTimer, initialStep])

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

  const advancePhase = useCallback(() => {
    clearTimer()

    let nextStep: TimerStep = FALLBACK_STEP

    setPhaseIndex((currentIndex) => {
      const nextIndex = Math.min(currentIndex + 1, sequence.length - 1)
      nextStep = sequence[nextIndex] ?? FALLBACK_STEP

      deadlineRef.current = null
      remainingMsRef.current = nextStep.duration * 1000
      countdownCueRef.current = ''
      setTimeLeft(nextStep.duration)

      if (nextStep.key === PHASES.FINISHED) {
        setIsRunning(false)
      }

      return nextIndex
    })

    playBeeper()

    if (nextStep.key === PHASES.FINISHED) {
      playDingDing()
    }
  }, [clearTimer, playBeeper, playDingDing, sequence])

  const play = useCallback(() => {
    const activeStep = sequence[phaseIndex] ?? initialStep

    if (activeStep.key === PHASES.FINISHED) {
      setPhaseIndex(0)
      setTimeLeft(initialStep.duration)
      remainingMsRef.current = initialStep.duration * 1000
      hasStartedWorkoutRef.current = false
      countdownCueRef.current = ''
    } else if (remainingMsRef.current <= 0) {
      remainingMsRef.current = activeStep.duration * 1000
      setTimeLeft(activeStep.duration)
    }

    if (!hasStartedWorkoutRef.current && (sequence[0] ?? initialStep).key === PHASES.WORK) {
      playDingDing()
      hasStartedWorkoutRef.current = true
    }

    setIsRunning(true)
  }, [initialStep, phaseIndex, playDingDing, sequence])

  const pause = useCallback(() => {
    clearTimer()

    if (deadlineRef.current) {
      remainingMsRef.current = Math.max(0, deadlineRef.current - Date.now())
      setTimeLeft(Math.ceil(remainingMsRef.current / 1000))
    }

    deadlineRef.current = null
    setIsRunning(false)
  }, [clearTimer])

  const currentStep = sequence[phaseIndex] ?? sequence.at(-1) ?? initialStep

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      countdownCueRef.current = ''
      return undefined
    }

    if ([3, 2, 1].includes(timeLeft)) {
      const cueKey = `${phaseIndex}-${timeLeft}`

      if (countdownCueRef.current !== cueKey) {
        countdownCueRef.current = cueKey
        playBeeper()
      }
    } else if (timeLeft > 3) {
      countdownCueRef.current = ''
    }

    return undefined
  }, [currentStep.key, isRunning, phaseIndex, playBeeper, timeLeft])

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      return undefined
    }

    deadlineRef.current = Date.now() + remainingMsRef.current

    intervalRef.current = setInterval(() => {
      if (deadlineRef.current === null) {
        return
      }

      const millisecondsLeft = Math.max(0, deadlineRef.current - Date.now())
      const nextSeconds = Math.ceil(millisecondsLeft / 1000)

      remainingMsRef.current = millisecondsLeft
      setTimeLeft((currentSeconds) =>
        currentSeconds === nextSeconds ? currentSeconds : nextSeconds,
      )

      if (millisecondsLeft <= 0) {
        advancePhase()
      }
    }, TICK_INTERVAL_MS)

    return () => {
      clearTimer()
    }
  }, [advancePhase, clearTimer, currentStep, isRunning])

  const totalTimeRemaining = useMemo(
    () => getTotalRemainingTime(sequence, phaseIndex, timeLeft),
    [phaseIndex, sequence, timeLeft],
  )

  return {
    currentPhase: currentStep.label,
    phaseKey: currentStep.key,
    timeLeft,
    currentRound: currentStep.currentRound ?? normalizedConfig.rounds,
    currentSet: currentStep.currentSet ?? normalizedConfig.totalSets,
    totalTimeRemaining,
    phaseDuration: currentStep.duration,
    isRunning,
    isMuted,
    toggleMute,
    play,
    pause,
    reset,
  }
}

export default useTimer
