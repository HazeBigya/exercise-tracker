import { memo, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { getRandomCoachTip } from '../../constants/coachTips'
import { PHASES } from '../../constants/workoutConstants'
import type { TimerHookResult, TimerPhaseKey, TimerStep, WorkoutConfig } from '../../types'
import { calculateSingleSetDuration, formatSecondsToClock } from '../../utils/timeHelpers'

interface TimerDisplayProps extends TimerHookResult {
  rounds: WorkoutConfig['rounds']
  totalSets: WorkoutConfig['totalSets']
  exerciseTime: WorkoutConfig['exerciseTime']
  restTime: WorkoutConfig['restTime']
  onBack: () => void
}

const PHASE_TONES: Record<
  TimerPhaseKey,
  {
    chip: string
    accent: string
    button: string
    detail: string
    tint: string
    marker: string
  }
> = {
  warmup: {
    chip: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    accent: 'text-sky-300',
    button: 'from-sky-500 via-sky-500 to-blue-500',
    detail: 'border-sky-400/20 bg-sky-500/10 text-sky-50',
    tint: '#60a5fa',
    marker: 'rgba(96, 165, 250, 0.55)',
  },
  exercise: {
    chip: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    accent: 'text-rose-300',
    button: 'from-rose-500 via-rose-500 to-red-500',
    detail: 'border-rose-400/20 bg-rose-500/10 text-rose-50',
    tint: '#f87171',
    marker: 'rgba(248, 113, 113, 0.55)',
  },
  rest: {
    chip: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    accent: 'text-emerald-300',
    button: 'from-emerald-500 via-emerald-500 to-green-500',
    detail: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50',
    tint: '#4ade80',
    marker: 'rgba(74, 222, 128, 0.55)',
  },
  'set-rest': {
    chip: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
    accent: 'text-cyan-300',
    button: 'from-cyan-500 via-cyan-500 to-sky-500',
    detail: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-50',
    tint: '#22d3ee',
    marker: 'rgba(34, 211, 238, 0.55)',
  },
  cooldown: {
    chip: 'border-violet-300/25 bg-violet-400/10 text-violet-100',
    accent: 'text-violet-300',
    button: 'from-violet-500 via-violet-500 to-indigo-500',
    detail: 'border-violet-400/20 bg-violet-500/10 text-violet-50',
    tint: '#a78bfa',
    marker: 'rgba(167, 139, 250, 0.55)',
  },
  finished: {
    chip: 'border-slate-300/25 bg-slate-400/10 text-slate-100',
    accent: 'text-slate-100',
    button: 'from-slate-400 via-slate-400 to-slate-500',
    detail: 'border-slate-400/20 bg-slate-500/10 text-slate-50',
    tint: '#cbd5e1',
    marker: 'rgba(203, 213, 225, 0.4)',
  },
}

const ACTION_LABELS: Record<TimerPhaseKey, string> = {
  warmup: 'GET READY',
  exercise: 'WORK',
  rest: 'REST',
  'set-rest': 'SET REST',
  cooldown: 'COOLDOWN',
  finished: 'WORKOUT COMPLETE',
}

function getSegmentStyle(step: TimerStep, index: number, phaseIndex: number) {
  const tone = PHASE_TONES[step.key]
  const isCurrent = index === phaseIndex
  const isPast = index < phaseIndex

  return {
    background: isCurrent ? tone.tint : isPast ? `${tone.tint}99` : 'rgba(71, 85, 105, 0.45)',
    boxShadow: isCurrent ? `0 0 0 1px rgba(255,255,255,0.18), 0 0 18px ${tone.marker}` : 'none',
    opacity: isCurrent || isPast ? 1 : 0.75,
  }
}

function TimerDisplay({
  currentPhase,
  phaseKey,
  timeLeft,
  currentRound,
  currentSet,
  rounds,
  totalSets,
  exerciseTime,
  restTime,
  totalTimeRemaining,
  phaseIndex,
  sequence,
  isRunning,
  isMuted,
  toggleMute,
  play,
  pause,
  reset,
  skip,
  onBack,
}: TimerDisplayProps) {
  const [showDetails, setShowDetails] = useState(true)
  const [coachTip, setCoachTip] = useState<string>(() => getRandomCoachTip())
  const tone = PHASE_TONES[phaseKey]

  const singleSetDuration = useMemo(
    () => calculateSingleSetDuration({ exerciseTime, restTime, rounds }),
    [exerciseTime, restTime, rounds],
  )

  const timelineSteps = useMemo(
    () => sequence.filter((step) => step.key !== PHASES.FINISHED),
    [sequence],
  )

  const nextStep = useMemo(() => sequence[phaseIndex + 1] ?? null, [phaseIndex, sequence])

  const setsRemaining = useMemo(() => {
    if (phaseKey === PHASES.FINISHED) {
      return 0
    }

    return Math.max(totalSets - currentSet, 0)
  }, [currentSet, phaseKey, totalSets])

  const primaryActionLabel =
    phaseKey === PHASES.EXERCISE ? 'Complete Set' : phaseKey === PHASES.FINISHED ? 'Restart Workout' : 'Next Step'

  const estimatedFinish = useMemo(() => {
    if (totalTimeRemaining <= 0) {
      return 'Complete'
    }

    return new Date(Date.now() + totalTimeRemaining * 1000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [totalTimeRemaining])

  useEffect(() => {
    const rotateTip = () => {
      setCoachTip((currentTip) => getRandomCoachTip(currentTip))
    }

    rotateTip()
    const intervalId = window.setInterval(rotateTip, 10 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <section className="min-h-[78vh] bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-4 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to settings"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
          >
            <ChevronLeft size={18} />
            <span>Back to Settings</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            aria-pressed={isMuted}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition hover:bg-white/10"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${tone.chip}`}>
              {currentPhase}
            </span>
            <span className="text-xs font-medium text-slate-300/80">
              Step {Math.min(phaseIndex + 1, Math.max(timelineSteps.length, 1))} / {Math.max(timelineSteps.length, 1)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/75">
              <span>Workout Timeline</span>
              <span>{formatSecondsToClock(totalTimeRemaining)} left</span>
            </div>
            <div className="flex items-center gap-2">
              {timelineSteps.map((step, index) => (
                <div
                  key={`${step.key}-${index}`}
                  className={`h-3 flex-1 rounded-full transition-all duration-300 ${index === phaseIndex ? 'scale-y-125' : ''}`}
                  style={getSegmentStyle(step, index, phaseIndex)}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className={`text-sm font-semibold uppercase tracking-[0.32em] ${tone.accent}`}>
              {ACTION_LABELS[phaseKey]}
            </p>
            <div className="mt-4 text-6xl font-black tabular-nums tracking-[-0.06em] text-white sm:text-7xl lg:text-8xl">
              {formatSecondsToClock(timeLeft)}
            </div>
            <p className="mt-3 text-base font-semibold text-white/90 sm:text-lg">
              Round {Math.min(Math.max(currentRound, 1), rounds)} / {rounds} • Set {Math.min(Math.max(currentSet, 1), totalSets)} / {totalSets}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={isRunning ? pause : play}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} className="translate-x-[1px]" />}
              <span>{isRunning ? 'Pause' : phaseKey === PHASES.FINISHED ? 'Replay' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
            >
              <RotateCcw size={20} />
              <span>Reset Workout</span>
            </button>

            <button
              type="button"
              onClick={phaseKey === PHASES.FINISHED ? reset : skip}
              className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${tone.button} px-4 py-3 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.25)] transition hover:scale-[1.01]`}
            >
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1 text-left text-white"
            aria-expanded={showDetails}
          >
            <div>
              <p className="text-sm font-semibold text-white">More Details</p>
              <p className="text-xs text-slate-300/80">Progress, up next, splits, and coaching cues</p>
            </div>
            <ChevronDown
              size={20}
              className={`transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`grid transition-all duration-300 ease-out ${showDetails ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Progress</p>
                  <p className="mt-2 text-lg font-semibold text-white">Rounds: {Math.min(Math.max(currentRound, 1), rounds)} / {rounds}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Sets Remaining</p>
                  <p className="mt-2 text-lg font-semibold text-white">{setsRemaining}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Up Next</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {nextStep && nextStep.key !== PHASES.FINISHED ? ACTION_LABELS[nextStep.key] : 'Workout Complete'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Est. Finish</p>
                  <p className="mt-2 text-lg font-semibold text-white">{estimatedFinish}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Exercise Time</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatSecondsToClock(exerciseTime)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Rest Time</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatSecondsToClock(restTime)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300/75">Single Set Duration</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatSecondsToClock(singleSetDuration)}</p>
                </div>
              </div>

              <div className={`mt-3 rounded-2xl border p-4 ${tone.detail}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">Coach's Tips</p>
                <p className="mt-2 text-sm leading-6 text-white/90">{coachTip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(TimerDisplay)
