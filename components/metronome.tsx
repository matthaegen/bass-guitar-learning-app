'use client'

import { useEffect, useRef, useState } from 'react'
import { Hand, Minus, Pause, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAudioContext } from '@/lib/audio'
import { cn } from '@/lib/utils'

const MIN_BPM = 30
const MAX_BPM = 240
const METERS = [2, 3, 4, 6]
const PRESETS = [60, 80, 100, 120]

function tempoName(bpm: number) {
  if (bpm < 60) return 'Largo · very slow'
  if (bpm < 76) return 'Adagio · slow'
  if (bpm < 108) return 'Andante · walking pace'
  if (bpm < 120) return 'Moderato · medium'
  if (bpm < 156) return 'Allegro · fast'
  return 'Presto · very fast'
}

export function Metronome() {
  const [bpm, setBpm] = useState(80)
  const [beats, setBeats] = useState(4)
  const [accent, setAccent] = useState(true)
  const [running, setRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)

  const settings = useRef({ bpm, beats, accent })
  settings.current = { bpm, beats, accent }
  const taps = useRef<number[]>([])

  useEffect(() => {
    if (!running) {
      setCurrentBeat(-1)
      return
    }
    let timer = 0
    let raf = 0
    let cancelled = false
    const queue: { beat: number; time: number }[] = []

    getAudioContext().then((ctx) => {
      if (cancelled) return
      let nextTime = ctx.currentTime + 0.06
      let beat = 0

      const click = (time: number, strong: boolean) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = strong ? 1600 : 1000
        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.exponentialRampToValueAtTime(strong ? 0.9 : 0.55, time + 0.002)
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
        osc.connect(gain).connect(ctx.destination)
        osc.start(time)
        osc.stop(time + 0.06)
      }

      const schedule = () => {
        while (nextTime < ctx.currentTime + 0.12) {
          const { bpm: b, beats: m, accent: acc } = settings.current
          const idx = beat % m
          click(nextTime, acc && idx === 0)
          queue.push({ beat: idx, time: nextTime })
          nextTime += 60 / b
          beat = idx + 1
        }
        timer = window.setTimeout(schedule, 25)
      }

      const draw = () => {
        while (queue.length && queue[0].time <= ctx.currentTime) {
          setCurrentBeat(queue.shift()!.beat)
        }
        raf = requestAnimationFrame(draw)
      }

      schedule()
      draw()
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [running])

  const setClamped = (v: number) => setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v))))

  function tap() {
    const now = performance.now()
    const recent = [...taps.current.filter((t) => now - t < 2500), now].slice(-6)
    taps.current = recent
    if (recent.length >= 2) {
      const gaps = recent.slice(1).map((t, i) => t - recent[i])
      setClamped(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length))
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section
        aria-label="Tempo"
        className="flex flex-col items-center rounded-3xl border bg-card p-6 md:p-10"
      >
        <div className="flex items-center gap-3" aria-hidden="true">
          {Array.from({ length: beats }, (_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full transition-all duration-75',
                i === 0 && accent ? 'size-7' : 'size-5',
                currentBeat === i
                  ? i === 0 && accent
                    ? 'scale-110 bg-primary'
                    : 'scale-110 bg-accent-foreground'
                  : 'bg-muted',
              )}
            />
          ))}
        </div>

        <div className="mt-8 flex w-full items-center justify-center gap-4 md:gap-8">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-14 w-16 text-base"
              onClick={() => setClamped(bpm - 5)}
              aria-label="Decrease tempo by 5"
            >
              −5
            </Button>
            <Button
              variant="outline"
              className="h-14 w-16"
              onClick={() => setClamped(bpm - 1)}
              aria-label="Decrease tempo by 1"
            >
              <Minus aria-hidden="true" />
            </Button>
          </div>
          <div className="text-center">
            <output
              aria-live="polite"
              className="block font-mono text-7xl font-semibold tabular-nums tracking-tight md:text-8xl"
            >
              {bpm}
            </output>
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              BPM
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-14 w-16 text-base"
              onClick={() => setClamped(bpm + 5)}
              aria-label="Increase tempo by 5"
            >
              +5
            </Button>
            <Button
              variant="outline"
              className="h-14 w-16"
              onClick={() => setClamped(bpm + 1)}
              aria-label="Increase tempo by 1"
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-muted-foreground">{tempoName(bpm)}</p>

        <label className="mt-6 w-full max-w-lg">
          <span className="sr-only">Tempo</span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setClamped(Number(e.target.value))}
            className="h-10 w-full cursor-pointer"
          />
        </label>

        <div className="mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-16 flex-1 text-lg"
            onClick={() => setRunning((r) => !r)}
          >
            {running ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}
            {running ? 'Stop' : 'Start'}
          </Button>
          <Button variant="secondary" size="lg" className="h-16 text-lg sm:w-40" onClick={tap}>
            <Hand className="size-6" aria-hidden="true" />
            Tap tempo
          </Button>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Quick tempos</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                variant={bpm === p ? 'default' : 'secondary'}
                aria-pressed={bpm === p}
                className="h-12 font-mono text-base"
                onClick={() => setBpm(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Beats per bar</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {METERS.map((m) => (
              <Button
                key={m}
                variant={beats === m ? 'default' : 'secondary'}
                aria-pressed={beats === m}
                className="h-12 font-mono text-base"
                onClick={() => setBeats(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Accent the first beat</span>
            <input
              type="checkbox"
              checked={accent}
              onChange={(e) => setAccent(e.target.checked)}
              className="size-5 cursor-pointer accent-primary"
            />
          </label>
        </div>

        <p className="px-1 text-sm text-pretty text-muted-foreground">
          Tip: learn a part slowly first. When you can play it cleanly three times in a row, bump
          the tempo up by 5.
        </p>
      </aside>
    </div>
  )
}
