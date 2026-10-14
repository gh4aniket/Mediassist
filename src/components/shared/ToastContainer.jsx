import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const icons = {
  success: <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />,
  info: <Info className="w-5 h-5 shrink-0 text-cyan-500" />,
}

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-900',
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter flex items-start gap-3 p-4 rounded-xl border shadow-lg ${styles[toast.type] || styles.info}`}
        >
          {icons[toast.type] || icons.info}
          <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="opacity-50 hover:opacity-100 transition-opacity mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
