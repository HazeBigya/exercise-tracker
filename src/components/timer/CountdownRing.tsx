import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { PHASES, PHASE_THEMES } from '../../constants/workoutConstants'
import type { TimerPhaseKey, TimerState } from '../../types'
import { formatSecondsToClock } from '../../utils/timeHelpers'

interface CountdownRingProps
  extends Pick<TimerState, 'currentPhase' | 'timeLeft' | 'currentRound' | 'currentSet' | 'totalTimeRemaining' | 'isRunning'> {
  phaseKey: TimerPhaseKey
  phaseDuration: number
  rounds: number
  totalSets: number
}

function CountdownRing({
  phaseKey,
  currentPhase,
  timeLeft,
  currentRound,
  currentSet,
  rounds,
  totalSets,
  totalTimeRemaining,
  phaseDuration,
  isRunning,
}: CountdownRingProps) {
  const theme = PHASE_THEMES[phaseKey] ?? PHASE_THEMES[PHASES.WORK]
  const previousSecondRef = useRef<number>(timeLeft)
  const [countdownCue, setCountdownCue] = useState<number | null>(null)

  const size = 300
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const progressRatio = useMemo(() => {
    if (phaseKey === PHASES.FINISHED) {
      return 0
    }

    if (!phaseDuration) {
      return 1
    }

    return Math.max(0, Math.min(1, timeLeft / phaseDuration))
  }, [phaseDuration, phaseKey, timeLeft])

  const strokeDashoffset = circumference * (1 - progressRatio)

  useEffect(() => {
    const previousSecond = previousSecondRef.current
    let frameId: number | null = null

    if (
      isRunning &&
      phaseKey !== PHASES.FINISHED &&
      [3, 2, 1].includes(timeLeft) &&
      timeLeft !== previousSecond
    ) {
      frameId = window.requestAnimationFrame(() => {
        setCountdownCue(timeLeft)
      })
    }

    previousSecondRef.current = timeLeft

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [isRunning, phaseKey, timeLeft])

  useEffect(() => {
    if (countdownCue === null) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setCountdownCue(null), 720)

    return () => window.clearTimeout(timeoutId)
  }, [countdownCue])

  const phaseTitle = phaseKey === PHASES.FINISHED ? 'FINISHED' : `${currentPhase.toUpperCase()}!`

  return (
    <div
      className="timer-visual"
      style={{
        '--phase-color': theme.color,
        '--phase-glow': theme.glow,
        '--phase-accent': theme.accent,
      } as CSSProperties}
    >
      <div className="phase-chip">{theme.chip}</div>

      <Motion.div
        className="timer-halo"
        animate={{
          scale: isRunning ? [1, 1.04, 1] : 1,
          opacity: isRunning ? [0.45, 0.8, 0.45] : 0.55,
        }}
        transition={{ duration: 2.8, repeat: isRunning ? Infinity : 0, ease: 'easeInOut' }}
      />

      <svg
        className="timer-svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${currentPhase} timer with ${timeLeft} seconds remaining`}
      >
        <circle
          className="timer-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Motion.circle
          className="timer-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="timer-face">
        <span className="timer-label timer-phase-title">{phaseTitle}</span>
        <strong className="timer-time timer-time--xl">{formatSecondsToClock(timeLeft)}</strong>
        <span className="timer-set">Round {currentRound}/{rounds}</span>
        <span className="timer-set timer-set--secondary">Set {currentSet}/{totalSets}</span>
        <span className="timer-total-remaining">
          Remaining {formatSecondsToClock(totalTimeRemaining)}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {countdownCue !== null && (
          <Motion.div
            key={`${phaseKey}-${countdownCue}`}
            className="countdown-overlay"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.28, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <Motion.div
              className="countdown-pulse"
              initial={{ scale: 0.5, opacity: 0.75 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <span>{countdownCue}</span>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(CountdownRing)
