import { AnimatePresence, motion as Motion } from 'framer-motion'
import { LogIn, LogOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import SettingsPanel from './components/settings/SettingsPanel'
import StatsPanel from './components/stats/StatsPanel'
import TimerView from './components/timer/TimerView'
import { APP_VIEWS, DEFAULT_WORKOUT_CONFIG } from './constants/workoutConstants'
import useAuth from './hooks/useAuth'
import type { AppView, WorkoutConfig } from './types'
import { normalizeWorkoutConfig } from './utils/timeHelpers'

const settingsTransition = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.6,
} as const

const timerTransition = {
  duration: 0.28,
  ease: [0.25, 1, 0.5, 1],
} as const

function App() {
  const [view, setView] = useState<AppView>(APP_VIEWS.SETTINGS)
  const [startKey, setStartKey] = useState<number>(0)
  const [workoutConfig, setWorkoutConfig] = useState<WorkoutConfig>(DEFAULT_WORKOUT_CONFIG)
  const [activeRoutineName, setActiveRoutineName] = useState<string>('Custom Exercise Session')

  const { session, authLoading, authMessage, signInWithGoogle, signOut } = useAuth()
  const isLoggedIn = Boolean(session?.user.id)

  useEffect(() => {
    if (authLoading) {
      return
    }

    setView(isLoggedIn ? APP_VIEWS.STATS : APP_VIEWS.SETTINGS)
  }, [authLoading, isLoggedIn])

  const handleSettingChange = useCallback((name: keyof WorkoutConfig, value: number) => {
    setWorkoutConfig((current) =>
      normalizeWorkoutConfig({
        ...current,
        [name]: value,
      }),
    )
  }, [])

  const handleLoadSettings = useCallback((nextConfig: WorkoutConfig) => {
    setWorkoutConfig(normalizeWorkoutConfig(nextConfig))
    setView(APP_VIEWS.SETTINGS)
  }, [])

  const handleStart = useCallback((nextConfig: WorkoutConfig, nextRoutineName?: string) => {
    setWorkoutConfig(normalizeWorkoutConfig(nextConfig))
    setActiveRoutineName(nextRoutineName?.trim() || 'Custom Exercise Session')
    setStartKey((current) => current + 1)
    setView(APP_VIEWS.TIMER)
  }, [])

  const handleBack = useCallback(() => {
    setView(APP_VIEWS.SETTINGS)
  }, [])

  const activeTab = useMemo(() => (view === APP_VIEWS.STATS ? APP_VIEWS.STATS : APP_VIEWS.TIMER), [view])
  const authSummary = session?.user?.email ?? (authLoading ? 'Checking session…' : authMessage)

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex items-center justify-end gap-3">
          <span className="hidden text-sm text-white/50 md:block">{authSummary}</span>

          {session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white border border-white/10 hover:bg-white/10 transition"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white border border-white/10 hover:bg-white/10 transition"
            >
              <LogIn size={16} />
              Sign in with Google
            </button>
          )}
        </div>

        <div className="text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
            Exercise &amp; Weight Loss Tracker
          </h1>
          <p className="mt-2 text-sm text-white/50 md:text-base">
            Log movement, build consistent habits, and keep your progress visible every day.
          </p>

          <div className="mt-5 flex w-fit mx-auto rounded-full border border-white/5 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setView((current) => (current === APP_VIEWS.TIMER ? APP_VIEWS.TIMER : APP_VIEWS.SETTINGS))}
              className={`rounded-full px-8 py-2 text-sm font-semibold transition-all ${
                activeTab === APP_VIEWS.TIMER
                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Workout
            </button>
            <button
              type="button"
              disabled={!isLoggedIn}
              onClick={() => {
                if (isLoggedIn) {
                  setView(APP_VIEWS.STATS)
                }
              }}
              className={`rounded-full px-8 py-2 text-sm font-semibold transition-all ${
                activeTab === APP_VIEWS.STATS
                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white'
                  : 'text-white/50 hover:text-white'
              } ${!isLoggedIn ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Stats
            </button>
          </div>
        </div>

        <Motion.section layout className="mt-8" transition={{ layout: settingsTransition }}>
          <AnimatePresence mode="wait" initial={false}>
            {isLoggedIn && view === APP_VIEWS.STATS ? (
              <Motion.div
                key="stats-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={settingsTransition}
              >
                <StatsPanel session={session} />
              </Motion.div>
            ) : view === APP_VIEWS.TIMER ? (
              <Motion.div
                key="timer-view"
                className="overflow-hidden rounded-2xl border border-white/5 bg-[#151923]"
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={timerTransition}
              >
                <div className="border-b border-white/5 px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">HIIT &amp; Interval Tool</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Structured intervals for focused training</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Use the timer to power cardio bursts, recovery intervals, and calorie-burning sessions.
                  </p>
                </div>
                <TimerView
                  config={workoutConfig}
                  routineName={activeRoutineName}
                  startKey={startKey}
                  session={session}
                  onBack={handleBack}
                />
              </Motion.div>
            ) : (
              <Motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={settingsTransition}
              >
                <SettingsPanel
                  settings={workoutConfig}
                  session={session}
                  onSettingChange={handleSettingChange}
                  onLoadSettings={handleLoadSettings}
                  onStart={handleStart}
                />
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.section>
      </div>
    </main>
  )
}

export default App
