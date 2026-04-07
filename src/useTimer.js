import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TICK_INTERVAL_MS = 250
const FALLBACK_STEP = Object.freeze({
  key: 'finished',
  label: 'Finished',
  duration: 0,
  set: 1,
  round: 1,
})

function normalizeConfig(settings = {}) {
  return {
    workTime: Math.max(1, Number(settings.workTime ?? settings.work ?? 1) || 1),
    restTime: Math.max(0, Number(settings.restTime ?? settings.rest ?? 0) || 0),
    roundsPerSet: Math.max(1, Number(settings.roundsPerSet ?? settings.rounds ?? 1) || 1),
    setRest: Math.max(0, Number(settings.setRest ?? 0) || 0),
    totalSets: Math.max(1, Number(settings.totalSets ?? 1) || 1),
  }
}

function buildSequence(settings) {
  const safeSettings = normalizeConfig(settings)
  const sequence = []

  for (let set = 1; set <= safeSettings.totalSets; set += 1) {
    for (let round = 1; round <= safeSettings.roundsPerSet; round += 1) {
      const isFinalRound = round === safeSettings.roundsPerSet
      const isFinalSet = set === safeSettings.totalSets

      sequence.push({
        key: 'work',
        label: 'Work',
        duration: safeSettings.workTime,
        set,
        round,
      })

      if (!isFinalRound && safeSettings.restTime > 0) {
        sequence.push({
          key: 'rest',
          label: 'Rest',
          duration: safeSettings.restTime,
          set,
          round,
        })
      } else if (isFinalRound && !isFinalSet && safeSettings.setRest > 0) {
        sequence.push({
          key: 'set-rest',
          label: 'Set Rest',
          duration: safeSettings.setRest,
          set,
          round,
        })
      }
    }
  }

  sequence.push({
    key: 'finished',
    label: 'Finished',
    duration: 0,
    set: safeSettings.totalSets,
    round: safeSettings.roundsPerSet,
  })

  return sequence
}

function useTimer(settings) {
  const safeSettings = useMemo(() => normalizeConfig(settings), [settings])
  const sequence = useMemo(() => buildSequence(safeSettings), [safeSettings])
  const initialStep = sequence[0] ?? FALLBACK_STEP

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(initialStep.duration)
  const [isRunning, setIsRunning] = useState(false)

  const intervalRef = useRef(null)
  const deadlineRef = useRef(null)
  const remainingMsRef = useRef(initialStep.duration * 1000)
  const configSignatureRef = useRef(JSON.stringify(safeSettings))

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()

    const firstStep = sequence[0] ?? initialStep

    deadlineRef.current = null
    remainingMsRef.current = firstStep.duration * 1000
    setPhaseIndex(0)
    setTimeLeft(firstStep.duration)
    setIsRunning(false)
  }, [clearTimer, initialStep, sequence])

  useEffect(() => {
    const nextSignature = JSON.stringify(safeSettings)

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
  }, [reset, safeSettings])

  const advancePhase = useCallback(() => {
    clearTimer()

    setPhaseIndex((currentIndex) => {
      const nextIndex = Math.min(currentIndex + 1, sequence.length - 1)
      const nextStep = sequence[nextIndex] ?? initialStep

      deadlineRef.current = null
      remainingMsRef.current = nextStep.duration * 1000
      setTimeLeft(nextStep.duration)

      if (nextStep.key === 'finished') {
        setIsRunning(false)
      }

      return nextIndex
    })
  }, [clearTimer, initialStep, sequence])

  const play = useCallback(() => {
    const activeStep = sequence[phaseIndex] ?? initialStep

    if (activeStep.key === 'finished') {
      const firstStep = sequence[0] ?? initialStep

      setPhaseIndex(0)
      setTimeLeft(firstStep.duration)
      remainingMsRef.current = firstStep.duration * 1000
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

  const currentStep = sequence[phaseIndex] ?? sequence[sequence.length - 1] ?? initialStep

  useEffect(() => {
    if (!isRunning || currentStep.key === 'finished') {
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

  const totalTimeRemaining = useMemo(() => {
    if (currentStep.key === 'finished') {
      return 0
    }

    const futureDuration = sequence
      .slice(phaseIndex + 1)
      .reduce((sum, step) => sum + step.duration, 0)

    return Math.max(0, timeLeft + futureDuration)
  }, [currentStep.key, phaseIndex, sequence, timeLeft])

  return {
    currentPhase: currentStep.label,
    phaseKey: currentStep.key,
    timeLeft,
    currentRound: currentStep.round ?? safeSettings.roundsPerSet,
    currentSet: currentStep.set ?? safeSettings.totalSets,
    totalTimeRemaining,
    phaseDuration: currentStep.duration ?? 0,
    isRunning,
    play,
    pause,
    reset,
  }
}

export default useTimer
