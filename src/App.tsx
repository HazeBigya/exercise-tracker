import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import styles from './App.module.scss'
import Header from './components/layout/Header'
import SettingsPanel from './components/settings/SettingsPanel'
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

  const { session, authLoading, authMessage, signInWithGoogle, signOut } = useAuth()

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

  const handleStart = useCallback((nextConfig: WorkoutConfig) => {
    setWorkoutConfig(normalizeWorkoutConfig(nextConfig))
    setStartKey((current) => current + 1)
    setView(APP_VIEWS.TIMER)
  }, [])

  const handleBack = useCallback(() => {
    setView(APP_VIEWS.SETTINGS)
  }, [])

  return (
    <main className={styles.app}>
      <div className={styles.app__ambient} aria-hidden="true" />
      <div className={`${styles.app__orb} ${styles['app__orb--primary']}`} aria-hidden="true" />
      <div className={`${styles.app__orb} ${styles['app__orb--secondary']}`} aria-hidden="true" />

      <div className={styles.app__container}>
        <Header
          session={session}
          authLoading={authLoading}
          authMessage={authMessage}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
        />

        <Motion.section
          layout
          className={styles.app__surface}
          transition={{ layout: settingsTransition }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {view === APP_VIEWS.SETTINGS ? (
              <Motion.div
                key="settings-view"
                className={styles.app__view}
                initial={{ opacity: 0, y: 42 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
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
            ) : (
              <Motion.div
                key="timer-view"
                className={styles.app__view}
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.985 }}
                transition={timerTransition}
              >
                <TimerView config={workoutConfig} startKey={startKey} onBack={handleBack} />
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.section>
      </div>
    </main>
  )
}

export default App
