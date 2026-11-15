import Image from 'next/image'
import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { BrandMark } from '@/components/brand-mark'

export const metadata: Metadata = { title: 'Sign in — Low End' }

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar md:block">
        <Image
          src="/images/bass-hero.png"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 45vw, 0px"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-10 text-sidebar-foreground">
          <BrandMark tone="light" />
          <blockquote className="max-w-sm">
            <p className="text-balance text-2xl font-medium leading-snug">
              Slow it down, lock in with the click, and play it again.
            </p>
            <p className="mt-3 text-sm text-sidebar-foreground/70">
              Practice assignments, metronome, and tuner — all in one place.
            </p>
          </blockquote>
        </div>
      </section>

      <section className="flex flex-col px-6 py-10 sm:px-10">
        <div className="md:hidden">
          <BrandMark />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <AuthForm />
        </div>
      </section>
    </main>
  )
}
