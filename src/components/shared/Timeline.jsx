import { CheckCircle, Clock, Circle } from 'lucide-react'

const STATUSES = ['Pending', 'Matched', 'En Route', 'Arrived', 'Completed']

function statusIndex(status) {
  const map = { pending: 0, matched: 1, 'en-route': 2, arrived: 3, completed: 4 }
  return map[status?.toLowerCase()] ?? -1
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Timeline({ currentStatus, timeline = [] }) {
  const currentIdx = statusIndex(currentStatus)

  const getEntry = (status) => timeline.find((t) => t.status === status)

  return (
    <div className="space-y-0">
      {STATUSES.map((status, idx) => {
        const entry = getEntry(status)
        const isDone = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isPending = idx > currentIdx
        const isLast = idx === STATUSES.length - 1

        return (
          <div key={status} className="flex gap-4">
            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-slate-200 text-slate-300'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 h-8 mt-0.5 ${isDone ? 'bg-emerald-200' : 'bg-slate-100'}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-center justify-between">
                <p
                  className={`text-sm font-semibold ${
                    isDone ? 'text-emerald-700' : isCurrent ? 'text-primary' : 'text-slate-400'
                  }`}
                >
                  {status}
                </p>
                {entry?.time && (
                  <span className="text-xs text-slate-400">{formatTime(entry.time)}</span>
                )}
              </div>
              {entry?.description && (
                <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
              )}
              {!entry && isCurrent && (
                <p className="text-xs text-slate-400 mt-0.5">In progress...</p>
              )}
              {!entry && isPending && (
                <p className="text-xs text-slate-300 mt-0.5">Waiting...</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
