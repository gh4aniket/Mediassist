import { Search, FileText, AlertCircle, Inbox } from 'lucide-react'

const presets = {
  search: { Icon: Search, title: 'No results found', desc: 'Try adjusting your search or filter criteria.' },
  requests: { Icon: Inbox, title: 'No requests yet', desc: 'Your ambulance request history will appear here.' },
  staff: { Icon: FileText, title: 'No staff found', desc: 'No staff members match your search criteria.' },
  doctors: { Icon: FileText, title: 'No doctors listed', desc: 'No doctors have been added to this hospital yet.' },
  generic: { Icon: FileText, title: 'Nothing here yet', desc: 'Content will appear here once available.' },
  error: { Icon: AlertCircle, title: 'Something went wrong', desc: 'Unable to load content. Please try again.' },
}

export default function EmptyState({ preset = 'generic', title, desc, action, actionLabel = 'Take Action' }) {
  const p = presets[preset] || presets.generic
  const { Icon } = p
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title || p.title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-5">{desc || p.desc}</p>
      {action && (
        <button
          onClick={action}
          className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
