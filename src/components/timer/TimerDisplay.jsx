import { memo } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'
import CountdownRing from './CountdownRing'

function TimerDisplay({
  currentPhase,
  phaseKey,
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
  return (
    <GlassCard className="timer-display-card">
      <CountdownRing
        phaseKey={phaseKey}
        currentPhase={currentPhase}
        timeLeft={timeLeft}
        currentRound={currentRound}
        currentSet={currentSet}
        roundsPerSet={roundsPerSet}
        totalSets={totalSets}
        totalTimeRemaining={totalTimeRemaining}
        phaseDuration={phaseDuration}
        isRunning={isRunning}
      />

      <div className="timer-control-row">
        <GlassButton variant="primary" Icon={Play} onClick={play} disabled={isRunning}>
          Play
        </GlassButton>
        <GlassButton variant="secondary" Icon={Pause} onClick={pause} disabled={!isRunning}>
          Pause
        </GlassButton>
        <GlassButton variant="secondary" Icon={RotateCcw} onClick={reset}>
          Reset
        </GlassButton>
      </div>
    </GlassCard>
  )
}

export default memo(TimerDisplay)
