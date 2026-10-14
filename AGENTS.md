# mediassist

MediAssist — a healthcare coordination platform. React + Vite + Tailwind CSS
frontend (repository root) talking to an Express + MongoDB API (`backend/`).

Three role-based experiences share one login: **patient** (request and track an
ambulance, browse hospitals, medical profile, AI assistant), **hospital staff**
(bed capacity, doctors, staff, hospital profile and map location) and **driver**
(availability, dispatch feed, active trip).

## Running the stack

Two processes. The frontend proxies `/api` to the backend, so both must be up.

```bash
# terminal 1 — API on :5000
cd backend && npm install && npm run dev:memory

# terminal 2 — frontend on :8443 (already running inside Figma Make)
npm install && npm run dev
```

`npm run dev:memory` boots a seeded in-memory MongoDB and needs no database
installed — ideal for frontend work. For a real database, set `MONGODB_URI` in
`backend/.env`, run `npm run seed` once, then `npm run dev`.

Demo logins (password `demo123`): `patient@demo.com`, `hospital@demo.com`,
`driver@demo.com`, `driver2@demo.com`.

## Development server

A Vite development server runs on `$PORT` (default 8443).

- Preview URL: the user can access the running app through the preview panel
- Hot reload: changes to source files are reflected immediately
- `/api/*` is proxied to `http://localhost:5000` (override with `VITE_API_PROXY`)

## Project structure

This is the canonical project structure. Start with task-relevant files below.
Only follow imports or inspect other files when required, when a documented path
is missing, or when the repository contradicts this guide.

### Frontend

- `src/main.tsx` — React entrypoint; imports `src/index.css`, mounts `src/App.jsx`
- `src/App.jsx` — router, role-based route guards, providers, error boundary
- `src/index.css` — global CSS and Tailwind v4 import
- `src/services/apiClient.js` — fetch wrapper: base URL, bearer token, error shape
- `src/services/index.js` — **one module per API resource; every URL lives here**
- `src/hooks/useApiResource.js` — load-on-mount with `{ data, loading, error, reload }`
- `src/hooks/useGeolocation.js` — one-shot and `watchPosition` live location
- `src/hooks/useInterval.js` — the polling primitive behind live tracking
- `src/context/AuthContext.jsx` — session, token storage, `/auth/me` revalidation
- `src/context/ToastContext.jsx` — toast notifications
- `src/layouts/` — one shell per role (sidebar + header + outlet)
- `src/pages/{auth,patient,hospital,driver}/` — screens, one file per route
- `src/components/shared/` — MapContainer (Leaflet), Timeline, StatusBadge, StatCard, Modal, ConfirmDialog, EmptyState, Loader, ErrorBoundary
- `index.html` — Vite shell; also loads Leaflet from a CDN onto `window.L`
- `vite.config.ts` — React, Tailwind v4 and Figma Make plugins, `@` → `src`, `/api` proxy

### Backend

See `backend/README.md` for the full endpoint list and the dispatch and
live-tracking designs. In short: `backend/src/{models,controllers,routes,middleware,services,utils}`,
entry point `backend/src/server.js`.

## Data flow

There is **no mock data** — every screen reads from the API. When adding a
screen, add its call to `src/services/index.js` rather than calling `fetch`
directly, and load it with `useApiResource` so the request is cancelled on
unmount.

Two flows are worth knowing before touching them:

- **Dispatch** — a new booking is offered to *every* driver who is `available`
  and not `assigned`; the first to accept wins via an atomic conditional update.
- **Live tracking** — no websockets. The driver PATCHes
  `/api/bookings/:id/driver-location` every ~10 s; the patient GETs
  `/api/bookings/:id/track` on the same cadence. Both sides' coordinates live on
  the booking document.

## Dependencies

- Runtime: React 19 and React DOM 19, React Router 7
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Maps: Leaflet 1.9 via CDN (`window.L`), OpenStreetMap tiles
- Icons: lucide-react
- Build tooling: Vite 8, TypeScript 5.7, `@vitejs/plugin-react`
- Formatting: oxfmt
- Backend: Express 4, Mongoose 8, jsonwebtoken, bcryptjs, helmet, cors, morgan

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin
configured in `vite.config.ts`. `src/index.css` imports Tailwind with
`@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put
global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold
does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in
`src/index.css`. Keep CSS `@import` statements first, then add any `@font-face`
rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`),
  or escape them in single-quoted strings. An unescaped apostrophe in a
  single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Backend: `npm run test:smoke` in `backend/` exercises the whole API end to end
  against an in-memory database. Run it after changing models or controllers.
