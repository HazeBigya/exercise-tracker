import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ChevronDown, Cloud, Pencil, Save, Trash2 } from 'lucide-react'
import useAudioCues from '../../hooks/useAudioCues'
import { supabase } from '../../lib/supabase'
import type { Routine, WorkoutConfig } from '../../types'
import {
  calculateSingleSetDuration,
  calculateWorkoutDuration,
  formatSecondsToClock,
  normalizeWorkoutConfig,
} from '../../utils/timeHelpers'

const SETTINGS_FIELDS: Array<{
  name: keyof WorkoutConfig
  label: string
  min: number
  step: number
}> = [
  { name: 'warmupTime', label: 'Warmup Time (secs)', min: 0, step: 5 },
  { name: 'exerciseTime', label: 'Exercise Time (secs)', min: 1, step: 5 },
  { name: 'restTime', label: 'Rest Time (secs)', min: 0, step: 5 },
  { name: 'rounds', label: 'Rounds', min: 1, step: 1 },
  { name: 'setRest', label: 'Set Rest (secs)', min: 0, step: 5 },
  { name: 'totalSets', label: 'Total Sets', min: 1, step: 1 },
  { name: 'cooldownTime', label: 'Cooldown Time (secs)', min: 0, step: 5 },
]

type RoutineRow = {
  id: string
  user_id: string
  name: string
  warmup_time: number | null
  exercise_time: number
  rest_time: number
  rounds: number
  set_rest: number
  total_sets: number
  cooldown_time: number | null
  created_at?: string | null
}

function mapRoutineRowToRoutine(row: RoutineRow): Routine {
  const config = normalizeWorkoutConfig({
    warmupTime: row.warmup_time ?? 0,
    exerciseTime: row.exercise_time,
    restTime: row.rest_time,
    rounds: row.rounds,
    setRest: row.set_rest,
    totalSets: row.total_sets,
    cooldownTime: row.cooldown_time ?? 0,
  })

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at ?? null,
    ...config,
  }
}

interface SettingsPanelProps {
  settings: WorkoutConfig
  session: Session | null
  onSettingChange: (name: keyof WorkoutConfig, value: number) => void
  onLoadSettings: (config: WorkoutConfig) => void
  onStart: (config: WorkoutConfig) => void
}

