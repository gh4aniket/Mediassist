const configs = {
  pending: { bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
  matched: { bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Matched' },
  'en-route': { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', label: 'En Route', pulse: true },
  arrived: { bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Arrived' },
  completed: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Completed' },
  cancelled: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', label: 'Cancelled' },
  active: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Active', pulse: true },
  available: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Available', pulse: true },
  busy: { bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Busy' },
  offline: { bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: 'Offline' },
  inactive: { bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: 'Inactive' },
  'on-leave': { bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', label: 'On Leave' },
  verified: { bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Verified' },
  critical: { bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Critical', pulse: true },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = configs[status?.toLowerCase()] || configs.pending
  const textSize = size === 'xs' ? 'text-xs' : 'text-xs'
  const px = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${textSize} ${px} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'live-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}
