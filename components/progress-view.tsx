'use client'

import Link from 'next/link'
import { CalendarCheck, CheckCircle2, Flame, Guitar, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/app-provider'
import { PageHeader } from '@/components/page-header'
import {
  BADGES,
  computePracticeStats,
  getEarnedBadgeIds,
  type BadgeCategory,
  type BadgeDefinition,
  type BadgeIconKey,
} from '@/lib/stats'
import { cn } from '@/lib/utils'

const CATEGORIES: BadgeCategory[] = ['streak', 'days', 'songs']

const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  streak: 'Streak badges',
  days: 'Practice day badges',
  songs: 'Song badges',
}

const CATEGORY_ICON_CLASS: Record<BadgeCategory, string> = {
  streak: 'bg-chart-1/15 text-chart-1',
  days: 'bg-chart-2/15 text-chart-2',
  songs: 'bg-chart-3/15 text-chart-3',
}

const ICONS: Record<BadgeIconKey, typeof Flame> = {
  flame: Flame,
  'calendar-check': CalendarCheck,
  guitar: Guitar,
}

export function ProgressView() {
  const { assignments } = useApp()
  const stats = computePracticeStats(assignments)
  const earnedIds = getEarnedBadgeIds(stats)

  const description =
    stats.currentStreak > 0
      ? `${stats.currentStreak}-day streak — keep it going!`
      : stats.totalDaysPracticed > 0
        ? 'Practice today to start a new streak.'
        : 'Mark an assignment as practiced to get started.'

  const tiles = [
    { label: 'Longest streak', value: stats.longestStreak },
    { label: 'Total practice days', value: stats.totalDaysPracticed },
    { label: 'Songs started', value: stats.songsStarted },
    { label: 'Songs finished', value: stats.songsArchived },
  ]

  return (
    <>
      <PageHeader title="Your progress" description={description} />

      <div className="flex flex-col gap-6">
        <section
          aria-label="Current streak"
          className="flex flex-col items-center rounded-3xl border bg-card p-6 text-center md:p-10"
        >
          {stats.currentStreak > 0 ? (
            <>
              <Flame className="size-10 text-chart-1" aria-hidden="true" />
              <output
                aria-live="polite"
                className="mt-2 block font-mono text-7xl font-semibold tabular-nums tracking-tight md:text-8xl"
              >
                {stats.currentStreak}
              </output>
              <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Day streak
              </span>
            </>
          ) : (
            <>
              <Flame className="size-10 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-balance text-xl font-semibold">
                {stats.totalDaysPracticed > 0
                  ? 'Start a new streak today'
                  : 'No streak yet — today’s a great day to start!'}
              </p>
              {stats.longestStreak > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Longest streak: {stats.longestStreak} day{stats.longestStreak === 1 ? '' : 's'}
                </p>
              )}
              <Button size="lg" className="mt-6 h-12" render={<Link href="/practice" />}>
                Go practice
              </Button>
            </>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border bg-card p-5">
              <p className="font-mono text-2xl font-semibold tabular-nums">{t.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>

        {CATEGORIES.map((category) => (
          <section key={category} aria-labelledby={`badges-${category}`} className="flex flex-col gap-3">
            <h3 id={`badges-${category}`} className="text-lg font-semibold">
              {CATEGORY_LABEL[category]}
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BADGES.filter((b) => b.category === category).map((badge) => (
                <li key={badge.id}>
                  <BadgeCard badge={badge} earned={earnedIds.has(badge.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

function BadgeCard({ badge, earned }: { badge: BadgeDefinition; earned: boolean }) {
  const Icon = ICONS[badge.icon]

  return (
    <div className="flex h-full flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center">
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full',
          earned ? CATEGORY_ICON_CLASS[badge.category] : 'bg-muted text-muted-foreground grayscale opacity-60',
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="font-medium">{badge.name}</p>
      <p className="text-pretty text-xs text-muted-foreground">{badge.description}</p>
      <span
        className={cn(
          'mt-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          earned ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
        )}
      >
        {earned ? (
          <>
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Earned
          </>
        ) : (
          <>
            <Lock className="size-3.5" aria-hidden="true" />
            Locked
          </>
        )}
      </span>
    </div>
  )
}
