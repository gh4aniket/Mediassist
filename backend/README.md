# MediAssist Backend

Express + Mongoose REST API for the MediAssist healthcare coordination platform.
Serves the React frontend in the repository root.

## Quick start

```bash
cd backend
npm install
cp .env.example .env      # then set MONGODB_URI and JWT_SECRET
npm run seed              # loads the demo hospitals, staff, doctors and users
npm run dev               # http://localhost:5000
```

No MongoDB installed? Run the whole API against a throwaway in-memory database,
seeded automatically:

```bash
npm run dev:memory
```

Demo logins (password `demo123` for all): `patient@demo.com`,
`hospital@demo.com`, `driver@demo.com`, `driver2@demo.com` (a second driver, for
watching a request fan out to more than one).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API with file watching, against `MONGODB_URI` |
| `npm start` | Production start |
| `npm run dev:memory` | API + seeded in-memory MongoDB (nothing persists) |
| `npm run seed` | Seed the demo fixtures (no-op if users already exist) |
| `npm run seed:fresh` | Wipe every collection, then seed |
| `npm run test:smoke` | 64-check end-to-end pass over the whole API |

## Layout

```
src/
├── server.js              entry point — connect, listen, graceful shutdown
├── app.js                 express app: helmet, cors, rate limits, routes
├── config/
│   ├── env.js             one typed view of process.env
│   └── db.js              mongoose connection
├── models/
│   ├── User.js            all three roles, discriminated by `role`
│   ├── Hospital.js        capacity, coordinates, public-visibility settings
│   ├── Doctor.js
│   ├── Staff.js
│   ├── Booking.js         the ambulance request — the live-tracking record
│   ├── MedicalProfile.js
│   ├── Activity.js        patient activity + hospital "recent updates" feeds
│   └── plugins/toClient.js  serialises `_id` as `id` everywhere
├── controllers/           one per resource
├── routes/                one per resource, mounted in routes/index.js
├── middleware/
│   ├── auth.js            requireAuth / optionalAuth / requireRole
│   ├── validate.js        declarative body + ObjectId validation
│   └── errorHandler.js    single JSON error shape
├── services/ragService.js client for the external RAG chatbot
├── utils/                 geo maths, relative time, errors, JWT
└── seed/                  fixtures, seed CLI, in-memory dev server, smoke test
```

## Conventions

Every response is `{ success, data }`, or `{ success: false, message, errors? }`
on failure. Documents always serialise `id`, never `_id`. Authentication is a
bearer JWT (`Authorization: Bearer <token>`).

## API

### Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Role-aware: `hospital` also gets a hospital + staff record, `patient` an empty medical profile |
| POST | `/api/auth/login` | Returns `{ user, token }` |
| GET | `/api/auth/me` | |
| PATCH | `/api/auth/me` | Only fields relevant to the caller's role |
| PATCH | `/api/auth/me/password` | |

