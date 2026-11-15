import type { Metadata } from 'next'
import { AccountSettings } from '@/components/account-settings'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Account — Low End' }

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account" description="Update your details or sign out." />
      <AccountSettings />
    </>
  )
}
