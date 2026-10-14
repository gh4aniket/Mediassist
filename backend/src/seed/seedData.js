/**
 * Seed fixtures, ported straight from the frontend's former `src/data/mockData.js`
 * so a freshly seeded database renders exactly what the mock-driven UI used to.
 * `key` fields are seed-local handles used to wire relations before real ObjectIds
 * exist; they are never persisted.
 */

export const users = [
  {
    key: 'u1',
    name: 'Sarah Johnson',
    email: 'patient@demo.com',
    password: 'demo123',
    phone: '+1 (555) 234-5678',
    role: 'patient',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format',
    address: '42 Maple Street, Boston, MA 02101',
    dateOfBirth: '1988-03-15',
    gender: 'Female',
  },
  {
    key: 'u2',
    name: 'Dr. Michael Chen',
    email: 'hospital@demo.com',
    password: 'demo123',
    phone: '+1 (617) 555-0101',
    role: 'hospital',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop&auto=format',
    hospitalKey: 'h1',
    staffRole: 'Administrator',
  },
  {
    key: 'u3',
    name: 'James Walker',
    email: 'driver@demo.com',
    password: 'demo123',
    phone: '+1 (555) 456-7890',
    role: 'driver',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    vehicleId: 'AMB-2047',
    licenseNumber: 'DL-789456123',
    experience: '7 years',
    certifications: 'EMT-Paramedic, CPR/AED',
    availability: 'available',
    assigned: false,
    currentLocation: { lat: 42.368, lng: -71.063 },
    stats: { totalTrips: 312, rating: 4.9, acceptedCount: 47, offeredCount: 50 },
  },
  {
    key: 'u4',
    name: 'Marcus Thompson',
    email: 'driver2@demo.com',
    password: 'demo123',
    phone: '+1 (555) 567-8901',
    role: 'driver',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&auto=format',
    vehicleId: 'AMB-1183',
    licenseNumber: 'DL-334512890',
    experience: '4 years',
    certifications: 'EMT-Basic, CPR/AED',
    availability: 'available',
    assigned: false,
    currentLocation: { lat: 42.3551, lng: -71.0657 },
    stats: { totalTrips: 148, rating: 4.7, acceptedCount: 30, offeredCount: 36 },
  },
]

