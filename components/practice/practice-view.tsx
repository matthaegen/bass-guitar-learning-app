'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Archive,
  ArchiveRestore,
  Check,
  CircleCheck,
  Ellipsis,
  Flame,
  MonitorPlay,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp } from '@/components/app-provider'
import { PageHeader } from '@/components/page-header'
import { AssignmentForm } from '@/components/practice/assignment-form'
import { YouTubePlayer } from '@/components/practice/youtube-player'
import { type Assignment, todayKey } from '@/lib/local-store'
import { computePracticeStats } from '@/lib/stats'
import { cn } from '@/lib/utils'

type Filter = 'current' | 'archive'

export function PracticeView() {
  const {
    user,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    togglePracticedToday,
  } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('current')

  const today = todayKey()
  const current = assignments.filter((a) => !a.archived)
  const visible = filter === 'archive' ? assignments.filter((a) => a.archived) : current
  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null
  const practicedToday = current.filter((a) => a.practiceLog.includes(today)).length
  const firstName = user?.name.split(' ')[0]
  const stats = computePracticeStats(assignments)

  function selectAssignment(id: string) {
    setSelectedId(id)
    setEditingId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader
        title={`Hey ${firstName}, let’s practice`}
        description={
          current.length
            ? `${practicedToday} of ${current.length} practiced today.`
            : assignments.length
              ? 'No current assignments. Add a new one or move one back from the archive.'
              : 'Add the videos your teacher gave you to get started.'
        }
        action={
          !adding && (
            <Button size="lg" className="h-12 self-start" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" />
              Add assignment
            </Button>
          )
        }
      />

      <Link
        href="/progress"
        className="mb-6 inline-flex items-center gap-2 self-start rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
      >
        <Flame
          className={cn('size-4', stats.currentStreak > 0 ? 'text-chart-1' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        {stats.currentStreak > 0 ? `${stats.currentStreak}-day streak` : 'Start your streak'}
      </Link>

      {adding && (
        <div className="mb-6">
          <AssignmentForm
            submitLabel="Add assignment"
            autoFocus
            onCancel={() => setAdding(false)}
            onSubmit={(values) => {
              const created = addAssignment(values)
              setSelectedId(created.id)
              setFilter('current')
              setAdding(false)
            }}
          />
        </div>
      )}

      {assignments.length === 0 ? (
        !adding && <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="assignment-list" className="text-lg font-semibold">
              Assignments
            </h2>
            <div role="group" aria-label="Filter" className="flex rounded-lg bg-secondary p-1">
              {(['current', 'archive'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => {
                    setFilter(f)
                    setSelectedId(null)
                    setEditingId(null)
                  }}
                  className={cn(
                    'h-9 rounded-md px-3 text-sm font-medium',
                    filter === f ? 'bg-card shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {f === 'current' ? 'Current' : 'Archive'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {selected && (
              <section aria-labelledby="now-playing" className="flex min-w-0 flex-col gap-4">
                <YouTubePlayer videoId={selected.videoId} title={selected.title} />
                {editingId === selected.id ? (
                  <AssignmentForm
                    key={selected.id}
                    initial={selected}
                    submitLabel="Save changes"
                    autoFocus
                    onCancel={() => setEditingId(null)}
                    onSubmit={(values) => {
                      updateAssignment(selected.id, values)
                      setEditingId(null)
                    }}
                  />
                ) : (
                  <AssignmentDetails
                    assignment={selected}
                    practiced={selected.practiceLog.includes(today)}
                    onTogglePracticed={() => togglePracticedToday(selected.id)}
                    onEdit={() => setEditingId(selected.id)}
                    onToggleArchive={() => {
                      updateAssignment(selected.id, { archived: !selected.archived })
                      setSelectedId(null)
                    }}
                    onDelete={() => {
                      if (window.confirm(`Delete “${selected.title}”? This can’t be undone.`)) {
                        deleteAssignment(selected.id)
                        setSelectedId(null)
                      }
                    }}
                  />
                )}
              </section>
            )}

            <section aria-labelledby="assignment-list" className="flex flex-col gap-3">
              {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {filter === 'current'
                    ? 'No current assignments. Add one to get going.'
                    : 'Songs you archive will be kept here as a record.'}
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {visible.map((a) => (
                    <li key={a.id}>
                      <AssignmentListItem
                        assignment={a}
                        active={selected?.id === a.id}
                        practiced={a.practiceLog.includes(today)}
                        onSelect={() => selectAssignment(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}

function AssignmentDetails({
  assignment,
  practiced,
  onTogglePracticed,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  assignment: Assignment
  practiced: boolean
  onTogglePracticed: () => void
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  const days = assignment.practiceLog.length

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id="now-playing" className="text-xl font-semibold text-pretty">
          {assignment.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {assignment.archived ? 'Archived · ' : ''}
          {days === 0 ? 'Not practiced yet' : `Practiced on ${days} day${days === 1 ? '' : 's'}`}
        </p>
        {assignment.notes ? (
          <p className="mt-3 whitespace-pre-line text-pretty">{assignment.notes}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No notes for this one.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!assignment.archived && (
          <Button
            className={cn(
              'h-11',
              !practiced && 'bg-success text-success-foreground hover:bg-success/90',
            )}
            variant={practiced ? 'outline' : 'default'}
            aria-pressed={practiced}
            onClick={onTogglePracticed}
          >
            {practiced ? (
              <CircleCheck className="text-success" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {practiced ? 'Practiced today' : 'Mark practiced today'}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                className="size-11"
                aria-label="More actions"
              />
            }
          >
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="h-10 gap-2 text-base" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10 gap-2 text-base" onClick={onToggleArchive}>
              {assignment.archived ? (
                <ArchiveRestore aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              {assignment.archived ? 'Move to current' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="h-10 gap-2 text-base"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function AssignmentListItem({
  assignment,
  active,
  practiced,
  onSelect,
}: {
  assignment: Assignment
  active: boolean
  practiced: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border bg-card p-2 text-left transition-colors hover:border-primary/50',
        active && 'border-primary ring-2 ring-primary/20',
      )}
    >
      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src={`https://i.ytimg.com/vi/${assignment.videoId}/mqdefault.jpg`}
          alt=""
          fill
          sizes="112px"
          className="object-cover"
          unoptimized
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium">{assignment.title}</span>
        {!assignment.archived && practiced && (
          <span className="mt-1 flex items-center gap-1 text-xs text-success">
            <CircleCheck className="size-3.5" aria-hidden="true" />
            Practiced today
          </span>
        )}
      </span>
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <MonitorPlay className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold">No assignments yet</h2>
      <p className="mt-2 max-w-sm text-pretty text-muted-foreground">
        Paste a YouTube link from your teacher. You’ll be able to slow it down and loop the tricky
        parts.
      </p>
      <Button size="lg" className="mt-6 h-12" onClick={onAdd}>
        <Plus aria-hidden="true" />
        Add your first assignment
      </Button>
    </div>
  )
}
