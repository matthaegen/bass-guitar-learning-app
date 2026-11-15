import { type Assignment, todayKey } from '@/lib/local-store'

export type PracticeStats = {
  currentStreak: number
  longestStreak: number
  totalDaysPracticed: number
  songsStarted: number
  songsArchived: number
  practicedToday: boolean
}

/** Local-date parsing/stepping — avoids DST bugs from raw millisecond diffs. */
function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Every day practiced across all assignments (current + archived), sorted ascending, deduped. */
export function uniquePracticedDays(assignments: Assignment[]): string[] {
  const days = new Set<string>()
  for (const a of assignments) {
    for (const day of a.practiceLog) days.add(day)
  }
  return [...days].sort()
}

export function computeStreaks(sortedDays: string[]): { current: number; longest: number } {
  if (sortedDays.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let run = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const expected = todayKey(addDays(parseKey(sortedDays[i - 1]), 1))
    run = expected === sortedDays[i] ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const today = todayKey()
  const yesterday = todayKey(addDays(new Date(), -1))
  const last = sortedDays[sortedDays.length - 1]
  const anchor = last === today ? today : last === yesterday ? yesterday : null

  let current = 0
  if (anchor !== null) {
    current = 1
    let cursor = parseKey(anchor)
    for (let i = sortedDays.length - 2; i >= 0; i--) {
      const prevExpected = todayKey(addDays(cursor, -1))
      if (sortedDays[i] !== prevExpected) break
      current++
      cursor = parseKey(sortedDays[i])
    }
  }

  return { current, longest }
}

export function computePracticeStats(assignments: Assignment[]): PracticeStats {
  const days = uniquePracticedDays(assignments)
  const { current, longest } = computeStreaks(days)
  return {
    currentStreak: current,
    longestStreak: longest,
    totalDaysPracticed: days.length,
    songsStarted: assignments.filter((a) => a.practiceLog.length > 0).length,
    songsArchived: assignments.filter((a) => a.archived).length,
    practicedToday: days.includes(todayKey()),
  }
}

export type BadgeCategory = 'streak' | 'days' | 'songs'
export type BadgeIconKey = 'flame' | 'calendar-check' | 'guitar'

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  category: BadgeCategory
  icon: BadgeIconKey
  isEarned: (stats: PracticeStats) => boolean
}

export const BADGES: readonly BadgeDefinition[] = [
  // Streak badges — keyed off longestStreak so a milestone stays earned
  // permanently even after the streak later breaks.
  {
    id: 'streak-3',
    name: 'Spark',
    description: 'Practice 3 days in a row',
    category: 'streak',
    icon: 'flame',
    isEarned: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    name: 'On a Roll',
    description: 'Practice 7 days in a row',
    category: 'streak',
    icon: 'flame',
    isEarned: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak-14',
    name: 'Two-Week Wonder',
    description: 'Practice 14 days in a row',
    category: 'streak',
    icon: 'flame',
    isEarned: (s) => s.longestStreak >= 14,
  },
  {
    id: 'streak-30',
    name: 'Streak Legend',
    description: 'Practice 30 days in a row',
    category: 'streak',
    icon: 'flame',
    isEarned: (s) => s.longestStreak >= 30,
  },
  // Total practice-day badges.
  {
    id: 'days-1',
    name: 'First Step',
    description: 'Log your first practice day',
    category: 'days',
    icon: 'calendar-check',
    isEarned: (s) => s.totalDaysPracticed >= 1,
  },
  {
    id: 'days-10',
    name: 'Practice Regular',
    description: 'Practice on 10 different days',
    category: 'days',
    icon: 'calendar-check',
    isEarned: (s) => s.totalDaysPracticed >= 10,
  },
  {
    id: 'days-25',
    name: 'Dedicated Player',
    description: 'Practice on 25 different days',
    category: 'days',
    icon: 'calendar-check',
    isEarned: (s) => s.totalDaysPracticed >= 25,
  },
  {
    id: 'days-100',
    name: 'Century Club',
    description: 'Practice on 100 different days',
    category: 'days',
    icon: 'calendar-check',
    isEarned: (s) => s.totalDaysPracticed >= 100,
  },
  // Song badges.
  {
    id: 'songs-1',
    name: 'First Song',
    description: 'Start practicing your first song',
    category: 'songs',
    icon: 'guitar',
    isEarned: (s) => s.songsStarted >= 1,
  },
  {
    id: 'songs-5',
    name: 'Song Collector',
    description: 'Start practicing 5 different songs',
    category: 'songs',
    icon: 'guitar',
    isEarned: (s) => s.songsStarted >= 5,
  },
  {
    id: 'archive-1',
    name: 'Song Finished',
    description: 'Finish and archive your first song',
    category: 'songs',
    icon: 'guitar',
    isEarned: (s) => s.songsArchived >= 1,
  },
  {
    id: 'archive-5',
    name: 'Setlist Builder',
    description: 'Finish and archive 5 songs',
    category: 'songs',
    icon: 'guitar',
    isEarned: (s) => s.songsArchived >= 5,
  },
]

export function getEarnedBadgeIds(stats: PracticeStats): Set<string> {
  return new Set(BADGES.filter((b) => b.isEarned(stats)).map((b) => b.id))
}
