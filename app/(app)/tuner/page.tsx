import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Tuner } from '@/components/tuner'

export const metadata: Metadata = { title: 'Tuner — Low End' }

export default function TunerPage() {
  return (
    <>
      <PageHeader
        title="Tuner"
        description="Standard bass tuning, low to high: E · A · D · G."
      />
      <Tuner />
    </>
  )
}
