import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutLog } from '../types'

interface UseAnalyticsResult {
  logs: WorkoutLog[]
  isLoading: boolean
  error: string | null
  refreshLogs: () => Promise<void>
  getWeeklyVolume: () => number
  getMonthlyVolume: () => number
  getAverageWeeklyVolume: () => number
  getPersonalBests: () => WorkoutLog | null
}

function getLogDate(log: WorkoutLog): Date | null {
  const source = log.created_at ?? null

  if (!source) {
    return null
  }

  const date = new Date(source)
  return Number.isNaN(date.getTime()) ? null : date
}

function getActiveSeconds(log: WorkoutLog): number {
  return Math.max(0, log.exercise_duration_seconds || log.total_duration_seconds)
}

function getWeekKey(date: Date): string {
  const weekStart = new Date(date)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const year = weekStart.getFullYear()
  const month = String(weekStart.getMonth() + 1).padStart(2, '0')
  const day = String(weekStart.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function useAnalytics(userId?: string | null): UseAnalyticsResult {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  const refreshLogs = useCallback(async () => {
    if (!userId || !supabase) {
      setLogs([])
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('workout_logs')
      .select(
        'id, user_id, routine_name, category, exercise_duration_seconds, total_duration_seconds, rounds_completed, sets_completed, is_manual, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLogs([])
      setIsLoading(false)
      return
    }

    setLogs((data ?? []) as WorkoutLog[])
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    void refreshLogs()
  }, [refreshLogs])

  const getWeeklyVolume = useCallback(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setHours(0, 0, 0, 0)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    return logs.reduce((sum, log) => {
      const date = getLogDate(log)

      if (!date || date.getTime() < sevenDaysAgo.getTime()) {
        return sum
      }

      return sum + getActiveSeconds(log)
    }, 0)
  }, [logs])

  const getMonthlyVolume = useCallback(() => {
    const now = new Date()

    return logs.reduce((sum, log) => {
      const date = getLogDate(log)

      if (!date || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) {
        return sum
      }

      return sum + getActiveSeconds(log)
    }, 0)
  }, [logs])

  const getAverageWeeklyVolume = useCallback(() => {
    const totalsByWeek = new Map<string, number>()

    logs.forEach((log) => {
      const date = getLogDate(log)

      if (!date) {
        return
      }

      const weekKey = getWeekKey(date)
      totalsByWeek.set(weekKey, (totalsByWeek.get(weekKey) ?? 0) + getActiveSeconds(log))
    })

    if (totalsByWeek.size === 0) {
      return 0
    }

    const totalSeconds = Array.from(totalsByWeek.values()).reduce((sum, value) => sum + value, 0)
    return Math.round(totalSeconds / totalsByWeek.size)
  }, [logs])

  const getPersonalBests = useCallback(() => {
    return logs.reduce<WorkoutLog | null>((bestLog, log) => {
      if (!bestLog || log.total_duration_seconds > bestLog.total_duration_seconds) {
        return log
      }

      return bestLog
    }, null)
  }, [logs])

  return {
    logs,
    isLoading,
    error,
    refreshLogs,
    getWeeklyVolume,
    getMonthlyVolume,
    getAverageWeeklyVolume,
    getPersonalBests,
  }
}

export default useAnalytics
