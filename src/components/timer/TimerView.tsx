import { memo, useCallback, useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import useTimer from '../../hooks/useTimer'
import type { WorkoutConfig } from '../../types'
import TimerDisplay from './TimerDisplay'

interface TimerViewProps {
  config: WorkoutConfig
  routineName?: string
  startKey: number
  session: Session | null
  onBack: () => void
}

function TimerView({ config, routineName, startKey, session, onBack }: TimerViewProps) {
  const timer = useTimer(config, session?.user.id, routineName)
  const playRef = useRef(timer.play)
  const resetRef = useRef(timer.reset)

  useEffect(() => {
    playRef.current = timer.play
    resetRef.current = timer.reset
  }, [timer.play, timer.reset])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      resetRef.current()
      playRef.current()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [startKey])

  const handleBackToSettings = useCallback(() => {
    resetRef.current()
    onBack()
  }, [onBack])

  return (
    <div className="w-full">
      <TimerDisplay
        {...timer}
        rounds={config.rounds}
        totalSets={config.totalSets}
        exerciseTime={config.exerciseTime}
        restTime={config.restTime}
        onBack={handleBackToSettings}
      />
    </div>
  )
}

export default memo(TimerView)
