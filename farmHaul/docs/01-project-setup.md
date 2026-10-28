# Step 1: Project setup

## What we built
A React web app (built with **Vite**) connected to **Supabase**, which gives us sign-in, a Postgres database and an API without writing our own server.

## Why these tools
| Tool | Why we chose it |
|------|-----------------|
| React + Vite | Fast to build screens, runs in any phone browser, no app store needed |
| Supabase | Sign-in, database and API in one place. Saves us building and hosting a backend in six weeks |
| Postgres (inside Supabase) | A real relational database: foreign keys, transactions, and row-level security |
| React Router | Lets each screen have its own URL (e.g. `/farmer/requests/123`) |
| Plain JavaScript | The team already knows it; TypeScript would slow us down for little gain at this size |

Real-time sockets weren't used. Pages that change re-check the database every 15 seconds (polling), as the design doc recommends.

## How to set it up (from zero)
1. **Install packages:** `yarn` (already done if `node_modules` exists).
2. **Create a Supabase project** at supabase.com → New project. Pick a region close to Ghana (e.g. EU West).
3. **Create the database:** Supabase → *SQL Editor* → New query → paste the whole of `supabase/migrations/20261026000000_farmhaul_schema.sql` → **Run**.
4. **Turn off email confirmation for the pilot/demo** (optional but easier): *Authentication → Sign In / Providers → Email → Confirm email = off*. If you leave it on, the app tells users to check their email.
5. **Connect the app:** copy `.env.example` to `.env.local`, then paste in:
   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key (or legacy **anon** key)
6. **Run it:** `yarn dev` → open http://localhost:5173

> ⚠️ Never put the **service_role / secret** key in the app. Anyone can read browser code. The publishable key is safe *only because* every table has row-level security (Step 2).

If `.env.local` is missing, the app shows a "Supabase is not connected yet" screen instead of crashing.

## Folder layout
```
farmHaul/
├─ supabase/
│  ├─ migrations/…_farmhaul_schema.sql   ← the whole database (Step 2)
│  └─ tests/security.test.mjs             ← automated security tests (Step 8)
├─ src/
│  ├─ lib/          supabase.js (connection), constants.js (areas, units), format.js, useData.js
│  ├─ auth/         sign in, sign up, AuthProvider (who is logged in), RequireRole (page guard)
│  ├─ components/   Layout (header + phone bottom nav), Icon (inline icons), shared UI bits, RequestSummary
│  ├─ farmer/       FarmerHome, NewRequest, RequestDetail
│  ├─ transporter/  FindLoads, MakeOffer, MyJobs, Vehicles
│  ├─ shared/       JobDetail (one screen for both roles)
│  ├─ App.jsx       all the routes (URLs → screens)
│  └─ index.css     mobile-first styling
└─ docs/            these documents
```

## Key files
- [src/lib/supabase.js](../src/lib/supabase.js): creates the one Supabase client the whole app uses.
- [src/lib/constants.js](../src/lib/constants.js): pilot areas, units, vehicle types and support contact. **These are placeholders until research confirms them.**
- [.env.example](../.env.example): the two settings the app needs.

## How to explain it
- "We chose a **web app**, not a phone app, so farmers and drivers can use it from any smartphone browser without installing anything."
- "We used **Supabase** so we didn't have to build a server. That let us spend our six weeks on the actual flow and on security."
- "The browser only has a **public key**. Security doesn't depend on hiding the key. It comes from rules inside the database, which I'll show next."

## Questions judges might ask
- **Why not a native mobile app?** Six weeks, one codebase, no app-store approval, and it works on cheap Android phones. Native apps are on the "later" list.
- **Why no backend server?** Supabase gives us an API straight from the database. The logic that must be trusted (accepting offers, changing status) runs *inside* the database as functions, so it can't be bypassed.
- **Isn't the key in the browser a security risk?** No. It's the *publishable* key, designed to be public. What people can do with it is limited by row-level security.
