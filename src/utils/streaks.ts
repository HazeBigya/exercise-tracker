export interface StreakSummary {
  currentStreak: number
  bestStreak: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toLocalCalendarDate(value: string): Date | null {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
}

function differenceInDays(laterDate: Date, earlierDate: Date): number {
  return Math.round((laterDate.getTime() - earlierDate.getTime()) / MS_PER_DAY)
}

export function calculateStreaks(dates: string[]): StreakSummary {
  const uniqueDates = Array.from(
    new Map(
      dates
        .map((value) => toLocalCalendarDate(value))
        .filter((value): value is Date => value !== null)
        .map((value) => [value.getTime(), value]),
    ).values(),
  ).sort((left, right) => left.getTime() - right.getTime())

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 }
  }

  let bestStreak = 1
  let runningBest = 1

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previousDate = uniqueDates[index - 1]
    const currentDate = uniqueDates[index]

    if (differenceInDays(currentDate, previousDate) === 1) {
      runningBest += 1
    } else {
      runningBest = 1
    }

    bestStreak = Math.max(bestStreak, runningBest)
  }

  const today = new Date()
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const latestDate = uniqueDates[uniqueDates.length - 1]
  const daysSinceLatestWorkout = differenceInDays(localToday, latestDate)

  if (daysSinceLatestWorkout > 1) {
    return { currentStreak: 0, bestStreak }
  }

  let currentStreak = 1

  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const currentDate = uniqueDates[index]
    const previousDate = uniqueDates[index - 1]

    if (differenceInDays(currentDate, previousDate) === 1) {
      currentStreak += 1
    } else {
      break
    }
  }

  return { currentStreak, bestStreak }
}
