'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Repeat, RotateCcw, Rewind, FastForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (s: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  setPlaybackRate: (r: number) => void
  getPlaybackRate: () => number
  destroy: () => void
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      playerVars?: Record<string, number | string>
      events?: {
        onReady?: () => void
        onStateChange?: (e: { data: number }) => void
        onPlaybackRateChange?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT as YTNamespace)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5]

const formatTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const loopRef = useRef<{ a: number | null; b: number | null }>({ a: null, b: null })
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [loop, setLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null })

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setPlaying(false)
    setRate(1)
    setLoop({ a: null, b: null })
    loopRef.current = { a: null, b: null }

    const host = document.createElement('div')
    mountRef.current?.appendChild(host)

    loadYouTubeApi().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(host, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e) => !cancelled && setPlaying(e.data === 1),
          onPlaybackRateChange: (e) => !cancelled && setRate(e.data),
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      if (mountRef.current) mountRef.current.innerHTML = ''
    }
  }, [videoId])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const p = playerRef.current
      const { a, b } = loopRef.current
      if (p && a !== null && b !== null && p.getCurrentTime() >= b) p.seekTo(a, true)
    }, 150)
    return () => window.clearInterval(id)
  }, [playing])

  const player = () => playerRef.current

  function changeRate(next: number) {
    const clamped = Math.min(2, Math.max(0.25, Math.round(next * 100) / 100))
    player()?.setPlaybackRate(clamped)
    setRate(clamped)
  }

  function nudge(seconds: number) {
    const p = player()
    if (p) p.seekTo(Math.max(0, p.getCurrentTime() + seconds), true)
  }

  function updateLoop(next: { a: number | null; b: number | null }) {
    loopRef.current = next
    setLoop(next)
  }

  function markLoopPoint() {
    const t = player()?.getCurrentTime() ?? 0
    if (loop.a === null || loop.b !== null) updateLoop({ a: t, b: null })
    else if (t > loop.a) updateLoop({ a: loop.a, b: t })
    else updateLoop({ a: t, b: loop.a })
  }

  const loopLabel =
    loop.a === null
      ? 'Set loop start'
      : loop.b === null
        ? 'Set loop end'
        : `Looping ${formatTime(loop.a)}–${formatTime(loop.b)}`

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div
        ref={mountRef}
        title={title}
        className="aspect-video w-full bg-sidebar [&_iframe]:size-full"
      />

      <div className="flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            className="h-12 min-w-28 text-base"
            disabled={!ready}
            onClick={() => (playing ? player()?.pauseVideo() : player()?.playVideo())}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-12"
            disabled={!ready}
            onClick={() => nudge(-5)}
            aria-label="Back 5 seconds"
          >
            <Rewind aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-12"
            disabled={!ready}
            onClick={() => nudge(5)}
            aria-label="Forward 5 seconds"
          >
            <FastForward aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-12"
            disabled={!ready}
            onClick={() => player()?.seekTo(loop.a ?? 0, true)}
            aria-label={loop.a !== null ? 'Back to loop start' : 'Restart'}
          >
            <RotateCcw aria-hidden="true" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={loop.b !== null ? 'secondary' : 'outline'}
              className={cn('h-12', loop.b !== null && 'bg-accent text-accent-foreground')}
              disabled={!ready}
              onClick={markLoopPoint}
            >
              <Repeat aria-hidden="true" />
              {loopLabel}
            </Button>
            {loop.a !== null && (
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-12"
                onClick={() => updateLoop({ a: null, b: null })}
                aria-label="Clear loop"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
            <span>Playback speed</span>
            <span className="font-mono text-lg tabular-nums text-primary">
              {Math.round(rate * 100)}%
            </span>
          </legend>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-12 w-14 font-mono"
              disabled={!ready || rate <= 0.25}
              onClick={() => changeRate(rate - 0.05)}
              aria-label="Slower by 5 percent"
            >
              −5
            </Button>
            <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6">
              {SPEEDS.map((s) => (
                <Button
                  key={s}
                  variant={rate === s ? 'default' : 'secondary'}
                  className="h-12 font-mono text-base"
                  disabled={!ready}
                  aria-pressed={rate === s}
                  onClick={() => changeRate(s)}
                >
                  {s}×
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="h-12 w-14 font-mono"
              disabled={!ready || rate >= 2}
              onClick={() => changeRate(rate + 0.05)}
              aria-label="Faster by 5 percent"
            >
              +5
            </Button>
          </div>
        </fieldset>
      </div>
    </div>
  )
}
