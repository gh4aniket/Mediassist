import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Users, Clock, TrendingUp, Edit, AlertCircle, Activity, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StatCard, { BedStatCard } from '../../components/shared/StatCard'
import { PageLoader } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import { hospitalApi } from '../../services'

const updateIcons = { bed: BedDouble, staff: Users, doctor: Activity, profile: Building2 }

export default function HospitalDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchSummary = useCallback(
    (signal) => (user?.hospitalId ? hospitalApi.summary(user.hospitalId, { signal }) : null),
    [user?.hospitalId],
  )

  const { data, loading, error } = useApiResource(fetchSummary, [user?.hospitalId], {
    enabled: Boolean(user?.hospitalId),
  })

  if (!user?.hospitalId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 mb-1">No hospital linked</h3>
        <p className="text-sm text-slate-500">
          Your staff account is not attached to a hospital yet. Ask an administrator to link it, or
          create the hospital record from the administration page.
        </p>
      </div>
    )
  }

  if (loading) return <PageLoader message="Loading hospital dashboard..." />

  if (error || !data) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load the dashboard</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  const { hospital, stats, recentUpdates } = data
  const minutesAgo = stats.lastUpdatedMinutesAgo ?? 0
  const lowCapacity = stats.totalBeds > 0 && stats.availableBeds < stats.totalBeds * 0.15

  const quickActions = [
    { label: 'Update Bed Availability', icon: BedDouble, to: '/hospital/bed-availability', color: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100' },
    { label: 'Manage Hospital Profile', icon: Edit, to: '/hospital/admin', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
    { label: 'Manage Staff', icon: Users, to: '/hospital/staff', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#0c1220] to-[#0e3a52] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-primary/20 rounded-full -translate-y-16 translate-x-16" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm mb-1">Welcome back,</p>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{user?.name}</h2>
              <p className="text-slate-300 text-sm mt-1">{hospital.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Last capacity update</p>
              <p className="text-sm font-medium text-slate-200">{minutesAgo}m ago</p>
            </div>
          </div>
          {lowCapacity && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5 w-fit">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span className="text-sm font-medium text-red-100">Low bed availability — update immediately</span>
            </div>
          )}
          {!hospital.coordinates && (
            <button
              onClick={() => navigate('/hospital/settings')}
              className="mt-4 flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-2.5 w-fit hover:bg-amber-500/30 transition-colors"
            >
              <AlertCircle className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium text-amber-100">
                Map location not set — patients cannot route to you. Set it in Settings.
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BedDouble} label="Total Beds" value={stats.totalBeds} color="primary" />
        <StatCard icon={BedDouble} label="Available" value={stats.availableBeds} color="success" />
        <StatCard
          icon={TrendingUp}
          label="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          color={stats.occupancyRate > 85 ? 'danger' : 'warning'}
        />
        <StatCard icon={Users} label="Active Staff" value={stats.activeStaff} color="slate" />
      </div>

      {/* Bed availability breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Bed Availability</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Updated {minutesAgo}m ago
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <BedStatCard type="icu" total={hospital.beds?.icu?.total ?? 0} available={hospital.beds?.icu?.available ?? 0} />
          <BedStatCard type="general" total={hospital.beds?.general?.total ?? 0} available={hospital.beds?.general?.available ?? 0} />
          <BedStatCard type="emergency" total={hospital.beds?.emergency?.total ?? 0} available={hospital.beds?.emergency?.available ?? 0} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map(({ label, icon: Icon, to, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${color}`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Recent Updates</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 shadow-sm">
            {recentUpdates.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                No changes recorded yet — bed and staff updates will appear here.
              </p>
            ) : (
              recentUpdates.map((update) => {
                const Icon = updateIcons[update.type] || Activity
                return (
                  <div key={update.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{update.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{update.time}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Hospital info summary */}
          <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-600">{hospital.name}</h3>
              {hospital.verified && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-pulse" />Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{hospital.address || 'No address on file'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.doctorCount} doctor{stats.doctorCount === 1 ? '' : 's'} · {stats.totalStaff} staff member
              {stats.totalStaff === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => navigate('/hospital/admin')}
                className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium"
              >
                <Edit className="w-3 h-3" /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