export const hospitals = [
  {
    key: 'h1',
    name: 'Boston General Medical Center',
    address: '100 Medical Drive, Boston, MA 02101',
    phone: '+1 (617) 555-0100',
    email: 'info@bostongeneral.org',
    website: 'www.bostongeneral.org',
    type: 'General Hospital',
    rating: 4.7,
    description:
      'Boston General Medical Center is a 500-bed tertiary care hospital providing comprehensive healthcare services to the greater Boston area since 1952.',
    about:
      'Founded in 1952, Boston General Medical Center has grown to become one of the leading healthcare institutions in New England. We are committed to excellence in patient care, medical education, and clinical research. Our multidisciplinary team of over 1,200 healthcare professionals works tirelessly to deliver exceptional outcomes for every patient we serve.',
    beds: {
      icu: { total: 40, available: 12 },
      general: { total: 300, available: 87 },
      emergency: { total: 60, available: 18 },
    },
    services: [
      'Emergency Care', 'Cardiology', 'Neurology', 'Oncology', 'Orthopedics',
      'Pediatrics', 'Obstetrics', 'Radiology', 'Surgery', 'Rehabilitation',
    ],
    facilities: [
      '24/7 Emergency', 'ICU & NICU', 'Surgical Theaters (12)', 'MRI & CT Scan',
      'Blood Bank', 'Pharmacy', 'Cafeteria', 'Parking (500 spaces)', 'Chapel', 'Helipad',
    ],
    images: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&h=500&fit=crop&auto=format',
    ],
    coordinates: { lat: 42.3601, lng: -71.0589 },
    verified: true,
    established: '1952',
  },
  {
    key: 'h2',
    name: 'Cambridge Medical Institute',
    address: '250 University Ave, Cambridge, MA 02139',
    phone: '+1 (617) 555-0200',
    email: 'contact@cambridgemedical.org',
    website: 'www.cambridgemedical.org',
    type: 'Research Hospital',
    rating: 4.9,
    description:
      'A premier research and teaching hospital affiliated with major universities, specializing in cutting-edge treatments and clinical trials.',
    about:
      'Cambridge Medical Institute combines world-class clinical care with pioneering research to advance medical science and improve patient outcomes globally.',
    beds: {
      icu: { total: 30, available: 5 },
      general: { total: 200, available: 43 },
      emergency: { total: 40, available: 8 },
    },
    services: [
      'Emergency Care', 'Neuroscience', 'Cancer Research', 'Cardiology',
      'Transplant Surgery', 'Genetics', 'Psychiatry', 'Rheumatology',
    ],
    facilities: [
      '24/7 Emergency', 'Research Labs', 'Helipad', 'PET/MRI Scan',
      'Blood Bank', 'Pharmacy', 'Conference Center', 'Parking',
    ],
    images: [
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=900&h=500&fit=crop&auto=format',
    ],
    coordinates: { lat: 42.3736, lng: -71.1097 },
    verified: true,
    established: '1965',
  },
  {
    key: 'h3',
    name: 'South Shore Community Hospital',
    address: '55 Harbor Road, Quincy, MA 02169',
    phone: '+1 (617) 555-0300',
    email: 'info@southshorehospital.org',
    website: 'www.southshorehospital.org',
    type: 'Community Hospital',
    rating: 4.3,
    description:
      'Serving the South Shore community for over 60 years with comprehensive medical care and a patient-centered approach.',
    about:
      'South Shore Community Hospital is committed to providing accessible, high-quality healthcare to the Quincy and South Shore communities with compassion and respect.',
    beds: {
      icu: { total: 20, available: 7 },
      general: { total: 150, available: 62 },
      emergency: { total: 30, available: 11 },
    },
    services: [
      'Emergency Care', 'Maternity', 'Pediatrics', 'Orthopedics',
      'Cardiology', 'Rehabilitation', 'Mental Health',
    ],
    facilities: [
      '24/7 Emergency', 'Birthing Center', 'Physical Therapy', 'MRI', 'Pharmacy', 'Parking',
    ],
    images: [
      'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=900&h=500&fit=crop&auto=format',
    ],
    coordinates: { lat: 42.2529, lng: -71.0023 },
    verified: true,
    established: '1961',
  },
  {
    key: 'h4',
    name: "St. Mary's Women & Children's Hospital",
    address: '780 Providence Street, Brookline, MA 02446',
    phone: '+1 (617) 555-0400',
    email: 'contact@stmarywomens.org',
    website: 'www.stmarywomens.org',
    type: "Women's & Children's",
    rating: 4.8,
    description:
      "A specialized hospital dedicated to women's health and pediatric care, offering comprehensive services from prenatal to geriatric care.",
    about:
      "St. Mary's is a nationally recognized center of excellence in women's health and pediatric medicine.",
    beds: {
      icu: { total: 15, available: 4 },
      general: { total: 120, available: 38 },
      emergency: { total: 25, available: 9 },
    },
    services: [
      "Women's Health", 'Obstetrics', 'Gynecology', 'Pediatrics',
      'Neonatology', 'Fertility', 'Mammography',
    ],
    facilities: [
      '24/7 Emergency', 'NICU', 'Birthing Suites', 'Lactation Center',
      'MRI', 'Pharmacy', 'Parking',
    ],
    images: [
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900&h=500&fit=crop&auto=format',
    ],
    coordinates: { lat: 42.3318, lng: -71.1212 },
    verified: true,
    established: '1977',
  },
]

export const doctors = [
  {
    hospitalKey: 'h1',
    name: 'Dr. Amanda Foster',
    specialization: 'Interventional Cardiologist',
    qualifications: 'MD, FACC, FSCAI — Harvard Medical School',
    experience: '18 years',
    description:
      'Dr. Foster specializes in interventional cardiology and has performed over 5,000 cardiac catheterization procedures. She is nationally recognized for her work in heart failure management and structural heart disease.',
    image:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&auto=format',
    email: 'a.foster@bostongeneral.org',
    phone: '+1 (617) 555-0111',
    availability: 'Mon–Fri, 8 AM – 5 PM',
  },
  {
    hospitalKey: 'h1',
    name: 'Dr. Robert Kim',
    specialization: 'Neurologist',
    qualifications: 'MD, PhD, FAAN — Johns Hopkins University',
    experience: '14 years',
    description:
      "Dr. Kim is a leading neurologist specializing in stroke care and neurodegenerative diseases. He leads the hospital's Stroke Response Team and has published over 80 peer-reviewed papers.",
    image:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&auto=format',
    email: 'r.kim@bostongeneral.org',
    phone: '+1 (617) 555-0112',
    availability: 'Mon–Thu, 9 AM – 6 PM',
  },
  {
    hospitalKey: 'h1',
    name: 'Dr. Sarah Patel',
    specialization: 'Emergency Medicine Physician',
    qualifications: 'MD, FACEP — Boston University School of Medicine',
    experience: '10 years',
    description:
      "Dr. Patel heads the Emergency Department and specializes in trauma care and emergency surgical procedures. She developed the hospital's rapid triage protocol now used statewide.",
    image:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&auto=format',
    email: 's.patel@bostongeneral.org',
    phone: '+1 (617) 555-0113',
    availability: '24/7 On-Call Rotation',
  },
  {
    hospitalKey: 'h1',
    name: 'Dr. James Martinez',
    specialization: 'Orthopedic Surgeon',
    qualifications: 'MD, FAAOS — Columbia University',
    experience: '22 years',
    description:
      'Dr. Martinez is an expert in minimally invasive orthopedic procedures and joint replacement surgery. He has pioneered robotic-assisted knee replacement techniques at the hospital.',
    image:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&auto=format',
    email: 'j.martinez@bostongeneral.org',
    phone: '+1 (617) 555-0114',
    availability: 'Mon, Wed, Fri — 8 AM – 4 PM',
  },
  {
    hospitalKey: 'h2',
    name: 'Dr. Elena Volkov',
    specialization: 'Oncologist',
    qualifications: 'MD, PhD, FASCO — MIT & Massachusetts General Hospital',
    experience: '16 years',
    description:
      'Dr. Volkov leads the Cancer Research Institute at CMI, specializing in immunotherapy and targeted cancer treatments. Her lab has contributed to three FDA-approved cancer therapies.',
    image:
      'https://images.unsplash.com/photo-1623854767648-e7bb8009f0db?w=200&h=200&fit=crop&auto=format',
    email: 'e.volkov@cambridgemedical.org',
    phone: '+1 (617) 555-0211',
    availability: 'Tue–Fri, 9 AM – 5 PM',
  },
]

