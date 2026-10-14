import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ambulance, Navigation, Building2, Bot, ClipboardList, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/shared/StatCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import { activityApi, bookingApi, medicalProfileApi } from '../../services'

const activityIcons = { ambulance: Ambulance, profile: ClipboardList, hospital: Building2 }

function ProfileCompletion({ completeness }) {
  const fields = completeness?.fields || []
  const pct = completeness?.percent ?? 0

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Profile Completeness</h3>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-xs">
            <CheckCircle className={`w-3.5 h-3.5 ${f.done ? 'text-emerald-500' : 'text-slate-200'}`} />
            <span className={f.done ? 'text-slate-600' : 'text-slate-400'}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // One call per panel — each renders as soon as its own data lands.
  const loadOverview = useCallback(
    () =>
      Promise.all([
        bookingApi.myStats(),
        bookingApi.active(),
        medicalProfileApi.me(),
        medicalProfileApi.completeness(),
        activityApi.mine(6),
      ]).then(([stats, activeRequest, profile, completeness, activity]) => ({
        stats,
        activeRequest,
        profile,
        completeness,
        activity,
      })),
    [],
  )

  const { data, loading, error } = useApiResource(loadOverview, [])

  if (loading) return <PageLoader message="Loading your dashboard..." />

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 mb-1">Could not load your dashboard</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const { stats, activeRequest, profile, completeness, activity } = data

  const quickActions = [
    { label: 'Request Ambulance', icon: Ambulance, to: '/patient/request-ambulance', color: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100', desc: 'Emergency dispatch' },
    { label: 'Live Tracking', icon: Navigation, to: '/patient/live-tracking', color: 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100', desc: 'Track your ride' },
    { label: 'Find Hospitals', icon: Building2, to: '/patient/hospitals', color: 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100', desc: 'Bed availability' },
    { label: 'AI Assistant', icon: Bot, to: '/patient/ai-assistant', color: 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100', desc: 'Health guidance' },
  ]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#0c1220] to-[#0e3a52] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-primary/20 rounded-full -translate-y-10 translate-x-10" />
        <div className="relative z-10">
          <p className="text-sm text-slate-300 mb-1">{greeting()},</p>
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-300 text-sm">Your health, coordinated.</p>
          {activeRequest && (
            <div className="mt-4 flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-3 w-fit">
              <span className="w-2 h-2 bg-cyan-400 rounded-full live-pulse" />
              <span className="text-sm font-medium">
                Active request{activeRequest.eta ? ` — ETA ${activeRequest.eta}` : ' — finding a driver'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Ambulance} label="Total Requests" value={stats.total} color="primary" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="success" />
        <StatCard icon={Clock} label="Avg Response" value={stats.avgResponseLabel} color="warning" />
        <StatCard
          icon={Activity}
          label="Health Score"
          value={completeness.percent >= 80 ? 'Good' : 'Needs Info'}
          sub={`Profile ${completeness.percent}% complete`}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon: Icon, to, color, desc }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left hover:-translate-y-0.5 hover:shadow-md ${color}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-70">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Active Request Banner */}
          {activeRequest && (
            <div className="mt-4 bg-cyan-50 border border-cyan-200 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={activeRequest.status} />
                    <span className="text-xs text-slate-500">#{activeRequest.id.slice(-6)}</span>
                  </div>
                  {activeRequest.driver ? (
                    <>
                      <p className="text-sm font-semibold text-slate-800">{activeRequest.driver.name}</p>
                      <p className="text-xs text-slate-500">
                        {activeRequest.driver.vehicleId}
                        {activeRequest.eta ? ` · ETA ${activeRequest.eta}` : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-800">Finding a nearby ambulance</p>
                      <p className="text-xs text-slate-500">
                        We have alerted every available driver — hang tight.
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => navigate('/patient/live-tracking')}
                  className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Track Live
                </button>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Recent Activity</h2>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 shadow-sm">
              {activity.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-400">
                  No activity yet — your requests and profile updates will show up here.
                </p>
              ) : (
                activity.map((item) => {
                  const Icon = activityIcons[item.icon] || Activity
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">{item.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <ProfileCompletion completeness={completeness} />

          {/* Medical snapshot */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Medical Snapshot</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Blood Group</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {profile.bloodGroup || '—'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500">Allergies</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {profile.allergies?.length ? (
                    profile.allergies.slice(0, 2).map((a) => (
                      <span key={a} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{a}</span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None recorded</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500">Conditions</span>
                <div className="text-right">
                  {profile.conditions?.length ? (
                    <>
                      <p className="text-xs text-slate-700">{profile.conditions[0]}</p>
                      {profile.conditions.length > 1 && (
                        <p className="text-xs text-slate-400">+{profile.conditions.length - 1} more</p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">None recorded</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/patient/medical-profile')}
              className="w-full mt-4 py-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl transition-colors"
            >
              View Full Profile
            </button>
          </div>

          {/* Emergency contacts */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-800">Emergency Contacts</h3>
            </div>
            {profile.emergencyContacts?.length ? (
              profile.emergencyContacts.map((c) => (
                <div key={c.id} className="text-xs mb-2">
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-slate-500">{c.relationship} · {c.phone}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-red-700">
                No emergency contact on file — add one so responders can reach someone for you.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
