export const RANGE_OPTIONS = [
  { label: 'Last 7 days',   value: '7'   },
  { label: 'Last 30 days',  value: '30'  },
  { label: 'Last 90 days',  value: '90'  },
  { label: 'Last 6 months', value: '180' },
  { label: 'Last 1 year',   value: '365' },
] as const

export type RangeValue = typeof RANGE_OPTIONS[number]['value']
export const DEFAULT_RANGE: RangeValue = '30'

export function rangeLabel(value: RangeValue): string {
  return RANGE_OPTIONS.find((o) => o.value === value)?.label ?? 'Last 30 days'
}

export function sinceDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}
