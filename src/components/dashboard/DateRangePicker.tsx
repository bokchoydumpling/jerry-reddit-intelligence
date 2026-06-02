'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export const RANGE_OPTIONS = [
  { label: 'Last 7 days',    value: '7'   },
  { label: 'Last 30 days',   value: '30'  },
  { label: 'Last 90 days',   value: '90'  },
  { label: 'Last 6 months',  value: '180' },
  { label: 'Last 1 year',    value: '365' },
] as const

export type RangeValue = typeof RANGE_OPTIONS[number]['value']
export const DEFAULT_RANGE: RangeValue = '30'

export default function DateRangePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = (searchParams.get('range') ?? DEFAULT_RANGE) as RangeValue

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-[#111927] border border-[#1e2d42] rounded-lg p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            current === opt.value
              ? 'bg-[#1c2a3e] text-[#FEFEFE]'
              : 'text-[#64748b] hover:text-[#94a3b8]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
