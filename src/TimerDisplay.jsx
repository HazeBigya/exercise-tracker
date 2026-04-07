import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Pause, Play, RotateCcw } from 'lucide-react'

const phaseThemes = {
  Work: {
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.45)',
    accent: 'rgba(251, 146, 60, 0.12)',
    label: 'Push',
  },
  Workout: {
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.45)',
    accent: 'rgba(251, 146, 60, 0.12)',
    label: 'Push',
  },
  Rest: {
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.42)',
    accent: 'rgba(52, 211, 153, 0.12)',
    label: 'Recover',
  },
  'Set Rest': {
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.4)',
    accent: 'rgba(34, 197, 94, 0.12)',
    label: 'Reset',
  },
  Cooldown: {
    color: '#7dd3fc',
    glow: 'rgba(125, 211, 252, 0.45)',
    accent: 'rgba(125, 211, 252, 0.12)',
    label: 'Cool down',
  },
  Finished: {
    color: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.42)',
    accent: 'rgba(196, 181, 253, 0.12)',
    label: 'Complete',
  },
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function TimerDisplay({
  currentPhase,
  timeLeft,
  currentRound,
  currentSet,
  roundsPerSet,
  totalSets,
  totalTimeRemaining,
  phaseDuration,
  isRunning,
  play,
  pause,
  reset,
}) {
  const theme = phaseThemes[currentPhase] ?? phaseThemes.Work
  const previousSecondRef = useRef(timeLeft)
  const [countdownCue, setCountdownCue] = useState(null)

  const size = 280
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const progressRatio = useMemo(() => {
    if (currentPhase === 'Finished') {
      return 0
    }

    if (!phaseDuration) {
      return 1
    }

    return Math.max(0, Math.min(1, timeLeft / phaseDuration))
  }, [currentPhase, phaseDuration, timeLeft])

  const strokeDashoffset = circumference * (1 - progressRatio)

  useEffect(() => {
    const previousSecond = previousSecondRef.current
    let frameId = null

    if (
      isRunning &&
      currentPhase !== 'Finished' &&
      [3, 2, 1].includes(timeLeft) &&
      timeLeft !== previousSecond
    ) {
      frameId = window.requestAnimationFrame(() => {
        setCountdownCue(timeLeft)
      })
    }

    previousSecondRef.current = timeLeft

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [currentPhase, isRunning, timeLeft])

  useEffect(() => {
    if (countdownCue === null) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setCountdownCue(null), 720)

    return () => window.clearTimeout(timeoutId)
  }, [countdownCue])

  const phaseTitle = currentPhase === 'Finished' ? 'Finished' : `${currentPhase}!`

  const roundLabel =
    currentPhase === 'Finished'
      ? 'Workout complete'
      : `Round ${Math.min(Math.max(currentRound, 1), roundsPerSet)}/${roundsPerSet}`

  const setLabel =
    currentPhase === 'Finished'
      ? `Set ${totalSets}/${totalSets}`
      : `Set ${Math.min(Math.max(currentSet, 1), totalSets)}/${totalSets}`

  return (
    <div className="timer-display">
      <article
        className="preview-card timer-display-card"
        style={{
          '--phase-color': theme.color,
          '--phase-glow': theme.glow,
          '--phase-accent': theme.accent,
        }}
      >
        <div className="phase-chip">{theme.label}</div>

        <div className="timer-visual">
          <Motion.div
            className="timer-halo"
            animate={{
              scale: isRunning ? [1, 1.04, 1] : 1,
              opacity: isRunning ? [0.45, 0.8, 0.45] : 0.55,
            }}
            transition={{
              duration: 2.8,
              repeat: isRunning ? Infinity : 0,
              ease: 'easeInOut',
            }}
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
            <strong className="timer-time timer-time--xl">
              {formatDuration(timeLeft)}
            </strong>
            <span className="timer-set">{roundLabel}</span>
            <span className="timer-set timer-set--secondary">{setLabel}</span>
            <span className="timer-total-remaining">
              Remaining {formatDuration(totalTimeRemaining)}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {countdownCue !== null && (
              <Motion.div
                key={`${currentPhase}-${countdownCue}`}
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

        <div className="timer-control-row">
          <button
            type="button"
            className="timer-control-btn timer-control-btn--primary"
            onClick={play}
            disabled={isRunning}
          >
            <Play size={16} />
            <span>Play</span>
          </button>
          <button
            type="button"
            className="timer-control-btn"
            onClick={pause}
            disabled={!isRunning}
          >
            <Pause size={16} />
            <span>Pause</span>
          </button>
          <button type="button" className="timer-control-btn" onClick={reset}>
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </article>
    </div>
  )
}

export default TimerDisplay
