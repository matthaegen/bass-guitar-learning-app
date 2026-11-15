let ctx: AudioContext | null = null

export async function getAudioContext() {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function describeFrequency(freq: number) {
  const midi = 69 + 12 * Math.log2(freq / 440)
  const nearest = Math.round(midi)
  const cents = Math.round((midi - nearest) * 100)
  return {
    name: NOTE_NAMES[((nearest % 12) + 12) % 12],
    octave: Math.floor(nearest / 12) - 1,
    cents,
    midi: nearest,
  }
}

/** Autocorrelation pitch detection tuned for the bass range (~28–420 Hz). */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length
  let rms = 0
  for (let i = 0; i < size; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.008) return null

  const minLag = Math.floor(sampleRate / 420)
  const maxLag = Math.min(Math.floor(sampleRate / 28), Math.floor(size / 2))
  const n = size - maxLag

  const corr = new Float32Array(maxLag + 1)
  let energy0 = 0
  for (let i = 0; i < n; i++) energy0 += buf[i] * buf[i]

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    let energyLag = 0
    for (let i = 0; i < n; i++) {
      sum += buf[i] * buf[i + lag]
      energyLag += buf[i + lag] * buf[i + lag]
    }
    corr[lag] = sum / Math.sqrt(energy0 * energyLag || 1)
  }

  let best = -1
  let bestLag = -1
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corr[lag] > best) {
      best = corr[lag]
      bestLag = lag
    }
  }
  if (best < 0.6 || bestLag <= minLag || bestLag >= maxLag) return null

  // Prefer the shortest lag that is nearly as strong, to avoid octave-down errors.
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (corr[lag] > best * 0.92 && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag
      break
    }
  }

  const y1 = corr[bestLag - 1]
  const y2 = corr[bestLag]
  const y3 = corr[bestLag + 1]
  const denom = y1 - 2 * y2 + y3
  const shift = denom ? (0.5 * (y1 - y3)) / denom : 0
  return sampleRate / (bestLag + shift)
}
