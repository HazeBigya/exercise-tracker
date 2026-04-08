import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bike,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  NotebookPen,
  Pencil,
  Scale,
  Sparkles,
  Target,
  Trophy,
  Waves,
  X,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import useAnalytics from '../../hooks/useAnalytics'
import { supabase } from '../../lib/supabase'
import type { WeightLog, WorkoutCategory, WorkoutLog } from '../../types'

interface StatsPanelProps {
  session: Session | null
}

type ManualFormState = {
  activityName: string
  category: WorkoutCategory
  durationMinutes: string
  date: string
}

type WeightFormState = {
  weight: string
  loggedDate: string
}

interface HeatmapTooltipEntry {
  name: string
  minutes: number
}

interface CalendarDay {
  date: Date
  dateKey: string
  inCurrentMonth: boolean
  totalMinutes: number
  hasWorkouts: boolean
}

interface HeatmapDay {
  dateKey: string
  label: string
  totalMinutes: number
  tone: string
}

interface HeatmapMonthLabel {
  label: string
  column: number
}

const HEATMAP_ROW_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'] as const
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const CATEGORY_OPTIONS: WorkoutCategory[] = [
  'HIIT',
  'Weights',
  'Bodyweight',
  'Running',
  'Walking',
  'Cycling',
  'Swimming',
  'Rowing',
  'Yoga',
  'Pilates',
  'Boxing',
  'Hiking',
  'Sports',
  'Other',
]
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const MONTH_TITLE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})
const MODAL_BACKDROP_CLASS = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'
const MODAL_CARD_CLASS =
  'relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c212b] shadow-2xl md:flex-row'
const MODAL_LEFT_PANEL_CLASS = 'flex-1 p-8'
const MODAL_RIGHT_PANEL_CLASS =
  'flex w-full flex-col justify-center border-l border-white/5 bg-[#15181e] p-8 md:w-[280px]'
const MODAL_CLOSE_BUTTON_CLASS =
  'absolute top-6 right-6 rounded-full bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white'
const MODAL_TITLE_CLASS = 'text-3xl font-bold tracking-tight text-white'
const MODAL_SUBTITLE_CLASS = 'mt-2 mb-8 text-sm text-white/40'
const MODAL_LABEL_CLASS = 'mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-white/50'
const MODAL_INPUT_CLASS =
  'w-full rounded-xl border border-white/5 bg-[#151923] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50'
const MODAL_SAVE_BUTTON_CLASS =
  'mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60'

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLogDate(log: WorkoutLog): Date | null {
  if (!log.created_at) {
    return null
  }

  const date = new Date(log.created_at)
  return Number.isNaN(date.getTime()) ? null : date
}

function getActiveSeconds(log: WorkoutLog): number {
  return Math.max(0, log.exercise_duration_seconds || log.total_duration_seconds)
}

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

function normalizeCategoryName(category?: string | null, isManual?: boolean | null): WorkoutCategory {
  const value = category?.trim().toLowerCase() ?? ''

  if (!value && isManual) {
    return 'Other'
  }

  if (!value) {
    return 'Other'
  }

  const exactMatch = CATEGORY_OPTIONS.find((option) => option.toLowerCase() === value)
  if (exactMatch) {
    return exactMatch
  }

  if (value.includes('hiit') || value.includes('interval')) {
    return 'HIIT'
  }

  if (value.includes('weight') || value.includes('strength') || value.includes('lift')) {
    return 'Weights'
  }

  if (value.includes('bodyweight') || value.includes('calisthenic') || value.includes('push-up') || value.includes('pull-up')) {
    return 'Bodyweight'
  }

  if (value.includes('hike') || value.includes('trail')) {
    return 'Hiking'
  }

  if (value.includes('walk') || value.includes('step')) {
    return 'Walking'
  }

  if (value.includes('run') || value.includes('cardio') || value.includes('jog') || value.includes('sprint')) {
    return 'Running'
  }

  if (value.includes('cycle') || value.includes('bike') || value.includes('spin')) {
    return 'Cycling'
  }

  if (value.includes('swim') || value.includes('pool')) {
    return 'Swimming'
  }

  if (value.includes('row') || value.includes('erg')) {
    return 'Rowing'
  }

  if (value.includes('yoga') || value.includes('stretch') || value.includes('mobility')) {
    return 'Yoga'
  }

  if (value.includes('pilates') || value.includes('reformer')) {
    return 'Pilates'
  }

  if (value.includes('box') || value.includes('kickbox') || value.includes('bag')) {
    return 'Boxing'
  }

  if (
    value.includes('sport') ||
    value.includes('soccer') ||
    value.includes('football') ||
    value.includes('basketball') ||
    value.includes('tennis') ||
    value.includes('pickleball')
  ) {
    return 'Sports'
  }

  return 'Other'
}

