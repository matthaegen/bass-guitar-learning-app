'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Assignment, parseYouTubeId } from '@/lib/local-store'

type Values = Pick<Assignment, 'title' | 'videoId' | 'notes'>

export function AssignmentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: {
  initial?: Values
  submitLabel: string
  autoFocus?: boolean
  onSubmit: (values: Values) => void
  onCancel: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const link = String(form.get('link') ?? '')
    const notes = String(form.get('notes') ?? '').trim()
    const videoId = parseYouTubeId(link)
    if (!title) return setError('Give this assignment a name.')
    if (!videoId) return setError('That doesn’t look like a YouTube link. Try copying it again.')
    onSubmit({ title, videoId, notes })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-title">Assignment name</Label>
          <Input
            id="a-title"
            name="title"
            defaultValue={initial?.title}
            autoFocus={autoFocus}
            placeholder="e.g. Major scale, 2 octaves"
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-link">YouTube link</Label>
          <Input
            id="a-link"
            name="link"
            inputMode="url"
            defaultValue={initial ? `https://youtu.be/${initial.videoId}` : undefined}
            placeholder="https://youtube.com/watch?v=…"
            className="h-12 text-base"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="a-notes">Notes from your teacher (optional)</Label>
        <textarea
          id="a-notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
          placeholder="e.g. Start at 60 bpm, focus on muting the open strings"
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 px-5">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
