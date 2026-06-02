'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RANGE_OPTIONS, DEFAULT_RANGE } from '@/lib/date-range'
import type { RangeValue } from '@/lib/date-range'

export { RANGE_OPTIONS, DEFAULT_RANGE }
export type { RangeValue }

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
