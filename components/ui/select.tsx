import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:bg-zinc-50 dark:disabled:bg-zinc-700 disabled:text-zinc-500',
            error && 'border-red-400',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
