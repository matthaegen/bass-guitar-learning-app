# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install        # pnpm is pinned via packageManager (pnpm@12.3.4)
pnpm dev            # next dev
pnpm build          # next build
pnpm start          # serve the production build
pnpm exec tsc --noEmit   # the only way to catch type errors (see below)
```

There is no linter, formatter, or test suite configured — no `lint`/`test` script, no ESLint/Biome/Prettier/Vitest config. Don't invent commands for them; verify changes with `tsc --noEmit` and by running the app.

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `pnpm build` passes with broken types. Always run `pnpm exec tsc --noEmit` after touching TypeScript.

## What this app is

"Low End" — a bass practice app aimed at young players. Three tools: practice assignments built around a YouTube video with slow-down/A-B-loop playback, a metronome, and a tuner. Everything runs client-side; there is no backend, no API routes, and no database.

## Architecture

**Everything persists in `localStorage`.** `lib/local-store.ts` is the entire data layer: users (keyed by lowercased email under `lowend.users.v1`), the current session (`lowend.session.v1`), and per-user assignments (`lowend.assignments.v1.<userId>`). Passwords are PBKDF2-SHA256 (150k iterations, per-user salt) via WebCrypto — this is obfuscation only, since the hashes sit in the same browser as the app; don't present it as real auth. `normalizeAssignment` migrates older shapes (e.g. the former `done` flag → `archived`), so add new `Assignment` fields with a default there rather than assuming stored records have them.

**`components/app-provider.tsx` is the single source of truth for app state.** A client-side React context wraps the whole tree in `app/layout.tsx` and exposes `user`, `assignments`, and every mutation. Components call `useApp()`; they should not import from `lib/local-store` for reads/writes — only for types and pure helpers (`todayKey`, `parseYouTubeId`). Every mutation goes through `persistAssignments`, which updates state and writes localStorage together. `ready` is false until the stored session has been read on mount — needed because nothing is known during SSR.

**Auth gating is client-side only.** `app/(app)/layout.tsx` renders `components/app-shell.tsx`, which shows a spinner while `!ready` and `router.replace('/sign-in')` once ready with no user. Pages under `app/(app)/` inherit that plus the sidebar/bottom-nav chrome; `/sign-in` sits outside the group. `app/page.tsx` redirects to `/practice`. The nav list lives in one `NAV` array in `app-shell.tsx` — add routes there.

**Audio is shared through one `AudioContext`.** `lib/audio.ts` lazily creates and resumes a module-level singleton (`getAudioContext()`), with webkit fallback; it must be called from a user gesture. It also holds `describeFrequency` (frequency → note/octave/cents) and `detectPitch`, a normalized autocorrelation detector deliberately band-limited to ~28–420 Hz with a shortest-near-equal-lag pass to avoid octave-down errors — if you touch it, test against the low B (30.87 Hz) and open G (98 Hz).

- `components/metronome.tsx` uses the standard lookahead scheduler: oscillator clicks scheduled on the audio clock ~120 ms ahead by a `setTimeout` loop, with a separate `requestAnimationFrame` loop draining a queue to drive the beat lights. Live tempo/meter/accent are read from a ref (`settings.current`) so changes apply without restarting the scheduler.
- `components/tuner.tsx` lowpasses the mic at 500 Hz, runs an 8192-point analyser, and median-filters the last 5 readings. Mic access is granted by `Permissions-Policy: microphone=(self)` in `next.config.mjs`.

**The YouTube player wraps the IFrame API by hand** (`components/practice/youtube-player.tsx`). `loadYouTubeApi()` injects the script once and resolves a module-level promise, chaining any existing `onYouTubeIframeAPIReady`. The player is created into a throwaway child div so cleanup can wipe the mount node; the A-B loop is polled every 150 ms and kept in a ref so the interval sees current values. Playback rate is clamped to 0.25–2.

## Conventions

- Next.js 16 App Router, React 19, TypeScript `strict`, `@/*` → repo root.
- Tailwind v4 via `@tailwindcss/postcss` — no `tailwind.config`. Theme tokens are OKLCH CSS variables in `app/globals.css`, mapped to utilities in `@theme inline`. Use semantic tokens (`bg-card`, `text-muted-foreground`, `bg-sidebar`), not raw colors.
- Dark mode follows `prefers-color-scheme` only; there is no toggle. The token block is duplicated under `.dark` and under `@media (prefers-color-scheme: dark) :root:not(.light)`, so a token change must be made in both places (plus `:root`).
- UI primitives in `components/ui/` are shadcn `base-nova` style built on **`@base-ui/react`**, not Radix — `components.json` governs `shadcn add`. Icons are `lucide-react`.
- The audience is kids, mostly on phones: controls are large (`h-12`+ hit targets), copy is plain-language, and accessibility is explicit throughout (`aria-label` on icon buttons, `aria-pressed` on toggles, `aria-live` on readouts, `aria-hidden` on decorative icons). Match that when adding UI.
- No semicolons, single quotes, 2-space indent, 100-col-ish lines. Forms use uncontrolled inputs + `FormData` with a single `error` string rendered in a `role="alert"` paragraph (see `components/practice/assignment-form.tsx`).