function getCategoryIcon(category: string): ReactNode {
  const normalizedCategory = normalizeCategoryName(category)

  let Icon: LucideIcon = Circle

  switch (normalizedCategory) {
    case 'HIIT':
      Icon = Flame
      break
    case 'Weights':
      Icon = Dumbbell
      break
    case 'Bodyweight':
      Icon = Activity
      break
    case 'Running':
    case 'Walking':
    case 'Hiking':
      Icon = Footprints
      break
    case 'Cycling':
      Icon = Bike
      break
    case 'Swimming':
    case 'Rowing':
      Icon = Waves
      break
    case 'Yoga':
    case 'Pilates':
      Icon = Heart
      break
    case 'Boxing':
      Icon = Target
      break
    case 'Sports':
      Icon = Trophy
      break
    default:
      Icon = Circle
  }

  return (
    <span className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
      <Icon size={18} />
    </span>
  )
}

function getHeatmapTone(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return 'bg-white/5'
  }

  if (totalMinutes < 30) {
    return 'bg-cyan-500/40'
  }

  if (totalMinutes < 60) {
    return 'bg-cyan-500/80'
  }

  return 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
}

function createInitialManualForm(): ManualFormState {
  return {
    activityName: '',
    category: 'HIIT',
    durationMinutes: '20',
    date: getLocalDateKey(new Date()),
  }
}

function createInitialWeightForm(): WeightFormState {
  return {
    weight: '',
    loggedDate: getLocalDateKey(new Date()),
  }
}

function buildYearHeatmap(selectedYear: number, minutesByDate: Map<string, number>) {
  const startOfYear = new Date(selectedYear, 0, 1)
  startOfYear.setHours(0, 0, 0, 0)

  const endOfYear = new Date(selectedYear, 11, 31)
  endOfYear.setHours(0, 0, 0, 0)

  const startPadding = startOfYear.getDay()
  const cells: Array<HeatmapDay | null> = Array.from({ length: startPadding }, () => null)
  const monthLabels: HeatmapMonthLabel[] = []

  let dayIndex = 0

  for (const cursor = new Date(startOfYear); cursor <= endOfYear; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor)
    const dateKey = getLocalDateKey(date)
    const totalMinutes = minutesByDate.get(dateKey) ?? 0
    const column = Math.floor((startPadding + dayIndex) / 7)

    if (date.getDate() === 1 || dayIndex === 0) {
      monthLabels.push({
        label: date.toLocaleString('en-US', { month: 'short' }),
        column,
      })
    }

    cells.push({
      dateKey,
      label: DATE_FORMATTER.format(date),
      totalMinutes,
      tone: getHeatmapTone(totalMinutes),
    })

    dayIndex += 1
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return { cells, monthLabels }
}

