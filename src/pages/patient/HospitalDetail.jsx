import { useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Phone, Globe, Mail, Star, CheckCircle, ArrowLeft, Award, Clock } from 'lucide-react'
import { BedStatCard } from '../../components/shared/StatCard'
import MapContainer from '../../components/shared/MapContainer'
import Modal from '../../components/shared/Modal'
import { PageLoader } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import { hospitalApi } from '../../services'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&h=500&fit=crop&auto=format'

export default function HospitalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  const fetchHospital = useCallback((signal) => hospitalApi.get(id, { signal }), [id])
  const { data: hospital, loading, error } = useApiResource(fetchHospital, [id])

  if (loading) return <PageLoader message="Loading hospital..." />

  if (error || !hospital) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-slate-500">{error || 'Hospital not found.'}</p>
        <button onClick={() => navigate('/patient/hospitals')} className="mt-3 text-primary text-sm hover:underline">
          ← Back to Hospitals
        </button>
      </div>
    )
  }

  const doctors = hospital.doctors || []
  const showBeds = hospital.settings?.showBedCounts !== false
  const tabs = ['overview', 'doctors', 'facilities', 'map']

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      <button
        onClick={() => navigate('/patient/hospitals')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Hospitals
      </button>

      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden mb-5 h-52 bg-slate-200">
        <img src={hospital.images?.[0] || FALLBACK_IMAGE} alt={hospital.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <div className="absolute bottom-4 left-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            {hospital.verified && (
              <span className="flex items-center gap-1 text-xs bg-primary/80 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            )}
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{hospital.type}</span>
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{hospital.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-200">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{hospital.rating}</span>
            {hospital.established && <span>Est. {hospital.established}</span>}
          </div>
        </div>
      </div>

      {/* Contact bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-4 mb-5 shadow-sm">
        {[
          { icon: MapPin, label: hospital.address },
          { icon: Phone, label: hospital.phone },
          { icon: Mail, label: hospital.email },
          { icon: Globe, label: hospital.website },
        ]
          .filter(({ label }) => Boolean(label))
          .map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
      </div>

      {/* Bed availability */}
      {showBeds && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <BedStatCard type="icu" total={hospital.beds?.icu?.total ?? 0} available={hospital.beds?.icu?.available ?? 0} />
            <BedStatCard type="general" total={hospital.beds?.general?.total ?? 0} available={hospital.beds?.general?.available ?? 0} />
            <BedStatCard type="emergency" total={hospital.beds?.emergency?.total ?? 0} available={hospital.beds?.emergency?.available ?? 0} />
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-5">
            <Clock className="w-3 h-3" />
            Capacity reported by the hospital
            {hospital.lastUpdated ? ` at ${new Date(hospital.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        </>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mb-5 gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">About</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {hospital.about || hospital.description || 'No description provided yet.'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Services Offered</h2>
            <div className="flex flex-wrap gap-2">
              {(hospital.services || []).map((s) => (
                <span key={s} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-3 py-1.5 rounded-full font-medium">{s}</span>
              ))}
              {!hospital.services?.length && <p className="text-sm text-slate-400">No services listed yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div>
          {doctors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No doctors listed for this hospital.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => setSelectedDoctor(doc)}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&auto=format'}
                      alt={doc.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{doc.name}</p>
                      <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{doc.qualifications}</p>
                      {doc.experience && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Award className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-slate-500">{doc.experience} experience</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="w-full mt-3 py-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-lg transition-colors">
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'facilities' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Hospital Facilities</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(hospital.facilities || []).map((f) => (
              <div key={f} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
            {!hospital.facilities?.length && <p className="text-sm text-slate-400">No facilities listed yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" style={{ height: '400px' }}>
          {hospital.coordinates ? (
            <MapContainer
              center={[hospital.coordinates.lat, hospital.coordinates.lng]}
              zoom={15}
              markers={[{ ...hospital.coordinates, type: 'hospital', popup: hospital.name, label: hospital.name }]}
              className="rounded-none h-full"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <MapPin className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Location not set</p>
              <p className="text-xs text-slate-400 mt-1">
                This hospital has not published its map coordinates yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Doctor Details Modal */}
      <Modal isOpen={!!selectedDoctor} onClose={() => setSelectedDoctor(null)} title="Doctor Profile" size="md">
        {selectedDoctor && (
          <div className="p-5">
            <div className="flex items-start gap-5 mb-5">
              <img
                src={selectedDoctor.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&auto=format'}
                alt={selectedDoctor.name}
                className="w-20 h-20 rounded-2xl object-cover shrink-0"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>{selectedDoctor.name}</h3>
                <p className="text-sm text-primary font-medium">{selectedDoctor.specialization}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedDoctor.qualifications}</p>
                <div className="flex items-center gap-3 mt-2">
                  {selectedDoctor.experience && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Award className="w-3.5 h-3.5 text-amber-500" />{selectedDoctor.experience}
                    </span>
                  )}
                  {selectedDoctor.availability && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />{selectedDoctor.availability}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {selectedDoctor.description && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-1.5">About</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedDoctor.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedDoctor.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{selectedDoctor.phone}
                </div>
              )}
              {selectedDoctor.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />{selectedDoctor.email}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
