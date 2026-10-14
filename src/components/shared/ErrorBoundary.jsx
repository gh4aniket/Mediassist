import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Catches render errors so a single bad payload shows a readable message
 * instead of white-screening the whole app. In development the stack is shown
 * inline, which is where you actually want it.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ui] render error:', error, info?.componentStack)
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                Something broke while rendering this page
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                The rest of MediAssist is fine — reload to get back to work.
              </p>
            </div>
          </div>

          <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
            {error.message}
          </p>

          {import.meta.env?.DEV && info?.componentStack && (
            <pre className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 max-h-56 overflow-auto whitespace-pre-wrap">
              {error.stack}
              {'\n'}
              {info.componentStack}
            </pre>
          )}

          <button
            onClick={() => window.location.assign('/')}
            className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reload MediAssist
          </button>
        </div>
      </div>
    )
  }
}
