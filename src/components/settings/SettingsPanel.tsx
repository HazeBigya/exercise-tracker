import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Check, ChevronDown, Clock3, Cloud, Dumbbell, Pencil, Plus, Save, Trash2 } from 'lucide-react'
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

type PlannerMode = 'intervals' | 'strength'

type StrengthDraft = {
  name: string
  targetSets: string
  targetReps: string
  restSeconds: number
}

type StrengthSet = {
  id: string
  actualWeight: string
  actualReps: string
  completed: boolean
}

type StrengthExercise = {
  id: string
  name: string
  targetSets: number
  targetReps: string
  restSeconds: number
  sets: StrengthSet[]
}

const STRENGTH_REST_OPTIONS = [60, 90, 120, 180, 240] as const
const STRENGTH_ROUTINES_STORAGE_KEY = 'exercise-tracker-strength-routines'

function getStoredStrengthRoutines(): Record<string, StrengthExercise[]> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(STRENGTH_ROUTINES_STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === 'object' ? (parsedValue as Record<string, StrengthExercise[]>) : {}
  } catch {
    return {}
  }
}

function writeStoredStrengthRoutine(routineId: string, exercises: StrengthExercise[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const currentRoutines = getStoredStrengthRoutines()
  currentRoutines[routineId] = exercises
  window.localStorage.setItem(STRENGTH_ROUTINES_STORAGE_KEY, JSON.stringify(currentRoutines))
}

function removeStoredStrengthRoutine(routineId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const currentRoutines = getStoredStrengthRoutines()
  delete currentRoutines[routineId]
  window.localStorage.setItem(STRENGTH_ROUTINES_STORAGE_KEY, JSON.stringify(currentRoutines))
}

function createStrengthDraft(): StrengthDraft {
  return {
    name: '',
    targetSets: '3',
    targetReps: '8-12',
    restSeconds: 90,
  }
}

function createStrengthSet(index: number): StrengthSet {
  return {
    id: `set-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actualWeight: '',
    actualReps: '',
    completed: false,
  }
}

function buildStrengthExercise(draft: StrengthDraft): StrengthExercise | null {
  const name = draft.name.trim()
  const targetReps = draft.targetReps.trim()
  const parsedSets = Number.parseInt(draft.targetSets || '0', 10)
  const targetSets = Number.isNaN(parsedSets) ? 0 : parsedSets

  if (!name || !targetReps || targetSets < 1) {
    return null
  }

  return {
    id: `strength-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    targetSets,
    targetReps,
    restSeconds: draft.restSeconds,
    sets: Array.from({ length: targetSets }, (_, index) => createStrengthSet(index)),
  }
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
  onStart: (config: WorkoutConfig, routineName?: string) => void
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
    session ? 'Your saved plans will appear here.' : 'Sign in with Google to save exercise plans to the cloud.',
  )
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [isLoadingRoutines, setIsLoadingRoutines] = useState<boolean>(false)
  const [plannerMode, setPlannerMode] = useState<PlannerMode>('intervals')
  const [strengthDraft, setStrengthDraft] = useState<StrengthDraft>(createStrengthDraft)
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([])
  const [strengthMessage, setStrengthMessage] = useState<string>('Add your first lift to start building a strength routine.')
  const [restTimerLabel, setRestTimerLabel] = useState<string>('Start Rest Timer')
  const [restTimerMessage, setRestTimerMessage] = useState<string>(
    'Mark a set as done to prime the rest timer for that exercise.',
  )

  const totalDuration = useMemo(() => calculateWorkoutDuration(settings), [settings])
  const singleSetDuration = useMemo(() => calculateSingleSetDuration(settings), [settings])
  const totalStrengthSets = useMemo(
    () => strengthExercises.reduce((sum, exercise) => sum + exercise.targetSets, 0),
    [strengthExercises],
  )
  const completedStrengthSets = useMemo(
    () => strengthExercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0),
    [strengthExercises],
  )
  const libraryPlaceholder = useMemo(() => {
    if (isLoadingRoutines) {
      return 'Loading routines…'
    }

    if (savedRoutines.length > 0) {
      return 'Load saved plan'
    }

    return 'No saved workouts yet'
  }, [isLoadingRoutines, savedRoutines.length])

  useEffect(() => {
    let isCancelled = false

    async function fetchSavedRoutines() {
      if (!session || !supabase) {
        setSavedRoutines([])
        setSelectedRoutineId('')
        setStatusMessage('Sign in with Google to save exercise plans to the cloud.')
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
          ? 'Select a saved plan from My Library or save your current calorie-burning setup.'
          : 'No saved plans yet — save your first exercise plan to the cloud.',
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

  const handleStrengthDraftChange = useCallback((field: keyof StrengthDraft, value: string) => {
    setStrengthDraft((current) => ({
      ...current,
      [field]: field === 'restSeconds' ? Number.parseInt(value || '90', 10) : value,
    }))
  }, [])

  const handleAddStrengthExercise = useCallback(() => {
    const nextExercise = buildStrengthExercise(strengthDraft)

    if (!nextExercise) {
      setStrengthMessage('Add an exercise name, set target, and rep range before saving it to the routine.')
      return
    }

    setStrengthExercises((current) => [...current, nextExercise])
    setStrengthDraft(createStrengthDraft())
    setStrengthMessage(`✅ Added ${nextExercise.name} • ${nextExercise.targetSets} sets × ${nextExercise.targetReps} reps.`)
  }, [strengthDraft])

  const handleStrengthSetChange = useCallback(
    (exerciseId: string, setId: string, field: 'actualWeight' | 'actualReps', value: string) => {
      setStrengthExercises((current) =>
        current.map((exercise) =>
          exercise.id !== exerciseId
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
              },
        ),
      )
    },
    [],
  )

  const handleCompleteStrengthSet = useCallback(
    (exerciseId: string, setId: string) => {
      let nextTimerLabel = 'Start Rest Timer'
      let nextTimerMessage = 'Mark a set as done to prime the rest timer for that exercise.'

      setStrengthExercises((current) =>
        current.map((exercise) => {
          if (exercise.id !== exerciseId) {
            return exercise
          }

          const setIndex = exercise.sets.findIndex((set) => set.id === setId) + 1
          nextTimerLabel = `Rest Timer Ready • ${exercise.restSeconds}s`
          nextTimerMessage = `${exercise.name} · Set ${setIndex} complete. Rest window armed for ${exercise.restSeconds} seconds.`

          return {
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === setId ? { ...set, completed: true } : set)),
          }
        }),
      )

      setRestTimerLabel(nextTimerLabel)
      setRestTimerMessage(nextTimerMessage)
      unlockAudio()
      playDingDing()
    },
    [playDingDing, unlockAudio],
  )

  const handleSaveRoutine = useCallback(async () => {
    if (!session || !supabase) {
      setStatusMessage('Sign in with Google to save exercise plans to the cloud.')
      return
    }

    const nextName = routineName.trim() || `Exercise Plan ${new Date().toLocaleDateString()}`
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

    if (plannerMode === 'strength') {
      writeStoredStrengthRoutine(savedRoutine.id, strengthExercises)
    }

    setStatusMessage(`✅ Saved plan “${savedRoutine.name}” to your library.`)
  }, [plannerMode, routineName, session, settings, strengthExercises])

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

      if (plannerMode === 'strength') {
        const storedStrengthExercises = getStoredStrengthRoutines()[routineId] ?? []
        setStrengthExercises(storedStrengthExercises)
        setStrengthMessage(
          storedStrengthExercises.length > 0
            ? `Loaded ${storedStrengthExercises.length} exercise${storedStrengthExercises.length === 1 ? '' : 's'} from “${nextRoutine.name}”.`
            : `Loaded plan “${nextRoutine.name}”. Add exercises to build out the lifting routine.`,
        )
      }

      setStatusMessage(`Loaded plan “${nextRoutine.name}”.`)
    },
    [onLoadSettings, plannerMode, savedRoutines],
  )

  const handleUpdateRoutine = useCallback(async () => {
    if (!session || !supabase || !selectedRoutineId) {
      setStatusMessage('Choose a saved plan from My Library to update it.')
      return
    }

    const nextName = routineName.trim() || `Exercise Plan ${new Date().toLocaleDateString()}`
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

    if (plannerMode === 'strength') {
      writeStoredStrengthRoutine(updatedRoutine.id, strengthExercises)
    }

    setStatusMessage(`✏️ Updated plan “${updatedRoutine.name}”.`)
  }, [plannerMode, routineName, selectedRoutineId, session, settings, strengthExercises])

  const handleDeleteRoutine = useCallback(async () => {
    if (!session || !supabase || !selectedRoutineId) {
      setStatusMessage('Choose a saved plan from My Library to delete it.')
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

    removeStoredStrengthRoutine(selectedRoutineId)
    setSavedRoutines((current) => current.filter((routine) => routine.id !== selectedRoutineId))
    setSelectedRoutineId('')
    setRoutineName('')
    setStatusMessage(
      routineToDelete ? `🗑️ Deleted plan “${routineToDelete.name}”.` : 'Saved plan deleted.',
    )
  }, [savedRoutines, selectedRoutineId, session])

  const isStrengthMode = plannerMode === 'strength'
  const toolbarButtonClass =
    'flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50'
  const fieldShellClass = 'rounded-xl border border-white/10 bg-[#0f141c] p-3'
  const fieldInputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:bg-white/10'

  return (
    <section className="mx-auto w-full max-w-[1600px] rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/60 px-4 py-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-md md:px-6 md:py-5">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-200">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
              Exercise planner
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Build Your Exercise &amp; Weight Loss Plan
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
                {isStrengthMode
                  ? 'Build a premium strength routine with exercise-based sets, rep targets, and guided rest periods.'
                  : 'Plan focused interval sessions with the same premium, compact control surface used in Strength mode.'}
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => setPlannerMode('intervals')}
              aria-pressed={!isStrengthMode}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                !isStrengthMode
                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.28)]'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              Intervals
            </button>
            <button
              type="button"
              onClick={() => setPlannerMode('strength')}
              aria-pressed={isStrengthMode}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isStrengthMode
                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.28)]'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              Strength
            </button>
          </div>
        </div>

        <div className="w-full bg-[#151923] border border-white/10 rounded-2xl p-4 mb-8 flex flex-col lg:flex-row items-end justify-between gap-6">
          <div className="flex-1 w-full min-w-[250px]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Load Saved Plan
              </span>
              <div className="relative">
                <select
                  value={selectedRoutineId}
                  onChange={handleLoadRoutine}
                  disabled={!session || isLoadingRoutines || savedRoutines.length === 0}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#0f141c] px-4 py-3 pr-10 text-sm font-medium text-white outline-none transition focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{libraryPlaceholder}</option>
                  {savedRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id} className="bg-[#151923] text-white">
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
          </div>

          <div className="flex-1 w-full min-w-[250px]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Plan Name
              </span>
              <input
                type="text"
                value={routineName}
                onChange={(event) => setRoutineName(event.target.value)}
                placeholder={isStrengthMode ? 'Upper body strength' : 'Morning intervals'}
                className="w-full rounded-xl border border-white/10 bg-[#0f141c] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
              />
            </label>
          </div>

          <div className="flex flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleSaveRoutine}
              disabled={!session || isSaving || isDeleting}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving && !selectedRoutineId ? 'Saving…' : 'Save'}
            </button>

            <button
              type="button"
              onClick={handleUpdateRoutine}
              disabled={!session || !selectedRoutineId || isSaving || isDeleting}
              className="flex items-center gap-2 rounded-xl border border-amber-200/20 bg-amber-500/10 px-6 py-3 text-xs font-semibold text-amber-50 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={15} />
              {isSaving && selectedRoutineId ? 'Updating…' : 'Update'}
            </button>

            <button
              type="button"
              onClick={handleDeleteRoutine}
              disabled={!session || !selectedRoutineId || isDeleting || isSaving}
              className="flex items-center gap-2 rounded-xl border border-rose-200/20 bg-rose-500/10 px-6 py-3 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={15} />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
          <div className="w-full space-y-4">
            {isStrengthMode ? (
              <>
                <div className="bg-[#151923] p-6 rounded-2xl border border-white/5">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)]">
                      <Dumbbell size={18} />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Strength Builder</p>
                      <h3 className="mt-1 text-xl font-bold text-white">Add Exercise</h3>
                      <p className="mt-1 text-sm text-slate-300/80">
                        Build your working set flow one movement at a time.
                      </p>
                    </div>
                  </div>

                  <label className={`${fieldShellClass} mb-4 block`}>
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                      Exercise Name
                    </span>
                    <input
                      type="text"
                      value={strengthDraft.name}
                      onChange={(event) => handleStrengthDraftChange('name', event.target.value)}
                      placeholder="Bench Press"
                      className={fieldInputClass}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className={fieldShellClass}>
                      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">Sets</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={strengthDraft.targetSets}
                        onChange={(event) => handleStrengthDraftChange('targetSets', event.target.value)}
                        className={fieldInputClass}
                      />
                    </label>

                    <label className={fieldShellClass}>
                      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">Reps</span>
                      <input
                        type="text"
                        value={strengthDraft.targetReps}
                        onChange={(event) => handleStrengthDraftChange('targetReps', event.target.value)}
                        placeholder="8-12"
                        className={fieldInputClass}
                      />
                    </label>

                    <label className={fieldShellClass}>
                      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">Rest</span>
                      <div className="relative">
                        <select
                          value={strengthDraft.restSeconds}
                          onChange={(event) => handleStrengthDraftChange('restSeconds', event.target.value)}
                          className={`${fieldInputClass} appearance-none pr-10`}
                        >
                          {STRENGTH_REST_OPTIONS.map((seconds) => (
                            <option key={seconds} value={seconds} className="bg-[#151923] text-white">
                              {seconds}s
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddStrengthExercise}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
                  >
                    <Plus size={16} />
                    Add to Routine
                  </button>

                  <p className="mt-3 text-sm text-slate-300/80">{strengthMessage}</p>
                </div>

                <div className="bg-[#151923] p-6 rounded-2xl border border-white/5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Routine List</p>
                      <h3 className="mt-1 text-lg font-bold text-white">Added Exercises</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-200">
                      {strengthExercises.length} item{strengthExercises.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {strengthExercises.length > 0 ? (
                    <div className="space-y-2">
                      {strengthExercises.map((exercise) => (
                        <div key={exercise.id} className="rounded-xl border border-white/10 bg-[#0f141c] px-4 py-3 text-sm text-slate-100">
                          <span className="font-semibold text-white">{exercise.name}</span>
                          <span className="text-slate-300">{' | '}</span>
                          <span>{exercise.targetSets} Sets x {exercise.targetReps} Reps</span>
                          <span className="text-slate-300">{' | '}</span>
                          <span>{exercise.restSeconds}s Rest</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-[#0f141c] px-4 py-6 text-sm text-slate-300/80">
                      No exercises added yet. Start with a lift like Bench Press, Squats, or Deadlifts.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-[#151923] p-6 rounded-2xl border border-white/5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)]">
                    <Clock3 size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Intervals Builder</p>
                    <h3 className="mt-1 text-xl font-bold text-white">Configure Session</h3>
                    <p className="mt-1 text-sm text-slate-300/80">
                      The HIIT controls now match the same premium compact structure as Strength mode.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {SETTINGS_FIELDS.map((field) => (
                    <label key={field.name} className={fieldShellClass}>
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
                        className={fieldInputClass}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full">
            {isStrengthMode ? (
              <div className="bg-[#151923] p-6 rounded-2xl border border-white/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">Routine Execution</p>
                    <div className="mt-1 text-3xl font-black tracking-tighter text-white md:text-4xl">
                      {strengthExercises.length} exercise{strengthExercises.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-200">
                    {completedStrengthSets}/{totalStrengthSets || 0} sets done
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className={`mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[20px] px-4 py-4 text-base font-semibold text-white transition ${
                    completedStrengthSets > 0
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_35px_rgba(34,211,238,0.28)]'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 shadow-[0_0_25px_rgba(15,23,42,0.35)]'
                  }`}
                >
                  <Clock3 size={18} />
                  {restTimerLabel}
                </button>

                <p className="mt-2 text-sm text-slate-300/80">{restTimerMessage}</p>

                <div className="mt-4 space-y-3">
                  {strengthExercises.length > 0 ? (
                    strengthExercises.map((exercise) => (
                      <div key={exercise.id} className="rounded-xl border border-white/10 bg-[#0f141c] p-3">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-white">{exercise.name}</p>
                            <p className="text-xs text-slate-300/80">
                              {exercise.targetSets} Sets × {exercise.targetReps} Reps
                            </p>
                          </div>
                          <span className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                            {exercise.restSeconds}s Rest
                          </span>
                        </div>

                        <div className="space-y-2">
                          {exercise.sets.map((set, index) => (
                            <div
                              key={set.id}
                              className="grid gap-2 rounded-xl border border-white/10 bg-[#151923] p-3 md:grid-cols-[0.75fr_1fr_1fr_auto] md:items-end"
                            >
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                                  Set {index + 1}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">Target: {exercise.targetReps} reps</p>
                              </div>

                              <label className="block">
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                                  Actual Weight
                                </span>
                                <input
                                  type="text"
                                  value={set.actualWeight}
                                  onChange={(event) =>
                                    handleStrengthSetChange(exercise.id, set.id, 'actualWeight', event.target.value)
                                  }
                                  placeholder="60 kg"
                                  className="w-full rounded-xl border border-white/10 bg-[#0f141c] px-3 py-2 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                                  Actual Reps
                                </span>
                                <input
                                  type="text"
                                  value={set.actualReps}
                                  onChange={(event) =>
                                    handleStrengthSetChange(exercise.id, set.id, 'actualReps', event.target.value)
                                  }
                                  placeholder="10"
                                  className="w-full rounded-xl border border-white/10 bg-[#0f141c] px-3 py-2 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => handleCompleteStrengthSet(exercise.id, set.id)}
                                className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                  set.completed
                                    ? 'border border-emerald-300/20 bg-emerald-500/15 text-emerald-100'
                                    : 'border border-cyan-300/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15'
                                }`}
                              >
                                <Check size={14} />
                                {set.completed ? 'Done' : 'Check / Done'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-[#0f141c] px-5 py-10 text-center text-sm text-slate-300/80">
                      Add an exercise on the left to log actual weight, track reps, and check off each set.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#151923] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">Estimated Activity Time</p>
                <div className="mt-2 text-5xl font-black tabular-nums tracking-tighter text-white md:text-6xl">
                  {formatSecondsToClock(totalDuration)}
                </div>

                <div className="mt-5 rounded-xl border border-white/10 bg-[#0f141c] p-4 text-xs text-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-300/80">Warmup / Cooldown</span>
                      <strong className="tabular-nums text-white">
                        {settings.warmupTime}s • {settings.cooldownTime}s
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-300/80">Work / Rest</span>
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
                      <strong className="tabular-nums text-white">{formatSecondsToClock(singleSetDuration)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-300/80">Set Rest</span>
                      <strong className="tabular-nums text-white">{settings.setRest}s</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    unlockAudio()
                    playDingDing()
                    onStart(settings, routineName.trim() || 'Custom Exercise Session')
                  }}
                  className="mt-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
                >
                  Start Session
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300/80">
          <Cloud size={14} className="text-cyan-300" />
          <span className={statusMessage.includes('✅') ? 'text-emerald-300' : ''}>{statusMessage}</span>
        </div>
      </div>
    </section>
  )
}

export default memo(SettingsPanel)
