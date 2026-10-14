import { useCallback, useEffect, useState } from 'react'
import { Bell, Shield, Globe, Save, Loader2, MapPin, LocateFixed, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import MapContainer from '../../components/shared/MapContainer'
import { PageLoader } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import useGeolocation from '../../hooks/useGeolocation'
import { hospitalApi } from '../../services'

const DEFAULT_SETTINGS = {
  notifyLowBeds: true,
  lowBedThreshold: 10,
  notifyNewRequests: true,
  publicListing: true,
  showBedCounts: true,
  showDoctors: true,
  autoUpdateInterval: 30,
  timezone: 'America/New_York',
  language: 'en',
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function HospitalSettings() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const hospitalId = user?.hospitalId

  const { position, error: geoError, loading: locating, locate } = useGeolocation({ immediate: false })

  const fetchHospital = useCallback(
    (signal) => (hospitalId ? hospitalApi.get(hospitalId, { signal }) : null),
    [hospitalId],
  )
  const { data: hospital, loading, error, setData } = useApiResource(fetchHospital, [hospitalId], {
    enabled: Boolean(hospitalId),
  })

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [addressDraft, setAddressDraft] = useState('')

  useEffect(() => {
    if (!hospital) return
    setSettings({ ...DEFAULT_SETTINGS, ...(hospital.settings || {}) })
    setCoordinates(hospital.coordinates || null)
    setAddressDraft(hospital.address || '')
  }, [hospital])

  // A fresh browser fix becomes the pending coordinates until it is saved.
  useEffect(() => {
    if (position) setCoordinates({ lat: position.lat, lng: position.lng })
  }, [position])

  if (!hospitalId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No hospital linked</p>
        <p className="text-xs text-slate-500">Your account must be attached to a hospital to change its settings.</p>
      </div>
    )
  }

  if (loading) return <PageLoader message="Loading settings..." />

  if (error || !hospital) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load settings</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const saved = await hospitalApi.saveSettings(hospitalId, settings)
      setSettings({ ...DEFAULT_SETTINGS, ...saved })
      addToast('Settings saved successfully.', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const saveLocation = async () => {
    if (!coordinates) {
      addToast('Capture a location first.', 'warning')
      return
    }
    setSavingLocation(true)
    try {
      const saved = await hospitalApi.updateLocation(hospitalId, {
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: addressDraft.trim() || undefined,
      })
      setData((prev) => ({ ...prev, coordinates: saved.coordinates, address: saved.address }))
      addToast('Hospital location updated — patients can now route here.', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSavingLocation(false)
    }
  }

  const stored = hospital.coordinates
  const isDirtyLocation =
    coordinates &&
    (!stored ||
      Math.abs(stored.lat - coordinates.lat) > 1e-6 ||
      Math.abs(stored.lng - coordinates.lng) > 1e-6 ||
      addressDraft.trim() !== (hospital.address || ''))

  const update = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }))

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      {/* Map location */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <MapPin className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Hospital Location</h3>
            <p className="text-xs text-slate-500">
              These coordinates place your hospital on patient maps and drive nearest-hospital dispatch
            </p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-100 mb-3" style={{ height: 220 }}>
          {coordinates ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={16}
              markers={[{ ...coordinates, type: 'hospital', popup: hospital.name, label: hospital.name }]}
              className="h-full rounded-none"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-center px-6">
              <MapPin className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No location set yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Capture your current position, or type coordinates below.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={locate}
          disabled={locating}
          className="w-full flex items-center gap-2 p-3 mb-3 bg-cyan-50 border border-cyan-200 rounded-xl text-left hover:bg-cyan-100 transition-colors disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4 text-primary shrink-0" />
          )}
          <div>
            <p className="text-xs font-semibold text-slate-800">
              {locating ? 'Reading your position...' : 'Use this device’s current location'}
            </p>
            <p className="text-xs text-slate-500">
              Run this from a device inside the hospital for an accurate pin
            </p>
          </div>
        </button>

        {geoError && (
          <p className="mb-3 text-xs text-amber-600 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{geoError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { key: 'lat', label: 'Latitude', min: -90, max: 90 },
            { key: 'lng', label: 'Longitude', min: -180, max: 180 },
          ].map(({ key, label, min, max }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
              <input
                type="number"
                step="0.000001"
                min={min}
                max={max}
                value={coordinates?.[key] ?? ''}
                onChange={(e) =>
                  setCoordinates((prev) => ({
                    lat: prev?.lat ?? 0,
                    lng: prev?.lng ?? 0,
                    [key]: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          ))}
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Street Address</label>
          <input
            type="text"
            value={addressDraft}
            onChange={(e) => setAddressDraft(e.target.value)}
            placeholder="100 Medical Drive, Boston, MA 02101"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            {stored ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Saved at {stored.lat.toFixed(5)}, {stored.lng.toFixed(5)}
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Not published yet
              </>
            )}
          </p>
          <button
            onClick={saveLocation}
            disabled={savingLocation || !isDirtyLocation}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {savingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingLocation ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-cyan-50 rounded-xl flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <p className="text-xs text-slate-500">Alert preferences for hospital operations</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'notifyLowBeds', label: 'Low bed availability alerts', desc: 'Notify when available beds fall below threshold' },
            { key: 'notifyNewRequests', label: 'New ambulance requests', desc: 'Alert when a patient requests transport to your hospital' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <Toggle checked={settings[key]} onChange={update(key)} />
            </div>
          ))}
          {settings.notifyLowBeds && (
            <div className="ml-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="text-xs font-medium text-slate-600 block mb-2">Alert threshold (beds)</label>
              <input
                type="number"
                min={0}
                value={settings.lowBedThreshold}
                onChange={(e) => update('lowBedThreshold')(Number(e.target.value))}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Globe className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Public Visibility</h3>
            <p className="text-xs text-slate-500">Control what patients can see about your hospital</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'publicListing', label: 'Show in hospital directory', desc: 'Patients can find and view your hospital, and it can be picked as an ambulance destination' },
            { key: 'showBedCounts', label: 'Show bed availability publicly', desc: 'Display ICU, general, and emergency bed counts' },
            { key: 'showDoctors', label: 'Show doctors directory', desc: 'List doctors on your public hospital page' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <Toggle checked={settings[key]} onChange={update(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* System */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">System Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Bed-count review reminder (minutes)</label>
            <select
              value={settings.autoUpdateInterval}
              onChange={(e) => update('autoUpdateInterval')(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {[5, 15, 30, 60].map((v) => <option key={v} value={v}>{v} minutes</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => update('timezone')(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Kolkata', 'UTC'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
