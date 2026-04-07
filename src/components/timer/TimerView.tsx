import { memo, useEffect, useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { PHASES } from '../../constants/workoutConstants'
import useTimer from '../../hooks/useTimer'
import type { WorkoutConfig } from '../../types'
import { calculateWorkoutDuration, formatSecondsToClock } from '../../utils/timeHelpers'
import GlassButton from '../ui/GlassButton'
import TimerDisplay from './TimerDisplay'

interface TimerViewProps {
  config: WorkoutConfig
  startKey: number
  onBack: () => void
}

function TimerView({ config, startKey, onBack }: TimerViewProps) {
  const timer = useTimer(config)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      timer.reset()
      timer.play()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [startKey])

  const plannedDuration = useMemo(() => calculateWorkoutDuration(config), [config])
  const isFinished = timer.phaseKey === PHASES.FINISHED

  return (
    <div className="glass-content timer-view">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" aria-hidden="true" />
          {timer.currentPhase} phase
        </div>

        <h1>{isFinished ? 'Workout complete.' : `Phase: ${timer.currentPhase}`}</h1>
        <p className="timer-helper">
          {isFinished
            ? 'Nice work — the final round and set cycle are complete.'
            : `Set ${timer.currentSet}/${config.totalSets} • Round ${timer.currentRound}/${config.rounds} • ${timer.isRunning ? 'Running' : 'Paused'}`}
        </p>

        <div className="metrics">
          <article className="metric-card">
            <span className="metric-label">Time left</span>
            <strong className="metric-value">{formatSecondsToClock(timer.timeLeft)}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Set / Round</span>
            <strong className="metric-value">
              {timer.currentSet} · {timer.currentRound}
            </strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Planned total</span>
            <strong className="metric-value">{formatSecondsToClock(plannedDuration)}</strong>
          </article>
        </div>

        <div className="glass-actions timer-controls">
          <GlassButton variant="secondary" Icon={ChevronLeft} onClick={onBack}>
            Back to Settings
          </GlassButton>
          <span className="timer-helper timer-helper--inline">
            Remaining {formatSecondsToClock(timer.totalTimeRemaining)}
          </span>
        </div>
      </div>

      <TimerDisplay {...timer} rounds={config.rounds} totalSets={config.totalSets} />
    </div>
  )
}

export default memo(TimerView)
