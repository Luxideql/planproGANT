import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number // 0-100
  className?: string
  color?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function Progress({ value, className, color, showLabel, size = 'md' }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  const barColor = color ?? (pct >= 80 ? '#10B981' : pct >= 50 ? '#3B82F6' : '#F59E0B')

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex-1 rounded-full bg-zinc-100 overflow-hidden',
        size === 'sm' ? 'h-1.5' : 'h-2',
      )}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-zinc-500 tabular-nums w-8 text-right">{pct}%</span>
      )}
    </div>
  )
}
