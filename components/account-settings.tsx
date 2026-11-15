'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/components/app-provider'

type Notice = { kind: 'ok' | 'error'; text: string } | null

function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null
  return (
    <p
      role={notice.kind === 'error' ? 'alert' : 'status'}
      className={notice.kind === 'error' ? 'text-sm text-destructive' : 'text-sm text-success'}
    >
      {notice.text}
    </p>
  )
}

export function AccountSettings() {
  const { user, updateName, changePassword, signOut, deleteAccount } = useApp()
  const router = useRouter()
  const [profileNotice, setProfileNotice] = useState<Notice>(null)
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null)

  if (!user) return null

  function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
    if (!name) return setProfileNotice({ kind: 'error', text: 'Your name can’t be empty.' })
    updateName(name)
    setProfileNotice({ kind: 'ok', text: 'Saved.' })
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const current = String(form.get('current') ?? '')
    const next = String(form.get('next') ?? '')
    if (next.length < 8)
      return setPasswordNotice({ kind: 'error', text: 'New password needs at least 8 characters.' })
    if (next !== String(form.get('confirm') ?? ''))
      return setPasswordNotice({ kind: 'error', text: 'New passwords don’t match.' })
    const ok = await changePassword(current, next)
    if (!ok) return setPasswordNotice({ kind: 'error', text: 'Your current password is incorrect.' })
    formEl.reset()
    setPasswordNotice({ kind: 'ok', text: 'Password updated.' })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="acct-name">Name</Label>
          <Input
            id="acct-name"
            name="name"
            defaultValue={user.name}
            autoComplete="name"
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="acct-email">Email</Label>
          <Input
            id="acct-email"
            value={user.email}
            readOnly
            className="h-12 bg-muted text-base text-muted-foreground"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Member since {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
        </p>
        <div className="flex items-center justify-between gap-3">
          <NoticeText notice={profileNotice} />
          <Button type="submit" className="ml-auto h-11 px-5">
            Save profile
          </Button>
        </div>
      </form>

      <form onSubmit={savePassword} className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            name="current"
            type="password"
            autoComplete="current-password"
            className="h-12 text-base"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pw-next">New password</Label>
            <Input
              id="pw-next"
              name="next"
              type="password"
              autoComplete="new-password"
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="h-12 text-base"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <NoticeText notice={passwordNotice} />
          <Button type="submit" className="ml-auto h-11 px-5">
            Update password
          </Button>
        </div>
      </form>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sign out</h2>
          <p className="text-sm text-muted-foreground">
            Your assignments stay saved for next time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              signOut()
              router.replace('/sign-in')
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
          <Button
            variant="ghost"
            className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (window.confirm('Delete your account and all of your assignments? This can’t be undone.')) {
                deleteAccount()
                router.replace('/sign-in')
              }
            }}
          >
            Delete account
          </Button>
        </div>
      </section>
    </div>
  )
}
