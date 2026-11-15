import type { Metadata } from 'next'
import { Metronome } from '@/components/metronome'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Metronome — Low End' }

export default function MetronomePage() {
  return (
    <>
      <PageHeader title="Metronome" description="Lock in with the click. Keep it steady." />
      <Metronome />
    </>
  )
}
