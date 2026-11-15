'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { describeFrequency, detectPitch, getAudioContext } from '@/lib/audio'
import { cn } from '@/lib/utils'

type BassString = { note: string; octave: number; freq: number; label: string }

const FOUR_STRING: BassString[] = [
  { note: 'E', octave: 1, freq: 41.2, label: '4th string · thickest' },
  { note: 'A', octave: 1, freq: 55.0, label: '3rd string' },
  { note: 'D', octave: 2, freq: 73.42, label: '2nd string' },
  { note: 'G', octave: 2, freq: 98.0, label: '1st string · thinnest' },
]
const LOW_B: BassString = { note: 'B', octave: 0, freq: 30.87, label: '5th string · low B' }

type MicStatus = 'idle' | 'listening' | 'unsupported' | 'denied'

export function Tuner() {
  const [fiveString, setFiveString] = useState(false)
  const strings = fiveString ? [LOW_B, ...FOUR_STRING] : FOUR_STRING

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MicTuner strings={strings} />
      <ReferenceTones
        strings={strings}
        fiveString={fiveString}
        onFiveStringChange={setFiveString}
      />
    </div>
  )
}

function MicTuner({ strings }: { strings: BassString[] }) {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [reading, setReading] = useState<{ freq: number; name: string; octave: number; cents: number } | null>(null)
  const cleanup = useRef<() => void>(() => {})

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
    }
    return () => cleanup.current()
  }, [])

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const ctx = await getAudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 500
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 8192
      source.connect(lowpass).connect(analyser)

      const buf = new Float32Array(analyser.fftSize)
      const history: number[] = []
      let raf = 0
      let silentFrames = 0

      const tick = () => {
        analyser.getFloatTimeDomainData(buf)
        const freq = detectPitch(buf, ctx.sampleRate)
        if (freq) {
          silentFrames = 0
          history.push(freq)
          if (history.length > 5) history.shift()
          const median = [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)]
          const d = describeFrequency(median)
          setReading({ freq: median, name: d.name, octave: d.octave, cents: d.cents })
        } else if (++silentFrames > 45) {
          history.length = 0
          setReading(null)
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
      setStatus('listening')

      cleanup.current = () => {
        cancelAnimationFrame(raf)
        source.disconnect()
        stream.getTracks().forEach((t) => t.stop())
      }
    } catch (err) {
      setStatus(err instanceof DOMException && err.name === 'NotFoundError' ? 'unsupported' : 'denied')
    }
  }

  function stop() {
    cleanup.current()
    cleanup.current = () => {}
    setReading(null)
    setStatus('idle')
  }

  const closest = reading
    ? strings.reduce((best, s) =>
        Math.abs(Math.log2(reading.freq / s.freq)) < Math.abs(Math.log2(reading.freq / best.freq))
          ? s
          : best,
      )
    : null
  const cents = reading?.cents ?? 0
  const inTune = reading !== null && Math.abs(cents) <= 5
  const unavailable = status === 'unsupported' || status === 'denied'

  return (
    <section aria-labelledby="mic-tuner" className="flex flex-col rounded-3xl border bg-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="mic-tuner" className="text-xl font-semibold">
            Listen &amp; tune
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Pluck one open string at a time near your device’s microphone.
          </p>
        </div>
        <Mic className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {unavailable ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl bg-secondary px-6 py-10 text-center">
          <MicOff className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-medium">
            {status === 'denied' ? 'Microphone access is turned off' : 'No microphone available'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-pretty text-muted-foreground">
            No problem — use the reference tones to tune by ear. Play the tone and adjust your
            string until they sound the same.
          </p>
          {status === 'denied' && (
            <Button variant="outline" className="mt-4 h-11" onClick={start}>
              Try again
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className="mt-6 flex flex-1 flex-col items-center justify-center py-4"
            aria-live="polite"
          >
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'font-mono text-8xl font-semibold tracking-tight transition-colors',
                  !reading && 'text-muted-foreground/40',
                  reading && (inTune ? 'text-success' : 'text-primary'),
                )}
              >
                {reading?.name ?? '–'}
              </span>
              {reading && (
                <span className="font-mono text-2xl text-muted-foreground">{reading.octave}</span>
              )}
            </div>
            <p className="mt-1 h-6 text-sm text-muted-foreground">
              {reading
                ? inTune
                  ? 'In tune!'
                  : cents < 0
                    ? `Flat by ${Math.abs(cents)} cents — tighten`
                    : `Sharp by ${cents} cents — loosen`
                : status === 'listening'
                  ? 'Listening… pluck a string'
                  : 'Tap start to use the microphone'}
            </p>

            <div className="relative mt-6 h-16 w-full max-w-md" aria-hidden="true">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
              <div className="absolute left-1/2 top-1/2 h-2 w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/30" />
              {[-50, -25, 0, 25, 50].map((c) => (
                <span
                  key={c}
                  className="absolute bottom-0 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                  style={{ left: `${50 + c}%` }}
                >
                  {c > 0 ? `+${c}` : c}
                </span>
              ))}
              <div
                className={cn(
                  'absolute top-1 h-10 w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-100',
                  !reading ? 'bg-muted-foreground/30' : inTune ? 'bg-success' : 'bg-primary',
                )}
                style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
              />
            </div>

            {reading && (
              <p className="mt-4 font-mono text-sm tabular-nums text-muted-foreground">
                {reading.freq.toFixed(1)} Hz
                {closest && ` · closest string: ${closest.note}`}
              </p>
            )}
          </div>

          <Button
            size="lg"
            variant={status === 'listening' ? 'outline' : 'default'}
            className="mt-4 h-14 text-base"
            onClick={status === 'listening' ? stop : start}
          >
            {status === 'listening' ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {status === 'listening' ? 'Stop listening' : 'Start tuner'}
          </Button>
        </>
      )}
    </section>
  )
}

