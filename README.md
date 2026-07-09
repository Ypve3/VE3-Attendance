# VE3 Attendance — v2

A full-featured Next.js 14 (App Router) attendance system for VE3 Global: face-recognition + PIN check-in, visitor
management, departments, monthly reporting, regularization workflow, audit log, and role-based user management.

## What's included

- **CSV export** alongside the existing Excel export (both generated together, every time).
- **Employee photo thumbnails** — a snapshot is captured and stored alongside the face descriptor.
- **Late status** — check-ins after a configurable cutoff (default `09:30`) are marked **Late** with an amber badge
  instead of **Present**. Change it in **Settings**.
- **Name search on Records** — filter by employee name in addition to date.
- **Day-strip on Records** — quick buttons for the last 14 days with check-in counts.
- **Slack/Teams webhook on export** — set `EXPORT_WEBHOOK_URL` in `.env.local` and every 2-hourly (or manual) export
  posts a message.
- **Departments as a real table** — dropdown on the Employees page and in Settings (admin), no more free-text typos.
- **Monthly attendance summary** — `Reports` page: Present/Late/Absent per employee, working days = Mon–Fri.
- **Bulk employee import** — CSV upload on the Employees page (`name,department`, header row optional).
- **Self password reset** — "Forgot password?" on the login screen. Since no SMTP is configured, the reset link is
  printed to the **server console** and posted to the webhook if configured. An admin currently needs to relay it
  to the employee (see Security Notes below for how to wire up real email later).
- **Audit log** — every meaningful mutation (logins, employee/user create-delete, biometric deletes, attendance
  deletes, regularization decisions, settings changes, exports) is recorded and viewable at **Audit Log** (admin only).
- **Live dashboard** — polls every 5 seconds; no WebSocket needed for this scale.
- **Regularization requests** — an employee (or whoever is at the kiosk) submits a note for a missed day; an admin
  approves or rejects it from the **Regularize** page. Approval creates the attendance record automatically
  (marked `method: regularized`, 09:00).
- **Face + PIN fallback** — every employee can optionally get a 4–6 digit PIN (bcrypt-hashed) set on the Employees
  page. If the camera struggles, the **Face Check-in** page has a PIN panel alongside the camera.
- **Biometric consent & deletion** — registering a face requires ticking a consent checkbox; a "Delete biometric
  data" button (shield icon) on the Employees page permanently clears the descriptor + photo + consent timestamp.
- **DB-backed users** — no more hardcoded login. The seeded admin (Preeti) can create/remove user accounts from
  **User Management** (admin only nav item).

## Prerequisites

- Node.js 18+ and npm
- Network access to your Postgres instance (already configured to `3.10.151.185:5432`)

## Setup

```bash
npm install
```

Check `.env.local` — it's already pre-filled:

```
DATABASE_URL=postgresql://postgres:admin@3.10.151.185:5432/postgres
DATABASE_SSL=false
EXPORT_WEBHOOK_URL=
```

- Set `DATABASE_SSL=true` if your Postgres requires SSL.
- Paste a Slack/Teams incoming webhook URL into `EXPORT_WEBHOOK_URL` if you want export/password-reset
  notifications. Leave blank to skip — nothing breaks either way.

Push the schema and seed initial data:

```bash
npx drizzle-kit push
npm run db:seed
```

The seed creates:
- Admin login: **preeti.garg@ve3.global** / **Ve3@global** — change this password immediately via a reset or a new
  admin-created account.
- `late_cutoff` setting = `09:30`
- 4 starter departments: Engineering, HR, Sales, Operations

Run the dev server:

```bash
npm run dev
```

Visit **http://localhost:3000** and sign in with the seeded admin account.

For production:

```bash
npm run build
npm run start
```

## First-run checklist

1. Sign in as Preeti (admin).
2. Go to **User Management** and create real accounts for your team; consider demoting/removing the seed admin's
   password reliance once others exist.
3. Go to **Settings** to adjust the late cutoff and add/remove departments.
4. Go to **Employees** to add your team, optionally register faces (consent checkbox is mandatory) and/or set PINs.
5. Try **Face Check-in** — grant camera permission when prompted. First load fetches the face-api.js models from a
   CDN (`cdn.jsdelivr.net`), so the machine running check-in needs outbound internet access to that domain once.
