const colorMap = {
  primary: '#FB3D78',
  positive: '#10b981',
  negative: '#f43f5e',
  warning: '#f59e0b',
  muted: '#64748b',
}

export default function MetricCard({
  label,
  value,
  sub,
  color = 'muted',
}: {
  label: string
  value: string
  sub?: string
  color?: keyof typeof colorMap
}) {
  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <div className="text-xs font-medium text-[#64748b] mb-3 uppercase tracking-wider">{label}</div>
      <div
        className="text-3xl font-bold mb-1 tabular-nums"
        style={{ color: colorMap[color] }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[#475569]">{sub}</div>}
    </div>
  )
}
