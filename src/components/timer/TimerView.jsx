import { memo, useEffect, useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { PHASES } from '../../constants/workoutConstants'
import useTimer from '../../hooks/useTimer'
import { calculateWorkoutDuration, formatSecondsToClock } from '../../utils/timeHelpers'
import GlassButton from '../ui/GlassButton'
import TimerDisplay from './TimerDisplay'

function TimerView({ settings, startKey, onBack }) {
  const {
    currentPhase,
    phaseKey,
    timeLeft,
    currentRound,
    currentSet,
    totalTimeRemaining,
    phaseDuration,
    isRunning,
    play,
    pause,
    reset,
  } = useTimer(settings)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      reset()
      play()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [play, reset, startKey])

  const plannedDuration = useMemo(() => calculateWorkoutDuration(settings), [settings])
  const isFinished = phaseKey === PHASES.FINISHED

  return (
    <div className="glass-content timer-view">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" aria-hidden="true" />
          {currentPhase} phase
        </div>

        <h1>{isFinished ? 'Workout complete.' : `Phase: ${currentPhase}`}</h1>
        <p className="timer-helper">
          {isFinished
            ? 'Nice work — the final round and set cycle are complete.'
            : `Set ${currentSet}/${settings.totalSets} • Round ${currentRound}/${settings.roundsPerSet} • ${isRunning ? 'Running' : 'Paused'}`}
        </p>

        <div className="metrics">
          <article className="metric-card">
            <span className="metric-label">Time left</span>
            <strong className="metric-value">{formatSecondsToClock(timeLeft)}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Set / Round</span>
            <strong className="metric-value">
              {currentSet} · {currentRound}
            </strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Planned total</span>
            <strong className="metric-value">
              {formatSecondsToClock(plannedDuration)}
            </strong>
          </article>
        </div>

        <div className="glass-actions timer-controls">
          <GlassButton variant="secondary" Icon={ChevronLeft} onClick={onBack}>
            Back to Settings
          </GlassButton>
          <span className="timer-helper timer-helper--inline">
            Remaining {formatSecondsToClock(totalTimeRemaining)}
          </span>
        </div>
      </div>

      <TimerDisplay
        currentPhase={currentPhase}
        phaseKey={phaseKey}
        timeLeft={timeLeft}
        currentRound={currentRound}
        currentSet={currentSet}
        roundsPerSet={settings.roundsPerSet}
        totalSets={settings.totalSets}
        totalTimeRemaining={totalTimeRemaining}
        phaseDuration={phaseDuration}
        isRunning={isRunning}
        play={play}
        pause={pause}
        reset={reset}
      />
    </div>
  )
}

export default memo(TimerView)
