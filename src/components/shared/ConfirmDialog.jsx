import { AlertTriangle, Info } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}) {
  const variants = {
    default: { btn: 'bg-primary hover:bg-primary-dark text-white', icon: <Info className="w-10 h-10 text-cyan-500" />, ring: 'bg-cyan-50' },
    danger: { btn: 'bg-red-600 hover:bg-red-700 text-white', icon: <AlertTriangle className="w-10 h-10 text-red-500" />, ring: 'bg-red-50' },
    warning: { btn: 'bg-amber-500 hover:bg-amber-600 text-white', icon: <AlertTriangle className="w-10 h-10 text-amber-500" />, ring: 'bg-amber-50' },
  }
  const v = variants[variant] || variants.default

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" hideClose>
      <div className="p-6 text-center">
        <div className={`w-20 h-20 rounded-full ${v.ring} flex items-center justify-center mx-auto mb-4`}>
          {v.icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${v.btn}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
