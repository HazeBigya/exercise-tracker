import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PHASES } from '../constants/workoutConstants'
import {
  buildWorkoutSequence,
  getTotalRemainingTime,
  normalizeWorkoutSettings,
} from '../utils/timeHelpers'

const TICK_INTERVAL_MS = 250
const FALLBACK_STEP = Object.freeze({
  key: PHASES.FINISHED,
  label: 'Finished',
  duration: 0,
  set: 1,
  round: 1,
})

function useTimer(config) {
  const normalizedConfig = useMemo(() => normalizeWorkoutSettings(config), [config])
  const sequence = useMemo(
    () => buildWorkoutSequence(normalizedConfig),
    [normalizedConfig],
  )
  const initialStep = useMemo(() => sequence[0] ?? FALLBACK_STEP, [sequence])

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(initialStep.duration)
  const [isRunning, setIsRunning] = useState(false)

  const intervalRef = useRef(null)
  const deadlineRef = useRef(null)
  const remainingMsRef = useRef(initialStep.duration * 1000)
  const configSignatureRef = useRef(JSON.stringify(normalizedConfig))

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    deadlineRef.current = null
    remainingMsRef.current = initialStep.duration * 1000
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

    setPhaseIndex((currentIndex) => {
      const nextIndex = Math.min(currentIndex + 1, sequence.length - 1)
      const nextStep = sequence[nextIndex] ?? FALLBACK_STEP

      deadlineRef.current = null
      remainingMsRef.current = nextStep.duration * 1000
      setTimeLeft(nextStep.duration)

      if (nextStep.key === PHASES.FINISHED) {
        setIsRunning(false)
      }

      return nextIndex
    })
  }, [clearTimer, sequence])

  const play = useCallback(() => {
    const activeStep = sequence[phaseIndex] ?? initialStep

    if (activeStep.key === PHASES.FINISHED) {
      setPhaseIndex(0)
      setTimeLeft(initialStep.duration)
      remainingMsRef.current = initialStep.duration * 1000
    } else if (remainingMsRef.current <= 0) {
      remainingMsRef.current = activeStep.duration * 1000
      setTimeLeft(activeStep.duration)
    }

    setIsRunning(true)
  }, [initialStep, phaseIndex, sequence])

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
      return undefined
    }

    deadlineRef.current = Date.now() + remainingMsRef.current

    intervalRef.current = window.setInterval(() => {
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
    currentRound: currentStep.round ?? normalizedConfig.roundsPerSet,
    currentSet: currentStep.set ?? normalizedConfig.totalSets,
    totalTimeRemaining,
    phaseDuration: currentStep.duration ?? 0,
    isRunning,
    play,
    pause,
    reset,
  }
}

export default useTimer
