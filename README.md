# Low End — Bass Practice

A practice app for young bass players: slow-down video playback for assignments, a metronome, and a tuner — all in one place.

## Features

- **Practice assignments** — save a YouTube link with a title and notes from your teacher. Play it back at 25%–200% speed, nudge ±5 seconds, and set an A–B loop to drill one section on repeat. Track which assignments you've practiced each day and archive ones you've finished.
- **Metronome** — 30–240 BPM with tap tempo, quick-tempo presets, selectable beats per bar, and an accented first beat.
- **Tuner** — listen through your mic for pitch detection tuned to the bass range, or play reference tones for a standard 4-string or 5-string (low B) setup.
- **Accounts** — simple local sign-up/sign-in so multiple players on the same device can keep separate assignment lists.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- [@base-ui/react](https://base-ui.com) components in the shadcn `base-nova` style, icons from `lucide-react`
- No backend — everything runs client-side and persists in the browser's `localStorage`

## Getting started

Requires Node and [pnpm](https://pnpm.io) (pinned to `pnpm@12.3.4` via `packageManager`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). It'll redirect to sign-in — create an account to get started.

Other scripts:

```bash
pnpm build   # production build
pnpm start   # serve the production build
```

## How it works

- **No server, no database.** User accounts, sessions, and assignments are all stored in `localStorage` in the browser. There's nothing to deploy beyond the static/SSR Next.js app, and data doesn't sync across devices or browsers.
- **Mic access** is needed for the tuner's pitch detection; it's only requested when you open that tool, and declining it still leaves the reference-tone tuner usable.
- **Dark mode** follows your OS/browser color scheme automatically — there's no in-app toggle.

See `CLAUDE.md` for a deeper look at the architecture.
