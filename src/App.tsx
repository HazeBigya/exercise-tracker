import { AnimatePresence, motion as Motion } from 'framer-motion'
import { LogIn, LogOut } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { APP_VIEWS, DEFAULT_WORKOUT_CONFIG } from './constants/workoutConstants'
import useAuth from './hooks/useAuth'
import type { AppView, WorkoutConfig } from './types'
import { normalizeWorkoutConfig } from './utils/timeHelpers'

const SettingsPanel = lazy(() => import('./components/settings/SettingsPanel'))
const StatsPanel = lazy(() => import('./components/stats/StatsPanel'))
const TimerView = lazy(() => import('./components/timer/TimerView'))

const settingsTransition = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.6,
} as const

const timerTransition = {
  duration: 0.28,
  ease: [0.25, 1, 0.5, 1],
} as const

const SITE_URL = 'https://exercise-tracker.bigya.com.np/'

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#151923] px-6 py-10 text-center text-sm text-white/60">
      {label}
    </div>
  )
}

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
  const pageTitle =
    view === APP_VIEWS.TIMER
      ? 'Custom HIIT & Interval Timer | Free Web App'
      : 'Exercise & Weight Loss Tracker | Heatmap & Journal'
  const pageDescription =
    view === APP_VIEWS.TIMER
      ? 'Use a free custom HIIT and interval timer for workouts, cardio bursts, recovery cycles, and structured training sessions right in your browser.'
      : 'Track workouts, visualize consistency with a GitHub-style workout heatmap, and monitor weight loss trends in one exercise journal.'

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <link rel="canonical" href={SITE_URL} />
      </Helmet>

      <div className="min-h-screen bg-[#0d1117] text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <header className="mb-2">
            <div className="mb-6 flex items-center justify-end gap-3">
              <span id="auth-summary" className="hidden text-sm text-white/50 md:block">
                {authSummary}
              </span>

              <nav aria-label="Account actions" className="flex items-center gap-3">
                {session ? (
                  <button
                    type="button"
                    aria-label="Sign out of your exercise tracker account"
                    onClick={() => void signOut()}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Sign in with Google to save workouts and progress"
                    onClick={() => void signInWithGoogle()}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <LogIn size={16} />
                    Sign in with Google
                  </button>
                )}
              </nav>
            </div>

            <div className="text-center">
              <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
                Exercise &amp; Weight Loss Tracker
              </h1>
              <p id="app-description" className="mt-2 text-sm text-white/50 md:text-base">
                Log movement, build consistent habits, and keep your progress visible every day.
              </p>

              <nav
                aria-label="Primary application views"
                className="mx-auto mt-5 flex w-fit rounded-full border border-white/5 bg-white/5 p-1"
              >
                <button
                  type="button"
                  aria-label="Switch to workout timer view"
                  aria-pressed={activeTab === APP_VIEWS.TIMER}
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
                  aria-label={isLoggedIn ? 'Switch to stats dashboard view' : 'Stats dashboard available after sign in'}
                  aria-pressed={activeTab === APP_VIEWS.STATS}
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
              </nav>
            </div>
          </header>

          <main id="main-content" className="mt-8">
            <Motion.section id="app-view-panel" layout transition={{ layout: settingsTransition }}>
              <Suspense
                fallback={
                  <LoadingPanel
                    label={
                      isLoggedIn && view === APP_VIEWS.STATS
                        ? 'Loading dashboard…'
                        : view === APP_VIEWS.TIMER
                          ? 'Loading timer…'
                          : 'Loading workout settings…'
                    }
                  />
                }
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isLoggedIn && view === APP_VIEWS.STATS ? (
                    <Motion.section
                      key="stats-view"
                      aria-labelledby="stats-dashboard-heading"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={settingsTransition}
                    >
                      <h2 id="stats-dashboard-heading" className="sr-only">
                        Exercise dashboard and workout history
                      </h2>
                      <StatsPanel session={session} />
                    </Motion.section>
                  ) : view === APP_VIEWS.TIMER ? (
                    <Motion.section
                      key="timer-view"
                      aria-labelledby="timer-view-heading"
                      className="overflow-hidden rounded-2xl border border-white/5 bg-[#151923]"
                      initial={{ opacity: 0, y: 18, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.985 }}
                      transition={timerTransition}
                    >
                      <div className="border-b border-white/5 px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">HIIT &amp; Interval Tool</p>
                        <h2 id="timer-view-heading" className="mt-2 text-2xl font-bold text-white">
                          Structured intervals for focused training
                        </h2>
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
                    </Motion.section>
                  ) : (
                    <Motion.section
                      key="settings-view"
                      aria-labelledby="settings-view-heading"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={settingsTransition}
                    >
                      <h2 id="settings-view-heading" className="sr-only">
                        Workout timer settings
                      </h2>
                      <SettingsPanel
                        settings={workoutConfig}
                        session={session}
                        onSettingChange={handleSettingChange}
                        onLoadSettings={handleLoadSettings}
                        onStart={handleStart}
                      />
                    </Motion.section>
                  )}
                </AnimatePresence>
              </Suspense>
            </Motion.section>
          </main>
        </div>
      </div>
    </>
  )
}

export default App