export const staff = [
  { hospitalKey: 'h1', name: 'Dr. Michael Chen', email: 'mchen@bostongeneral.org', role: 'Administrator', department: 'Administration', status: 'active', phone: '+1 (617) 555-0101', joinDate: '2019-03-01', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Patricia Kim RN', email: 'pkim@bostongeneral.org', role: 'Head Nurse', department: 'ICU', status: 'active', phone: '+1 (617) 555-0102', joinDate: '2020-07-15', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Dr. Thomas Reed', email: 'treed@bostongeneral.org', role: 'Resident Physician', department: 'Emergency', status: 'active', phone: '+1 (617) 555-0103', joinDate: '2023-01-20', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Angela Morrison', email: 'amorrison@bostongeneral.org', role: 'Receptionist', department: 'Front Desk', status: 'active', phone: '+1 (617) 555-0104', joinDate: '2021-05-10', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Carlos Mendez', email: 'cmendez@bostongeneral.org', role: 'Radiology Technician', department: 'Radiology', status: 'inactive', phone: '+1 (617) 555-0105', joinDate: '2018-11-22', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Jennifer Walsh RN', email: 'jwalsh@bostongeneral.org', role: 'Registered Nurse', department: 'General Ward', status: 'active', phone: '+1 (617) 555-0106', joinDate: '2022-08-01', avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'David Park', email: 'dpark@bostongeneral.org', role: 'Pharmacist', department: 'Pharmacy', status: 'active', phone: '+1 (617) 555-0107', joinDate: '2020-02-14', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&auto=format' },
  { hospitalKey: 'h1', name: 'Rachel Green', email: 'rgreen@bostongeneral.org', role: 'Social Worker', department: 'Patient Services', status: 'on-leave', phone: '+1 (617) 555-0108', joinDate: '2021-09-30', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&auto=format' },
]

export const medicalProfile = {
  patientKey: 'u1',
  bloodGroup: 'O+',
  height: "5'6\"",
  weight: '132 lbs',
  allergies: ['Penicillin', 'Sulfa drugs', 'Latex'],
  conditions: ['Hypertension', 'Type 2 Diabetes Mellitus'],
  medications: [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily (with meals)' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily (morning)' },
    { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily (morning)' },
  ],
  emergencyContacts: [
    { name: 'Robert Johnson', relationship: 'Husband', phone: '+1 (555) 234-5679' },
    { name: 'Lisa Johnson', relationship: 'Sister', phone: '+1 (555) 345-6780' },
  ],
}

/** Two completed rides so the history page and dashboard tiles are not empty. */
export const bookings = [
  {
    patientKey: 'u1',
    driverKey: 'u3',
    hospitalKey: 'h1',
    status: 'completed',
    daysAgo: 12,
    durationMinutes: 42,
    pickupLocation: { address: '42 Maple Street, Boston, MA 02101', lat: 42.3601, lng: -71.0589 },
    emergencyType: 'Cardiac Emergency',
    emergencyNote: 'Chest pain and difficulty breathing, onset approx. 20 minutes ago',
  },
  {
    patientKey: 'u1',
    driverKey: 'u4',
    hospitalKey: 'h2',
    status: 'completed',
    daysAgo: 40,
    durationMinutes: 51,
    pickupLocation: { address: 'Boston Common, Boston, MA 02108', lat: 42.3551, lng: -71.0657 },
    emergencyType: 'Allergic Reaction',
    emergencyNote: 'Severe allergic reaction after eating shellfish, rash spreading rapidly',
  },
]
