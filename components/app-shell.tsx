'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AudioLines, ListMusic, Loader2, Timer, UserRound } from 'lucide-react'
import { useApp } from '@/components/app-provider'
import { BrandMark } from '@/components/brand-mark'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/practice', label: 'Practice', icon: ListMusic },
  { href: '/metronome', label: 'Metronome', icon: Timer },
  { href: '/tuner', label: 'Tuner', icon: AudioLines },
  { href: '/account', label: 'Account', icon: UserRound },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (ready && !user) router.replace('/sign-in')
  }, [ready, user, router])

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex lg:w-60">
        <div className="flex h-20 items-center justify-center px-4 lg:justify-start lg:px-6">
          <div className="lg:hidden">
            <BrandMark tone="light" compact />
          </div>
          <div className="hidden lg:block">
            <BrandMark tone="light" />
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-colors lg:flex-row lg:gap-3 lg:px-4 lg:text-sm',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )}
              >
                <Icon className="size-6 lg:size-5" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="hidden border-t border-sidebar-border px-6 py-5 lg:block">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center border-b px-5 md:hidden">
          <BrandMark />
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-3 text-xs font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-6" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
