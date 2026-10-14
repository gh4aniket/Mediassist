import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ icon: Icon, label, value, sub, color = 'primary', trend, onClick }) {
  const colors = {
    primary: { bg: 'bg-cyan-50', icon: 'text-primary bg-cyan-100', border: 'border-cyan-100' },
    success: { bg: 'bg-emerald-50', icon: 'text-emerald-700 bg-emerald-100', border: 'border-emerald-100' },
    warning: { bg: 'bg-amber-50', icon: 'text-amber-700 bg-amber-100', border: 'border-amber-100' },
    danger: { bg: 'bg-red-50', icon: 'text-red-700 bg-red-100', border: 'border-red-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600 bg-slate-100', border: 'border-slate-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-700 bg-purple-100', border: 'border-purple-100' },
  }
  const c = colors[color] || colors.primary

  return (
    <div
      className={`bg-white rounded-2xl p-5 border ${c.border} shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.icon}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
          {value}
        </p>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function BedStatCard({ type, total, available, color }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0
  const colors = {
    icu: { bar: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50 border-red-100', badge: 'bg-red-100 text-red-700' },
    general: { bar: 'bg-primary', text: 'text-primary', light: 'bg-cyan-50 border-cyan-100', badge: 'bg-cyan-100 text-cyan-700' },
    emergency: { bar: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700' },
  }
  const c = colors[color || type] || colors.general

  return (
    <div className={`bg-white rounded-2xl p-5 border ${c.light} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${c.badge}`}>
          {type === 'icu' ? 'ICU' : type === 'emergency' ? 'Emergency' : 'General'}
        </span>
        <span className="text-xs text-slate-500 font-medium">{pct}% free</span>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className={`text-3xl font-bold ${c.text}`} style={{ fontFamily: 'var(--font-display)' }}>
          {available}
        </span>
        <span className="text-slate-400 text-sm pb-1">/ {total} beds</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`${c.bar} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{available} beds available</p>
    </div>
  )
}