function ReferenceTones({
  strings,
  fiveString,
  onFiveStringChange,
}: {
  strings: BassString[]
  fiveString: boolean
  onFiveStringChange: (v: boolean) => void
}) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [octaveUp, setOctaveUp] = useState(false)
  const voice = useRef<{ stop: () => void } | null>(null)

  useEffect(() => () => voice.current?.stop(), [])

  function stop() {
    voice.current?.stop()
    voice.current = null
    setPlaying(null)
  }

  async function play(s: BassString) {
    const key = `${s.note}${s.octave}`
    if (playing === key) return stop()
    voice.current?.stop()

    const ctx = await getAudioContext()
    const f = s.freq * (octaveUp ? 2 : 1)
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.04)
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.6)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = Math.min(2400, f * 10)
    filter.Q.value = 0.7

    // A bright harmonic-rich tone keeps low notes audible on small tablet speakers.
    const saw = ctx.createOscillator()
    saw.type = 'sawtooth'
    saw.frequency.value = f
    const sawGain = ctx.createGain()
    sawGain.gain.value = 0.5
    const sine = ctx.createOscillator()
    sine.frequency.value = f
    const sineGain = ctx.createGain()
    sineGain.gain.value = 0.7

    saw.connect(sawGain).connect(filter)
    sine.connect(sineGain).connect(filter)
    filter.connect(master).connect(ctx.destination)
    saw.start(now)
    sine.start(now)

    const autoStop = window.setTimeout(stop, 12000)
    voice.current = {
      stop: () => {
        window.clearTimeout(autoStop)
        const t = ctx.currentTime
        master.gain.cancelScheduledValues(t)
        master.gain.setValueAtTime(master.gain.value, t)
        master.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
        saw.stop(t + 0.2)
        sine.stop(t + 0.2)
      },
    }
    setPlaying(key)
  }

  return (
    <section
      aria-labelledby="ref-tones"
      className="flex flex-col rounded-3xl border bg-card p-6 md:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="ref-tones" className="text-xl font-semibold">
            Reference tones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Standard tuning. Tap a string to hear its note, tap again to stop.
          </p>
        </div>
        <Volume2 className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {strings.map((s, i) => {
          const key = `${s.note}${s.octave}`
          const active = playing === key
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => play(s)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition-colors md:p-4',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:border-primary/50',
                )}
              >
                <span
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-xl font-mono text-3xl font-semibold',
                    active ? 'bg-primary-foreground/15' : 'bg-secondary',
                  )}
                >
                  {s.note}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">
                    {s.note}
                    {s.octave} · {(s.freq * (octaveUp ? 2 : 1)).toFixed(2)} Hz
                  </span>
                  <span
                    className={cn(
                      'block text-sm',
                      active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn('rounded-full bg-current opacity-60', active && 'animate-pulse')}
                  style={{ width: '40%', maxWidth: 140, height: 2 + (strings.length - i) }}
                />
                {active && <Square className="size-5 shrink-0 fill-current" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex flex-col gap-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Play one octave higher</span>
            <span className="block text-xs text-muted-foreground">
              Easier to hear on tablet or laptop speakers
            </span>
          </span>
          <input
            type="checkbox"
            checked={octaveUp}
            onChange={(e) => {
              stop()
              setOctaveUp(e.target.checked)
            }}
            className="size-5 cursor-pointer accent-primary"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
          <span className="text-sm font-medium">5-string bass (add low B)</span>
          <input
            type="checkbox"
            checked={fiveString}
            onChange={(e) => {
              stop()
              onFiveStringChange(e.target.checked)
            }}
            className="size-5 cursor-pointer accent-primary"
          />
        </label>
      </div>
    </section>
  )
}