function SettingsPanel({
  settings,
  session,
  onSettingChange,
  onLoadSettings,
  onStart,
}: SettingsPanelProps) {
  const { unlockAudio, playDingDing } = useAudioCues()
  const [routineName, setRoutineName] = useState<string>('')
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([])
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>(
    session ? 'Your saved routines will appear here.' : 'Sign in with Google to save workouts to the cloud.',
  )
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [isLoadingRoutines, setIsLoadingRoutines] = useState<boolean>(false)

  const totalDuration = useMemo(() => calculateWorkoutDuration(settings), [settings])
  const singleSetDuration = useMemo(() => calculateSingleSetDuration(settings), [settings])
  const libraryPlaceholder = useMemo(() => {
    if (isLoadingRoutines) {
      return 'Loading routines…'
    }

    if (savedRoutines.length > 0) {
      return 'Load saved workout'
    }

    return 'No saved workouts yet'
  }, [isLoadingRoutines, savedRoutines.length])

  useEffect(() => {
    let isCancelled = false

    async function fetchSavedRoutines() {
      if (!session || !supabase) {
        setSavedRoutines([])
        setSelectedRoutineId('')
        setStatusMessage('Sign in with Google to save workouts to the cloud.')
        return
      }

      setIsLoadingRoutines(true)

      const { data, error } = await supabase
        .from('routines')
        .select('id, user_id, name, warmup_time, exercise_time, rest_time, rounds, set_rest, total_sets, cooldown_time, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (isCancelled) {
        return
      }

      setIsLoadingRoutines(false)

      if (error) {
        setStatusMessage(error.message)
        return
      }

      const routines = ((data ?? []) as unknown as RoutineRow[]).map(mapRoutineRowToRoutine)
      setSavedRoutines(routines)
      setStatusMessage(
        routines.length > 0
          ? 'Select a saved workout from My Library or save your current setup.'
          : 'No saved workouts yet — save your first one to the cloud.',
      )
    }

    void fetchSavedRoutines()

    return () => {
      isCancelled = true
    }
  }, [session])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target
      const nextValue = Number.parseInt(value || '0', 10)
      onSettingChange(name as keyof WorkoutConfig, Number.isNaN(nextValue) ? 0 : nextValue)
    },
    [onSettingChange],
  )

  const handleSaveRoutine = useCallback(async () => {
    if (!session || !supabase) {
      setStatusMessage('Sign in with Google to save workouts to the cloud.')
      return
    }

    const nextName = routineName.trim() || `Workout ${new Date().toLocaleDateString()}`
    const normalizedSettings = normalizeWorkoutConfig(settings)
    const payload = {
      user_id: session.user.id,
      name: nextName,
      warmup_time: normalizedSettings.warmupTime,
      exercise_time: normalizedSettings.exerciseTime,
      rest_time: normalizedSettings.restTime,
      rounds: normalizedSettings.rounds,
      set_rest: normalizedSettings.setRest,
      total_sets: normalizedSettings.totalSets,
      cooldown_time: normalizedSettings.cooldownTime,
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('routines')
      .insert(payload as never)
      .select('id, user_id, name, warmup_time, exercise_time, rest_time, rounds, set_rest, total_sets, cooldown_time, created_at')
      .single()

    setIsSaving(false)

    if (error) {
      setStatusMessage(error.message)
      return
    }

    const savedRoutine = data ? mapRoutineRowToRoutine(data as unknown as RoutineRow) : null

    if (!savedRoutine) {
      setStatusMessage('Unable to save the routine right now.')
      return
    }

    setSavedRoutines((current) => [savedRoutine, ...current.filter((routine) => routine.id !== savedRoutine.id)])
    setSelectedRoutineId(savedRoutine.id)
    setRoutineName(savedRoutine.name)
    setStatusMessage(`✅ Saved “${savedRoutine.name}” to your cloud library.`)
  }, [routineName, session, settings])

  const handleLoadRoutine = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const routineId = event.target.value
      setSelectedRoutineId(routineId)

      const nextRoutine = savedRoutines.find((routine) => routine.id === routineId)

      if (!nextRoutine) {
        return
      }

      const normalizedRoutine = normalizeWorkoutConfig(nextRoutine)
      onLoadSettings(normalizedRoutine)
      setRoutineName(nextRoutine.name)
      setStatusMessage(`Loaded “${nextRoutine.name}”.`)
    },
    [onLoadSettings, savedRoutines],
  )

  const handleUpdateRoutine = useCallback(async () => {
    if (!session || !supabase || !selectedRoutineId) {
      setStatusMessage('Choose a saved routine from My Library to update it.')
      return
    }

    const nextName = routineName.trim() || `Workout ${new Date().toLocaleDateString()}`
    const normalizedSettings = normalizeWorkoutConfig(settings)
    const payload = {
      name: nextName,
      warmup_time: normalizedSettings.warmupTime,
      exercise_time: normalizedSettings.exerciseTime,
      rest_time: normalizedSettings.restTime,
      rounds: normalizedSettings.rounds,
      set_rest: normalizedSettings.setRest,
      total_sets: normalizedSettings.totalSets,
      cooldown_time: normalizedSettings.cooldownTime,
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('routines')
      .update(payload as never)
      .eq('id', selectedRoutineId)
      .eq('user_id', session.user.id)
      .select('id, user_id, name, warmup_time, exercise_time, rest_time, rounds, set_rest, total_sets, cooldown_time, created_at')
      .single()

    setIsSaving(false)

    if (error) {
      setStatusMessage(error.message)
      return
    }

    const updatedRoutine = data ? mapRoutineRowToRoutine(data as unknown as RoutineRow) : null

    if (!updatedRoutine) {
      setStatusMessage('Unable to update the selected routine right now.')
      return
    }

    setSavedRoutines((current) =>
      current.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine)),
    )
    setRoutineName(updatedRoutine.name)
    setStatusMessage(`✏️ Updated “${updatedRoutine.name}”.`)
  }, [routineName, selectedRoutineId, session, settings])

  const handleDeleteRoutine = useCallback(async () => {
    if (!session || !supabase || !selectedRoutineId) {
      setStatusMessage('Choose a saved routine from My Library to delete it.')
      return
    }

    const routineToDelete = savedRoutines.find((routine) => routine.id === selectedRoutineId)

    setIsDeleting(true)

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', selectedRoutineId)
      .eq('user_id', session.user.id)

    setIsDeleting(false)

    if (error) {
      setStatusMessage(error.message)
      return
    }

    setSavedRoutines((current) => current.filter((routine) => routine.id !== selectedRoutineId))
    setSelectedRoutineId('')
    setRoutineName('')
    setStatusMessage(
      routineToDelete ? `🗑️ Deleted “${routineToDelete.name}”.` : 'Saved routine deleted.',
    )
  }, [savedRoutines, selectedRoutineId, session])

  return (
    <section className="mx-auto w-full max-w-5xl rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/60 px-3 py-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-md md:px-5 md:py-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="flex h-full flex-col space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
            Workout settings
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Configure Your Workout Intervals
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SETTINGS_FIELDS.map((field) => (
              <label
                key={field.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md"
              >
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  {field.label}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  step={field.step}
                  name={field.name}
                  value={settings[field.name]}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:bg-white/10"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col">
          <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-md md:p-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Total workout time
              </p>
              <div className="mt-1 text-4xl font-black tabular-nums tracking-tighter text-white md:text-5xl">
                {formatSecondsToClock(totalDuration)}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-xs text-slate-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300/80">Warmup / Cooldown (secs)</span>
                  <strong className="tabular-nums text-white">
                    {settings.warmupTime}s • {settings.cooldownTime}s
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300/80">Exercise / Rest (secs)</span>
                  <strong className="tabular-nums text-white">
                    {settings.exerciseTime}s / {settings.restTime}s
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300/80">Rounds / Sets</span>
                  <strong className="tabular-nums text-white">
                    {settings.rounds} • {settings.totalSets}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300/80">Single Set Duration</span>
                  <strong className="tabular-nums text-white">
                    {formatSecondsToClock(singleSetDuration)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300/80">Set Rest (secs)</span>
                  <strong className="tabular-nums text-white">{settings.setRest}s</strong>
                </div>
              </div>

            </div>

            <div className="mt-3 space-y-2.5">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                  Routine Name
                </span>
                <input
                  type="text"
                  value={routineName}
                  onChange={(event) => setRoutineName(event.target.value)}
                  placeholder="Morning intervals"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white outline-none backdrop-blur-md transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:bg-white/10"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleSaveRoutine}
                  disabled={!session || isSaving || isDeleting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving && !selectedRoutineId ? 'Saving…' : 'Save to Cloud'}
                </button>

                <button
                  type="button"
                  onClick={handleUpdateRoutine}
                  disabled={!session || !selectedRoutineId || isSaving || isDeleting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-50 backdrop-blur-md transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={16} />
                  {isSaving && selectedRoutineId ? 'Updating…' : 'Update'}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteRoutine}
                  disabled={!session || !selectedRoutineId || isDeleting || isSaving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/20 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-50 backdrop-blur-md transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                  My Library
                </span>
                <div className="relative">
                  <select
                    value={selectedRoutineId}
                    onChange={handleLoadRoutine}
                    disabled={!session || isLoadingRoutines || savedRoutines.length === 0}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm font-medium text-white outline-none backdrop-blur-md transition focus:border-cyan-300/50 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{libraryPlaceholder}</option>
                    {savedRoutines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  />
                </div>
              </label>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Cloud size={14} className="text-cyan-300" />
                  <span className={statusMessage.includes('✅') ? 'text-emerald-300' : 'text-slate-200'}>
                    {statusMessage}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                unlockAudio()
                playDingDing()
                onStart(settings)
              }}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(SettingsPanel)