6. Check **Records** → **Exports** to generate an on-demand Excel + CSV pair, or just wait — it also runs
   automatically every 2 hours.

## CSV import format for employees

Plain CSV, one employee per line:

```
name,department
Asha Rao,Engineering
Ben Cole,HR
Priya Nair,
```

- Header row is optional (auto-detected if the first cell contains "name").
- Department is optional; unknown department names are created automatically.

## Password resets without SMTP

No email server is wired up in this build. When someone clicks "Forgot password?":

1. A one-hour token is generated and stored.
2. The reset URL (`/reset-password?token=...`) is printed to the **terminal running `npm run dev` / `npm run start`**.
3. If `EXPORT_WEBHOOK_URL` is set, the same link is also posted there.

To wire up real email later, replace the `console.log` in `src/app/api/auth/forgot/route.ts` with an SMTP/SES/Resend
call — the token/URL generation logic doesn't need to change.

## Security notes (please read before exposing this beyond your LAN)

- **Auth is header-based, not session-based.** Every API call sends `x-user-id` from `localStorage`. This is fine
  for an internal, trusted network, but it is spoofable by anyone who can reach the API directly. Before exposing
  this to the internet, replace it with real signed sessions/JWT (e.g. NextAuth or iron-session).
- **Rotate the Postgres password.** `admin` on a publicly reachable IP (`3.10.151.185`) is a real risk — treat this
  as the first infra fix, independent of the app.
- **Biometric data** (face descriptors + photo thumbnails) are stored in Postgres in plain columns. If you need to
  meet a specific compliance regime (BIPA, GDPR biometric provisions, etc.), consider encrypting these columns at
  rest and formalizing a retention/deletion policy beyond the manual "delete biometric data" button already
  provided.
- The face-api.js models load from `cdn.jsdelivr.net` at runtime. For an air-gapped deployment, download the
  `@vladmandic/face-api` model weights once and self-host them, then change `MODEL_URL` in
  `src/app/face/page.tsx` and `src/app/employees/page.tsx`.

## Native mobile wrapper (not shipped, documented here)

To get face check-in working from a phone camera without a full rewrite:

1. `npm install -g @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios`
2. `npx cap init "VE3 Attendance" "com.ve3.attendance"`
3. Point Capacitor's `webDir` at a static export, OR simpler: keep this as a Next.js server and use Capacitor's
   `server.url` config to point the shell at your deployed HTTPS URL (e.g. `https://attendance.ve3.global`) instead
   of bundling static assets. This avoids re-architecting the app for static export.
4. `npx cap add android` / `npx cap add ios`, then open in Android Studio / Xcode to build.
5. Camera permissions: add the standard camera usage strings to `AndroidManifest.xml` / `Info.plist` — the existing
   `getUserMedia` calls work as-is inside Capacitor's webview on modern Android/iOS.

This wasn't built into the repo because it needs a decision on your deployment domain/HTTPS setup first (Capacitor's
webview requires a real HTTPS origin, not `localhost`, for camera access on-device).

## Project structure

```
src/
  app/                  Pages (App Router) + API routes under app/api/**
  components/           Shared UI (app-shell/login, toast, button/input/card primitives)
  db/                   Drizzle schema, connection, seed script
  lib/                  api.ts (typed fetch client), audit.ts, settings.ts, webhook.ts, excelExport.ts
  instrumentation.ts    Node-runtime detection shim (required so cron code isn't bundled into edge/browser)
  instrumentation-node.ts  Actual 2-hourly export cron (setInterval-based)
exports/                Generated .xlsx/.csv files land here (git-ignored)
```

## Troubleshooting

- **"DATABASE_URL is required" from drizzle-kit** → make sure `.env.local` exists and `drizzle.config.ts` loads it
  (already wired up).
- **"Can't resolve 'fs'" from `pg`** → already handled via `serverComponentsExternalPackages: ["pg"]` in
  `next.config.mjs`. If you upgrade to Next 15, rename that key to `serverExternalPackages`.
- **Face check-in stuck on "Loading AI models"** → check the browser console for a blocked request to
  `cdn.jsdelivr.net`; your network may be blocking it.
- **"relation employees does not exist"** → you skipped `npx drizzle-kit push`. Run it, then re-seed.