function buildCalendarDays(month: Date, minutesByDate: Map<string, number>): CalendarDay[] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  const gridEnd = new Date(monthEnd)
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()))

  const days: CalendarDay[] = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const date = new Date(cursor)
    const dateKey = getLocalDateKey(date)
    const totalMinutes = minutesByDate.get(dateKey) ?? 0

    days.push({
      date,
      dateKey,
      inCurrentMonth: date.getMonth() === month.getMonth(),
      totalMinutes,
      hasWorkouts: totalMinutes > 0,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function StatsPanel({ session }: StatsPanelProps) {
  const { logs, isLoading, error, refreshLogs } = useAnalytics(session?.user.id)

  const [isManualFormOpen, setIsManualFormOpen] = useState<boolean>(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false)
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [manualForm, setManualForm] = useState<ManualFormState>(() => createInitialManualForm())
  const [weightForm, setWeightForm] = useState<WeightFormState>(() => createInitialWeightForm())
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false)
  const [isSavingWeight, setIsSavingWeight] = useState<boolean>(false)
  const [manualFeedback, setManualFeedback] = useState<string | null>(null)
  const [weightFeedback, setWeightFeedback] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [isLoadingWeights, setIsLoadingWeights] = useState<boolean>(Boolean(session?.user.id))
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const activityByDate = useMemo(() => {
    const totals = new Map<string, number>()

    logs.forEach((log) => {
      const date = getLogDate(log)

      if (!date) {
        return
      }

      const dateKey = getLocalDateKey(date)
      const totalMinutes = Math.round(getActiveSeconds(log) / 60)
      totals.set(dateKey, (totals.get(dateKey) ?? 0) + totalMinutes)
    })

    return totals
  }, [logs])

  const logsByDate = useMemo(() => {
    const groups = new Map<string, WorkoutLog[]>()

    ;[...logs]
      .sort((left, right) => (getLogDate(right)?.getTime() ?? 0) - (getLogDate(left)?.getTime() ?? 0))
      .forEach((log) => {
        const date = getLogDate(log)

        if (!date) {
          return
        }

        const dateKey = getLocalDateKey(date)
        groups.set(dateKey, [...(groups.get(dateKey) ?? []), log])
      })

    return groups
  }, [logs])

  const heatmapTooltipByDate = useMemo(() => {
    const tooltipMap = new Map<string, HeatmapTooltipEntry[]>()

    logs.forEach((log) => {
      const date = getLogDate(log)

      if (!date) {
        return
      }

      const dateKey = getLocalDateKey(date)
      const nextEntry = {
        name: log.routine_name?.trim() || 'Workout Session',
        minutes: Math.round(getActiveSeconds(log) / 60),
      }

      tooltipMap.set(dateKey, [...(tooltipMap.get(dateKey) ?? []), nextEntry])
    })

    return tooltipMap
  }, [logs])

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = new Set<number>([currentYear, currentYear - 1, currentYear - 2])

    logs.forEach((log) => {
      const date = getLogDate(log)

      if (date) {
        years.add(date.getFullYear())
      }
    })

    return Array.from(years).sort((left, right) => right - left)
  }, [logs])

  const { cells: heatmapDays, monthLabels } = useMemo(
    () => buildYearHeatmap(selectedYear, activityByDate),
    [activityByDate, selectedYear],
  )

  const monthlyVolumeSeconds = useMemo(() => {
    const now = new Date()

    return logs.reduce((sum, log) => {
      const date = getLogDate(log)

      if (!date || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) {
        return sum
      }

      return sum + getActiveSeconds(log)
    }, 0)
  }, [logs])

  const personalBestsByCategory = useMemo(() => {
    const bestMap = new Map<WorkoutCategory, WorkoutLog>()

    logs.forEach((log) => {
      const category = normalizeCategoryName(log.category, log.is_manual)
      const currentBest = bestMap.get(category)

      if (!currentBest || log.total_duration_seconds > currentBest.total_duration_seconds) {
        bestMap.set(category, log)
      }
    })

    return CATEGORY_OPTIONS.map((category) => ({
      category,
      log: bestMap.get(category) ?? null,
    })).filter((entry) => entry.log !== null)
  }, [logs])

  const recentLogs = useMemo(() => {
    return [...logs]
      .sort((left, right) => (getLogDate(right)?.getTime() ?? 0) - (getLogDate(left)?.getTime() ?? 0))
      .slice(0, 10)
  }, [logs])

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth, activityByDate), [activityByDate, calendarMonth])
  const selectedDateLogs = selectedDateKey ? logsByDate.get(selectedDateKey) ?? [] : []
  const workoutPreviewIcon = getCategoryIcon(manualForm.category)
  const workoutPreviewDate = manualForm.date ? DATE_FORMATTER.format(new Date(`${manualForm.date}T12:00:00`)) : 'today'
  const weightPreviewDate = weightForm.loggedDate
    ? DATE_FORMATTER.format(new Date(`${weightForm.loggedDate}T12:00:00`))
    : 'today'

  const weightChartData = useMemo(
    () =>
      weightLogs.map((entry) => ({
        ...entry,
        dateLabel: new Date(`${entry.logged_date}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [weightLogs],
  )

  const refreshWeightLogs = useCallback(async () => {
    if (!session?.user.id || !supabase) {
      setWeightLogs([])
      setWeightError(null)
      setIsLoadingWeights(false)
      return
    }

    setIsLoadingWeights(true)
    setWeightError(null)

    const { data, error: fetchError } = await supabase
      .from('weight_logs')
      .select('id, user_id, weight, logged_date, created_at')
      .eq('user_id', session.user.id)
      .order('logged_date', { ascending: true })

    if (fetchError) {
      setWeightError(fetchError.message)
      setWeightLogs([])
      setIsLoadingWeights(false)
      return
    }

    setWeightLogs((data ?? []) as WeightLog[])
    setIsLoadingWeights(false)
  }, [session?.user.id])

  useEffect(() => {
    void refreshWeightLogs()
  }, [refreshWeightLogs])

  const handleManualFieldChange = useCallback((field: keyof ManualFormState, value: string) => {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const handleWeightFieldChange = useCallback((field: keyof WeightFormState, value: string) => {
    setWeightForm((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const handleManualActivitySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!session || !supabase) {
        setManualFeedback('Please sign in to save manual workouts.')
        return
      }

      const activityName = manualForm.activityName.trim()
      const durationMinutes = Number.parseInt(manualForm.durationMinutes, 10)

      if (!activityName) {
        setManualFeedback('Please enter an activity name.')
        return
      }

      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        setManualFeedback('Please enter a valid duration in minutes.')
        return
      }

      if (!manualForm.date) {
        setManualFeedback('Please pick the workout date.')
        return
      }

      setIsSavingManual(true)
      setManualFeedback(null)

      const activityTimestamp = new Date(`${manualForm.date}T12:00:00`).toISOString()
      const durationSeconds = durationMinutes * 60
      const payload = {
        user_id: session.user.id,
        routine_name: activityName,
        category: manualForm.category,
        total_duration_seconds: durationSeconds,
        exercise_duration_seconds: durationSeconds,
        rounds_completed: 1,
        sets_completed: 1,
        is_manual: true,
        created_at: activityTimestamp,
      }

      const query = supabase.from('workout_logs')
      const result = editingLogId
        ? await query.update(payload as never).eq('id', editingLogId).eq('user_id', session.user.id)
        : await query.insert(payload as never)

      setIsSavingManual(false)

      if (result.error) {
        setManualFeedback(result.error.message)
        return
      }

      await refreshLogs()
      setManualForm(createInitialManualForm())
      setEditingLogId(null)
      setIsManualFormOpen(false)
      setManualFeedback(editingLogId ? `✅ Updated “${activityName}”.` : `✅ Logged “${activityName}”.`)
    },
    [editingLogId, manualForm, refreshLogs, session],
  )

  const handleSaveWeight = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!session?.user.id || !supabase) {
        setWeightFeedback('Please sign in to save your weight log.')
        return
      }

      const nextWeight = Number.parseFloat(weightForm.weight)

      if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
        setWeightFeedback('Please enter a valid weight in kg.')
        return
      }

      if (!weightForm.loggedDate) {
        setWeightFeedback('Please choose a date.')
        return
      }

      setIsSavingWeight(true)
      setWeightFeedback(null)

      const { error: insertError } = await supabase.from('weight_logs').insert({
        user_id: session.user.id,
        weight: nextWeight,
        logged_date: weightForm.loggedDate,
      } as never)

      setIsSavingWeight(false)

      if (insertError) {
        setWeightFeedback(insertError.message)
        return
      }

      await refreshWeightLogs()
      setWeightForm(createInitialWeightForm())
      setIsWeightModalOpen(false)
      setWeightFeedback(`✅ Logged ${nextWeight} kg.`)
    },
    [refreshWeightLogs, session?.user.id, weightForm],
  )

  const handleOpenCalendar = useCallback(() => {
    const latestLogDate = recentLogs.length > 0 ? getLogDate(recentLogs[0]) : null
    const defaultDate = latestLogDate ?? new Date()

    setCalendarMonth(new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1))
    setSelectedDateKey((current) => current ?? getLocalDateKey(defaultDate))
    setIsCalendarOpen(true)
  }, [recentLogs])

  const handleEditManualLog = useCallback((log: WorkoutLog) => {
    if (!log.is_manual) {
      return
    }

    const date = getLogDate(log) ?? new Date()
    setManualForm({
      activityName: log.routine_name?.trim() || '',
      category: normalizeCategoryName(log.category, log.is_manual),
      durationMinutes: `${Math.max(1, Math.round(getActiveSeconds(log) / 60))}`,
      date: getLocalDateKey(date),
    })
    setEditingLogId(log.id)
    setIsManualFormOpen(true)
    setManualFeedback('Editing manual workout entry.')
  }, [])

  if (!session) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-[#151923] p-6">
          <h2 className="text-2xl font-bold text-white">Fitness Journal</h2>
          <p className="mt-2 text-sm text-white/50">Train, review, and track your streaks</p>
          <p className="mt-4 text-sm text-white/60">Sign in to view your dashboard and save workouts.</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Fitness Journal</h2>
            <p className="text-sm text-white/50">Train, review, and track your streaks</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              aria-label="Open the log workout form"
              onClick={() => {
                setEditingLogId(null)
                setManualForm(createInitialManualForm())
                setManualFeedback(null)
                setIsManualFormOpen(true)
              }}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <NotebookPen size={16} />
              + Log Workout
            </button>

            <button
              type="button"
              aria-label="Open the log weight form"
              onClick={() => {
                setWeightForm(createInitialWeightForm())
                setWeightFeedback(null)
                setIsWeightModalOpen(true)
              }}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Scale size={16} />
              + Log Weight
            </button>
          </div>
        </div>

        <section aria-labelledby="activity-heatmap-heading" className="rounded-2xl border border-white/5 bg-[#151923] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="activity-heatmap-heading" className="text-xs uppercase tracking-[0.25em] text-white/50">
                Activity
              </h2>
              <p className="mt-1 text-sm text-white/40">Calendar year contribution view</p>
            </div>

            <div className="relative inline-flex items-center">
              <select
                aria-label="Select activity year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="appearance-none cursor-pointer border-none bg-transparent pr-8 text-2xl font-bold text-white outline-none focus:ring-0"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year} className="bg-[#151923] text-white">
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 text-cyan-400" />
            </div>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-white/50">Loading activity…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-rose-300">{error}</p>
          ) : (
            <div className="mt-5 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
              <div className="flex min-w-max gap-4">
                <div className="sticky left-0 z-10 bg-[#151923] pr-4">
                  <div className="h-5" />
                  <div className="grid grid-rows-7 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {HEATMAP_ROW_LABELS.map((label, index) => (
                      <span key={`${label}-${index}`} className="flex h-3 items-center">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative w-max">
                  <div className="relative mb-3 h-4">
                    {monthLabels.map((month) => (
                      <span
                        key={`${selectedYear}-${month.label}-${month.column}`}
                        className="absolute text-xs text-white/40"
                        style={{ left: `${month.column * 20}px` }}
                      >
                        {month.label}
                      </span>
                    ))}
                  </div>

                        <div className="grid w-max grid-flow-col grid-rows-7 gap-2">
                    {heatmapDays.map((day, index) =>
                      day ? (
                        <div
                          key={day.dateKey}
                          role="img"
                          aria-label={`Workout activity on ${day.label}: ${day.totalMinutes} minutes`}
                          className={`h-3 w-3 rounded-full ${day.tone}`}
                          title={`${day.label}: ${day.totalMinutes} mins${
                            (heatmapTooltipByDate.get(day.dateKey) ?? []).length > 0
                              ? ` • ${(heatmapTooltipByDate.get(day.dateKey) ?? [])
                                  .map((entry) => `${entry.name} (${entry.minutes}m)`)
                                  .join(', ')}`
                              : ''
                          }`}
                        />
                      ) : (
                        <div
                          key={`empty-${selectedYear}-${index}`}
                          className="h-3 w-3 rounded-full bg-transparent"
                          aria-hidden="true"
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="summary-stats-heading" className="space-y-4">
          <h2 id="summary-stats-heading" className="sr-only">
            Workout summary statistics
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#151923] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950">
                <Sparkles size={16} />
              </span>
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Monthly Volume</p>
            </div>
            <div className="mt-4 text-4xl font-bold text-white">{formatMinutes(monthlyVolumeSeconds)}</div>
            <p className="mt-1 text-sm text-white/40">Active minutes logged this month.</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#151923] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950">
                <Activity size={16} />
              </span>
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Total Workouts</p>
            </div>
            <div className="mt-4 text-4xl font-bold text-white">{logs.length}</div>
            <p className="mt-1 text-sm text-white/40">Sessions logged across your tracker.</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#151923] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950">
                <Trophy size={16} />
              </span>
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Personal Bests</p>
            </div>

            {personalBestsByCategory.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {personalBestsByCategory.map(({ category, log }) => {
                  if (!log) {
                    return null
                  }

                  const categoryIcon = getCategoryIcon(category)

                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {categoryIcon}
                        <span className="text-sm font-medium text-white/80">{category}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatMinutes(log.total_duration_seconds)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 text-4xl font-bold text-white">0 min</div>
            )}

            <p className="mt-3 text-sm text-white/40">Best session duration recorded for each workout category.</p>
          </div>
        </div>

        <section aria-labelledby="weight-trend-heading" className="rounded-2xl border border-white/5 bg-[#151923] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950">
              <Scale size={16} />
            </span>
            <h2 id="weight-trend-heading" className="text-xs uppercase tracking-[0.22em] text-white/50">
              Weight Trend
            </h2>
          </div>

          {isLoadingWeights ? (
            <p className="mt-6 text-sm text-white/50">Loading weight data…</p>
          ) : weightError ? (
            <p className="mt-6 text-sm text-rose-300">{weightError}</p>
          ) : weightChartData.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">No weight data logged yet. Start tracking your progress!</p>
          ) : (
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff50', fontSize: 12 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#151923',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | string) => [`${value} kg`, 'Weight']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: '#22d3ee', r: 4 }}
                    activeDot={{ r: 6, fill: '#818cf8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </section>

      <section aria-labelledby="recent-history-heading" className="rounded-2xl border border-white/5 bg-[#151923] p-6">
        <h2 id="recent-history-heading" className="text-xs uppercase tracking-[0.25em] text-white/50">
          Recent History
        </h2>

          {isLoading ? (
            <p className="mt-4 text-sm text-white/50">Loading recent workouts…</p>
          ) : recentLogs.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/50">
              No workouts logged yet. Complete a workout or log one manually!
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {recentLogs.map((log) => {
                  const category = normalizeCategoryName(log.category, log.is_manual)
                  const categoryIcon = getCategoryIcon(log.category ?? category)
                  const date = getLogDate(log)

                  return (
                    <li
                      key={log.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {categoryIcon}

                        <div>
                          <p className="text-sm font-semibold text-white">{log.routine_name?.trim() || 'Workout Session'}</p>
                          <p className="text-xs text-white/50">
                            {category} · {date ? DATE_FORMATTER.format(date) : 'Unknown date'}
                            {log.is_manual ? ' · Manual' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {log.is_manual ? (
                          <button
                            type="button"
                            aria-label={`Edit manual workout ${log.routine_name?.trim() || 'Workout Session'}`}
                            onClick={() => handleEditManualLog(log)}
                            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        ) : null}
                        <div className="text-sm font-semibold text-cyan-100">{formatMinutes(getActiveSeconds(log))}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  aria-label="Open the full workout calendar"
                  onClick={handleOpenCalendar}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View Full Calendar
                </button>
              </div>
            </>
          )}
      </section>
    </section>

      {isManualFormOpen ? (
        <div className={MODAL_BACKDROP_CLASS}>
          <div className={MODAL_CARD_CLASS} role="dialog" aria-modal="true" aria-labelledby="manual-workout-modal-title">
            <button
              type="button"
              aria-label="Close workout form"
              onClick={() => {
                setIsManualFormOpen(false)
                setEditingLogId(null)
                setManualFeedback(null)
                setManualForm(createInitialManualForm())
              }}
              className={MODAL_CLOSE_BUTTON_CLASS}
            >
              <X size={16} />
            </button>

            <div className={MODAL_LEFT_PANEL_CLASS}>
              <div>
                <h3 id="manual-workout-modal-title" className={MODAL_TITLE_CLASS}>
                  {editingLogId ? 'Edit Workout' : 'Log Workout'}
                </h3>
                <p className={MODAL_SUBTITLE_CLASS}>Add a workout to keep your fitness journal complete.</p>
              </div>

              <form onSubmit={handleManualActivitySubmit} aria-labelledby="manual-workout-modal-title">
                <label htmlFor="manual-workout-name" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Workout Name</span>
                  <input
                    id="manual-workout-name"
                    type="text"
                    value={manualForm.activityName}
                    onChange={(event) => handleManualFieldChange('activityName', event.target.value)}
                    placeholder="Evening Walk"
                    className={MODAL_INPUT_CLASS}
                  />
                </label>

                <label htmlFor="manual-workout-category" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Category</span>
                  <select
                    id="manual-workout-category"
                    value={manualForm.category}
                    onChange={(event) => handleManualFieldChange('category', event.target.value)}
                    className={`${MODAL_INPUT_CLASS} appearance-none`}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-[#151923] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="manual-workout-duration" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Duration (Minutes)</span>
                  <input
                    id="manual-workout-duration"
                    type="number"
                    min="1"
                    value={manualForm.durationMinutes}
                    onChange={(event) => handleManualFieldChange('durationMinutes', event.target.value)}
                    className={MODAL_INPUT_CLASS}
                  />
                </label>

                <label htmlFor="manual-workout-date" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Date</span>
                  <input
                    id="manual-workout-date"
                    type="date"
                    value={manualForm.date}
                    onChange={(event) => handleManualFieldChange('date', event.target.value)}
                    className={MODAL_INPUT_CLASS}
                  />
                </label>

                <p className={`text-sm ${manualFeedback?.startsWith('✅') ? 'text-emerald-300' : 'text-white/60'}`}>
                  {manualFeedback ?? 'Add workouts from outside the app so your journal stays complete.'}
                </p>

                <button
                  type="submit"
                  aria-label={editingLogId ? 'Update workout entry' : 'Save workout entry'}
                  disabled={isSavingManual}
                  className={MODAL_SAVE_BUTTON_CLASS}
                >
                  <CalendarDays size={18} />
                  {isSavingManual ? 'Saving…' : editingLogId ? 'Update Workout' : 'Save Workout'}
                </button>
              </form>
            </div>

            <div className={MODAL_RIGHT_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Preview</p>
              <div className="mt-6">{workoutPreviewIcon}</div>
              <p className="mt-5 text-xl font-semibold text-white">
                Adding {manualForm.durationMinutes || '0'} mins to your journal.
              </p>
              <p className="mt-2 text-sm text-white/55">
                {manualForm.activityName?.trim() || 'Workout Session'} · {manualForm.category}
              </p>
              <p className="mt-1 text-sm text-white/45">Scheduled for {workoutPreviewDate}.</p>
            </div>
          </div>
        </div>
      ) : null}

      {isWeightModalOpen ? (
        <div className={MODAL_BACKDROP_CLASS}>
          <div className={MODAL_CARD_CLASS} role="dialog" aria-modal="true" aria-labelledby="weight-log-modal-title">
            <button
              type="button"
              aria-label="Close weight log form"
              onClick={() => {
                setIsWeightModalOpen(false)
                setWeightFeedback(null)
                setWeightForm(createInitialWeightForm())
              }}
              className={MODAL_CLOSE_BUTTON_CLASS}
            >
              <X size={16} />
            </button>

            <div className={MODAL_LEFT_PANEL_CLASS}>
              <div>
                <h3 id="weight-log-modal-title" className={MODAL_TITLE_CLASS}>
                  Log Weight
                </h3>
                <p className={MODAL_SUBTITLE_CLASS}>Track your weight over time and visualize your progress.</p>
              </div>

              <form onSubmit={handleSaveWeight} aria-labelledby="weight-log-modal-title">
                <label htmlFor="weight-log-value" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Weight (kg)</span>
                  <input
                    id="weight-log-value"
                    type="number"
                    step="0.1"
                    min="1"
                    value={weightForm.weight}
                    onChange={(event) => handleWeightFieldChange('weight', event.target.value)}
                    placeholder="70.5"
                    className={MODAL_INPUT_CLASS}
                  />
                </label>

                <label htmlFor="weight-log-date" className="mb-5 block">
                  <span className={MODAL_LABEL_CLASS}>Date</span>
                  <input
                    id="weight-log-date"
                    type="date"
                    value={weightForm.loggedDate}
                    onChange={(event) => handleWeightFieldChange('loggedDate', event.target.value)}
                    className={MODAL_INPUT_CLASS}
                  />
                </label>

                <p className={`text-sm ${weightFeedback?.startsWith('✅') ? 'text-emerald-300' : 'text-white/60'}`}>
                  {weightFeedback ?? 'Add a weigh-in to unlock your progress chart.'}
                </p>

                <button
                  type="submit"
                  aria-label="Save weight entry"
                  disabled={isSavingWeight}
                  className={MODAL_SAVE_BUTTON_CLASS}
                >
                  <Scale size={18} />
                  {isSavingWeight ? 'Saving…' : 'Save Weight'}
                </button>
              </form>
            </div>

            <div className={MODAL_RIGHT_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Preview</p>
              <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <Scale size={28} />
              </div>
              <p className="mt-5 text-xl font-semibold text-white">Tracking your progress for {weightPreviewDate}.</p>
              <p className="mt-2 text-sm text-white/55">Current entry: {weightForm.weight || '0'} kg</p>
              <p className="mt-1 text-sm text-white/45">Your trend updates as each weigh-in is logged.</p>
            </div>
          </div>
        </div>
      ) : null}

      {isCalendarOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/10 bg-[#151923] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="calendar-modal-title" className="text-xl font-bold text-white">
                  Full Workout Calendar
                </h3>
                <p className="text-sm text-white/50">Click a day to review every session logged on that date.</p>
              </div>

              <button
                type="button"
                aria-label="Close full workout calendar"
                onClick={() => setIsCalendarOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="View previous month in workout calendar"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    {MONTH_TITLE_FORMATTER.format(calendarMonth)}
                  </p>

                  <button
                    type="button"
                    aria-label="View next month in workout calendar"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {DAY_LABELS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const isSelected = selectedDateKey === day.dateKey

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        aria-label={`View workouts for ${DATE_FORMATTER.format(day.date)}: ${day.totalMinutes} minutes logged`}
                        title={`${DATE_FORMATTER.format(day.date)}: ${day.totalMinutes} mins`}
                        onClick={() => setSelectedDateKey(day.dateKey)}
                        className={`relative min-h-[64px] rounded-xl border px-2 py-2 text-left transition ${
                          isSelected
                            ? 'border-cyan-400/60 bg-cyan-500/10'
                            : 'border-white/5 bg-white/[0.03] hover:bg-white/5'
                        } ${day.inCurrentMonth ? 'text-white' : 'text-white/30'}`}
                      >
                        <span className="text-sm font-semibold">{day.date.getDate()}</span>
                        {day.hasWorkouts ? <span className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-cyan-400" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {selectedDateKey
                    ? DATE_FORMATTER.format(new Date(`${selectedDateKey}T12:00:00`))
                    : 'Select a day'}
                </p>

                {selectedDateKey && selectedDateLogs.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {selectedDateLogs.map((log) => {
                      const category = normalizeCategoryName(log.category, log.is_manual)
                      const categoryIcon = getCategoryIcon(log.category ?? category)

                      return (
                        <li key={log.id} className="rounded-xl border border-white/5 bg-[#0d1117] p-3">
                          <div className="flex items-center gap-3">
                            {categoryIcon}
                            <div>
                              <p className="text-sm font-semibold text-white">{log.routine_name?.trim() || 'Workout Session'}</p>
                              <p className="text-xs text-white/50">
                                {category}
                                {log.is_manual ? ' · Manual' : ''}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-cyan-100">{formatMinutes(getActiveSeconds(log))}</p>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/50">No workouts logged on this day yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default memo(StatsPanel)