### Hospitals

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/hospitals` | `?q=&type=&sort=rating\|distance\|icu\|general\|emergency\|name&lat=&lng=&limit=` |
| GET | `/api/hospitals/:id` | Includes `doctors` |
| POST | `/api/hospitals` | staff |
| PATCH | `/api/hospitals/:id` | staff — profile, services, facilities |
| PATCH | `/api/hospitals/:id/beds` | staff — validates `available <= total`, bumps `lastUpdated` |
| PATCH | `/api/hospitals/:id/location` | staff — **live location setter**, `{ lat, lng, address? }` |
| GET | `/api/hospitals/:id/summary` | staff — dashboard stats + recent updates |
| GET | `/api/hospitals/:id/updates` | staff |
| GET/PUT | `/api/hospitals/:id/settings` | staff — notifications and public visibility |

Passing `lat`/`lng` to the list endpoint annotates each hospital with a
haversine `distance`. There is no geospatial index query anywhere in this API.

### Doctors & staff

| Method | Path |
| --- | --- |
| GET/POST | `/api/hospitals/:hospitalId/doctors` |
| GET/PATCH/DELETE | `/api/doctors/:id` |
| GET/POST | `/api/hospitals/:hospitalId/staff` (`?q=&role=&status=`) |
| GET/PATCH/DELETE | `/api/staff/:id` |

### Bookings — the ambulance module

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/bookings` | patient — needs live `{ lat, lng }`; picks the nearest hospital with a free ER bed unless `hospitalId` is given |
| GET | `/api/bookings` | role-scoped history (`?status=&q=&limit=`) |
| GET | `/api/bookings/active` | the caller's one in-flight booking, or `null` |
| GET | `/api/bookings/incoming` | driver — the shared pending-request feed |
| GET | `/api/bookings/stats/me` | dashboard tiles |
| GET | `/api/bookings/:id` | patient/driver/destination-hospital only |
| GET | `/api/bookings/:id/track` | **patient polls this every 10 s** |
| PATCH | `/api/bookings/:id/driver-location` | **driver streams `{ lat, lng }` here** |
| PATCH | `/api/bookings/:id/patient-location` | patient's own position |
| POST | `/api/bookings/:id/accept` | driver — first to accept wins, atomically |
| POST | `/api/bookings/:id/reject` | driver — stays open for everyone else |
| PATCH | `/api/bookings/:id/status` | driver — `en-route` → `arrived` → `completed` |
| POST | `/api/bookings/:id/cancel` | patient cancels; a driver instead releases the assignment back to the queue |

#### How dispatch works

A new request is created as `pending` with no driver. Every driver whose
`availability` is `available` **and** `assigned` is `false` sees it in
`GET /api/bookings/incoming` — the fan-out is to all free drivers, not the
nearest one. The first `accept` wins through a conditional update
(`{ status: 'pending', driverId: null }`), so a second acceptance gets a clean
`409` rather than stealing the ride. Accepting sets the driver's `assigned` to
`true` and availability to `busy`; completing or releasing frees them again.

#### How live tracking works

There is no websocket. The booking document holds both sides of the ride:

- `pickupLocation` — where the patient asked to be collected (frozen once matched)
- `patientLocation` — the patient's live position, PATCHed by the patient
- `driverLocation` — the ambulance's live position, PATCHed by the driver

The driver app PATCHes `/driver-location` every ~10 s while moving; each write
recomputes `distanceKm` and `eta`. The patient's tracking page GETs `/track` on
the same cadence and re-renders the marker, ETA and timeline. `/track` also
reports `driverLocationAgeSeconds` and `driverLocationStale` so the UI can say
when a driver's signal has gone quiet, and echoes `pollAfterSeconds` so the
cadence is owned by the server.

### Medical profile

| Method | Path | Notes |
| --- | --- | --- |
| GET/PUT | `/api/medical-profile/me` | patient |
| GET | `/api/medical-profile/me/completeness` | powers the dashboard nudge |
| GET | `/api/medical-profile/:patientId` | responder access — only while attached to that patient's active booking |

### Drivers

| Method | Path |
| --- | --- |
| PATCH | `/api/drivers/me/availability` |
| PATCH | `/api/drivers/me/location` |
| GET | `/api/drivers/me/stats` |
| GET | `/api/drivers` (hospital staff — fleet view) |

### Assistant (RAG proxy)

| Method | Path |
| --- | --- |
| POST | `/api/assistant/chat` |
| GET | `/api/assistant/welcome` |
| GET | `/api/assistant/suggestions` |

The RAG chatbot is a **separate, already-built service**. This backend is only a
proxy: set `RAG_SERVICE_URL` and `/api/assistant/chat` forwards to
`POST {RAG_SERVICE_URL}/rag/query` with `{ question }`, expecting
`{ answer, sources: [{ title, score }] }` back. With the variable unset — or if
the service is unreachable — a small offline keyword responder answers instead
and the response's `meta.engine` says `offline-fallback`, which the chat UI
surfaces as a banner. Chat history is deliberately not persisted.

### Misc

`GET /api/health` reports database connection state and uptime.

## Environment

See `.env.example`. `AVERAGE_AMBULANCE_SPEED_KMPH` sets the constant used to turn
straight-line distance into an ETA (no routing provider is involved), and
`DRIVER_LOCATION_STALE_SECONDS` is the age at which `/track` flags a driver's
last fix as stale.
