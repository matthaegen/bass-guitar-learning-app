'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/components/app-provider'
import { cn } from '@/lib/utils'

type Mode = 'sign-in' | 'sign-up'

export function AuthForm() {
  const { ready, user, signIn, signUp } = useApp()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace('/practice')
  }, [ready, user, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()
    setError(null)

    if (mode === 'sign-up') {
      if (!name) return setError('Please add your name.')
      if (password.length < 8) return setError('Passwords need at least 8 characters.')
      if (password !== String(form.get('confirm') ?? ''))
        return setError('Those passwords don’t match.')
    }

    setPending(true)
    try {
      if (mode === 'sign-in') {
        const ok = await signIn(email, password)
        if (!ok) setError('That email and password combination didn’t work.')
      } else {
        await signUp(name, email, password)
      }
    } catch {
      setError(
        mode === 'sign-up'
          ? 'We couldn’t create that account. Try signing in instead.'
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div
        role="tablist"
        aria-label="Account"
        className="mb-8 grid grid-cols-2 rounded-xl bg-secondary p-1"
      >
        {(['sign-in', 'sign-up'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={cn(
              'h-11 rounded-lg text-sm font-medium transition-colors',
              mode === m
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <h1 className="text-balance text-3xl font-semibold tracking-tight">
        {mode === 'sign-in' ? 'Welcome back. Ready to groove?' : 'Start your bass journey'}
      </h1>
      <p className="mt-2 text-pretty text-muted-foreground">
        {mode === 'sign-in'
          ? 'Sign in to see this week’s practice assignments.'
          : 'Make an account to keep track of your practice assignments.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        {mode === 'sign-up' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" className="h-12 text-base" required />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-12 text-base"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className="h-12 text-base"
            required
          />
          {mode === 'sign-up' && (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          )}
        </div>
        {mode === 'sign-up' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="h-12 text-base"
              required
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending || !ready}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </div>
  )
}
