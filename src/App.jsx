import { AnimatePresence, motion as Motion } from 'framer-motion'
import { LogIn, LogOut, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import SettingsPanel from './SettingsPanel'
import TimerDisplay from './TimerDisplay'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import useTimer from './useTimer'

function normalizeWorkoutSettings(settings = {}) {
  const workTime = Number(settings.workTime ?? settings.workout ?? 40)
  const restTime = Number(settings.restTime ?? settings.rest ?? 20)
  const roundsPerSet = Number(settings.roundsPerSet ?? settings.rounds ?? 8)
  const setRest = Number(settings.setRest ?? settings.cooldown ?? 90)
  const totalSets = Number(settings.totalSets ?? 3)

  return {
    workTime: Math.max(1, Number.isFinite(workTime) ? workTime : 40),
    restTime: Math.max(0, Number.isFinite(restTime) ? restTime : 20),
    roundsPerSet: Math.max(1, Number.isFinite(roundsPerSet) ? roundsPerSet : 8),
    setRest: Math.max(0, Number.isFinite(setRest) ? setRest : 90),
    totalSets: Math.max(1, Number.isFinite(totalSets) ? totalSets : 3),
  }
}

const defaultSettings = normalizeWorkoutSettings()

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getTotalDuration(settings) {
  const { workTime, restTime, roundsPerSet, setRest, totalSets } =
    normalizeWorkoutSettings(settings)

  return Math.max(
    0,
    ((workTime + restTime) * roundsPerSet - restTime + setRest) * totalSets - setRest,
  )
}

const panelMotion = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -18, scale: 0.985 },
}

function App() {
  const [view, setView] = useState('settings')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState(
    isSupabaseConfigured
      ? 'Guest mode is active — sign in anytime to connect your account.'
      : 'Guest mode is active — add Supabase env vars to enable Google sign-in.',
  )
  const [workoutSettings, setWorkoutSettings] = useState(defaultSettings)

  useEffect(() => {
    let isMounted = true

    if (!supabase) {
      return undefined
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setAuthMessage(error.message)
      }

      setSession(data?.session ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setAuthLoading(false)
      setAuthMessage(
        nextSession?.user?.email
          ? 'Account connected.'
          : 'Guest mode is active — the timer stays fully usable without login.',
      )
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const totalDuration = useMemo(
    () => getTotalDuration(workoutSettings),
    [workoutSettings],
  )

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
  } = useTimer(workoutSettings)

  const handleSettingChange = (name, value) => {
    setWorkoutSettings((current) =>
      normalizeWorkoutSettings({
        ...current,
        [name]: value,
      }),
    )
  }

  const handleLoadSettings = (nextSettings) => {
    pause()
    reset()
    setView('settings')
    setWorkoutSettings((current) => normalizeWorkoutSettings({ ...current, ...nextSettings }))
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setAuthMessage(
        'Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable Google sign-in.',
      )
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthMessage(error.message)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthMessage(error.message)
    }
  }

  const handleStartWorkout = (nextSettings = workoutSettings) => {
    setWorkoutSettings(normalizeWorkoutSettings(nextSettings))
    reset()
    setView('timer')
    window.requestAnimationFrame(() => {
      play()
    })
  }

  const handleBackToSettings = () => {
    pause()
    setView('settings')
  }

  const isFinished = phaseKey === 'finished'
  const currentSetDisplay = Math.min(Math.max(currentSet, 1), workoutSettings.totalSets)
  const currentRoundDisplay = Math.min(
    Math.max(currentRound, 1),
    workoutSettings.roundsPerSet,
  )
  const authSummary = session?.user?.email ?? (authLoading ? 'Checking session…' : authMessage)

  return (
    <main className="app-shell">
      <div className="glass-orb glass-orb--one" aria-hidden="true" />
      <div className="glass-orb glass-orb--two" aria-hidden="true" />

      <header className="app-header">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="brand-kicker">Liquid Glass HIIT</p>
            <h2 className="brand-title">Train in guest mode or sync with Google.</h2>
          </div>
        </div>

        <div className="auth-actions">
          <div className="auth-meta">
            <span className="auth-badge">{session ? 'Signed in' : 'Guest mode'}</span>
            <span className="auth-email">{authSummary}</span>
          </div>

          {session ? (
            <button
              type="button"
              className="btn btn-secondary auth-btn"
              onClick={handleSignOut}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary auth-btn btn-google"
              onClick={handleGoogleSignIn}
            >
              <LogIn size={16} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      <Motion.section
        layout
        className="glass-panel"
        transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === 'settings' ? (
            <Motion.div
              key="settings-view"
              layout
              className="app-view"
              variants={panelMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <SettingsPanel
                settings={workoutSettings}
                session={session}
                onSettingChange={handleSettingChange}
                onLoadSettings={handleLoadSettings}
                onStart={handleStartWorkout}
              />
            </Motion.div>
          ) : (
            <Motion.div
              key="timer-view"
              layout
              className="app-view"
              variants={panelMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
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
                      : `Set ${currentSetDisplay} of ${workoutSettings.totalSets} • Round ${currentRoundDisplay} of ${workoutSettings.roundsPerSet} • ${isRunning ? 'Running' : 'Paused'} • ${formatDuration(totalDuration)} planned`}
                  </p>

                  <div className="metrics">
                    <article className="metric-card">
                      <span className="metric-label">Time left</span>
                      <strong className="metric-value">{formatDuration(timeLeft)}</strong>
                    </article>
                    <article className="metric-card">
                      <span className="metric-label">Set / Round</span>
                      <strong className="metric-value">
                        {currentSetDisplay} · {currentRoundDisplay}
                      </strong>
                    </article>
                    <article className="metric-card">
                      <span className="metric-label">Remaining total</span>
                      <strong className="metric-value">
                        {formatDuration(totalTimeRemaining)}
                      </strong>
                    </article>
                  </div>

                  <div className="glass-actions timer-controls">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleBackToSettings}
                    >
                      Back to Settings
                    </button>
                  </div>
                </div>

                <TimerDisplay
                  currentPhase={currentPhase}
                  timeLeft={timeLeft}
                  currentRound={currentRoundDisplay}
                  currentSet={currentSetDisplay}
                  roundsPerSet={workoutSettings.roundsPerSet}
                  totalSets={workoutSettings.totalSets}
                  totalTimeRemaining={totalTimeRemaining}
                  phaseDuration={phaseDuration}
                  isRunning={isRunning}
                  play={play}
                  pause={pause}
                  reset={reset}
                />
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.section>
    </main>
  )
}

export default App
