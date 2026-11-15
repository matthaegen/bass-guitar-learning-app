import { cn } from '@/lib/utils'

export function BrandMark({
  tone = 'dark',
  compact = false,
}: {
  tone?: 'dark' | 'light'
  compact?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-mono text-lg font-bold text-primary-foreground"
      >
        LE
      </span>
      <span
        className={cn(
          'text-lg font-semibold tracking-tight',
          tone === 'light' ? 'text-sidebar-foreground' : 'text-foreground',
          compact && 'sr-only',
        )}
      >
        Low End
      </span>
    </div>
  )
}
