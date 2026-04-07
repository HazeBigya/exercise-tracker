import { memo } from 'react'
import { motion as Motion } from 'framer-motion'
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { TimerHookResult, WorkoutConfig } from '../../types'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'
import CountdownRing from './CountdownRing'
import styles from './TimerDisplay.module.scss'

interface TimerDisplayProps extends TimerHookResult {
  rounds: WorkoutConfig['rounds']
  totalSets: WorkoutConfig['totalSets']
}

function TimerDisplay({
  currentPhase,
  phaseKey,
  timeLeft,
  currentRound,
  currentSet,
  rounds,
  totalSets,
  totalTimeRemaining,
  phaseDuration,
  isRunning,
  isMuted,
  toggleMute,
  play,
  pause,
  reset,
}: TimerDisplayProps) {
  return (
    <GlassCard className={`${styles.timer} ${styles.timer__card}`}>
      <CountdownRing
        phaseKey={phaseKey}
        currentPhase={currentPhase}
        timeLeft={timeLeft}
        currentRound={currentRound}
        currentSet={currentSet}
        rounds={rounds}
        totalSets={totalSets}
        totalTimeRemaining={totalTimeRemaining}
        phaseDuration={phaseDuration}
        isRunning={isRunning}
      />

      <Motion.div className={styles.timer__controls} layout>
        <Motion.div className={styles.timer__tap} whileTap={{ scale: 0.95 }}>
          <GlassButton
            variant="primary"
            className={styles.timer__control}
            Icon={Play}
            onClick={play}
            disabled={isRunning}
          >
            Play
          </GlassButton>
        </Motion.div>

        <Motion.div className={styles.timer__tap} whileTap={{ scale: 0.95 }}>
          <GlassButton
            variant="secondary"
            className={styles.timer__control}
            Icon={Pause}
            onClick={pause}
            disabled={!isRunning}
          >
            Pause
          </GlassButton>
        </Motion.div>

        <Motion.div className={styles.timer__tap} whileTap={{ scale: 0.95 }}>
          <GlassButton
            variant="secondary"
            className={styles.timer__control}
            Icon={RotateCcw}
            onClick={reset}
          >
            Reset
          </GlassButton>
        </Motion.div>

        <Motion.div className={styles.timer__tap} whileTap={{ scale: 0.95 }}>
          <GlassButton
            variant="secondary"
            className={`${styles.timer__control} ${styles.timer__mute}`}
            Icon={isMuted ? VolumeX : Volume2}
            onClick={toggleMute}
            aria-pressed={isMuted}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </GlassButton>
        </Motion.div>
      </Motion.div>
    </GlassCard>
  )
}

export default memo(TimerDisplay)
