# Step 9: Deploy and demo

## Deploying (Vercel; Netlify works the same way)
1. Push the project to GitHub.
2. vercel.com → **Add New Project** → import the repo. It detects Vite automatically (build: `yarn build`, output: `dist`).
3. **Environment Variables:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`).
4. Deploy. You get a URL like `https://farmhaul.vercel.app`.
5. In Supabase → *Authentication → URL Configuration*, set **Site URL** to that address (needed if email confirmation is on).

`vercel.json` and `public/_redirects` make sure refreshing a page like `/jobs/123` works instead of showing a 404.

## Before demo day
- [ ] Run `yarn test:db` → 60 passed
- [ ] Run the manual checklist in [Step 8](08-testing.md) on the **live URL**
- [ ] Create the two demo accounts in advance (below), each with a vehicle/profile ready
- [ ] Record a **backup video** of the full flow, in case the internet fails
- [ ] Take screenshots of each screen for the slides

## Demo script: Ama and Kojo (about 3 minutes)
Two browser windows side by side: **left = Ama (farmer)**, **right = Kojo (transporter)**.

1. **Ama posts a load.** *New request* → Tomatoes, 20 crates, Techiman (near the clinic) → Kumasi (Kejetia market), Friday → Post.
   *Say:* "Landmarks, not GPS, because that's how farmers described locations to us."
2. **Kojo finds it.** Refresh *Find loads*. The load shows, but no phone number.
   *Say:* "Kojo can see enough to price the job, but not Ama's phone yet."
3. **Kojo offers** GHS 450 with his pickup truck: "Can come early Friday."
4. **Ama sees the offer appear** (within 15 s, or refresh). *Accept* → confirm.
   *Say:* "One database transaction locks the request, accepts Kojo, declines the others and creates the job. Two quick taps can't create two jobs."
5. **Both see the job.** Now each sees the other's phone.
6. **Kojo: Mark as picked up → Mark as delivered.** Ama's screen follows.
   *Say:* "Only Kojo can do this. If Ama tried, the database would refuse."
7. **Ama: Confirm I received it.** Show the **History**: every step, who did it, when.
8. **Refresh both windows**: still Confirmed. "Everything is saved in the database, not just on screen."

**Bonus (if a judge asks about security):** run `yarn test:db` in a terminal and show 60 passing tests.

## Limitations (be upfront)
- Matching and status tracking only. **No payment, GPS, SMS or WhatsApp.** We don't fake these.
- Pilot areas, units and the cancellation rule are **placeholders until confirmed by research**.
- One role per account; one transporter and one load per job.
- Updates arrive by checking every 15 seconds, not instantly.
- Needs a smartphone with data and an email address to sign up.

## Roadmap
**Next:** SMS/WhatsApp notifications for new offers and acceptance · phone-number sign-in · filters by date and produce · offer expiry.
**Later:** ratings and trust signals · in-app payment · GPS tracking · split loads.
**Future AI (only once there's real, consented job history):** suggest a suitable transporter from capacity, area, availability and past jobs, compared against a simple rules-based match before claiming it's better. Route optimisation once routes are reliably recorded. *These are future opportunities, not current features.*

## Mapping to how the challenge is scored
| Criterion | Weight | What to point to |
|-----------|--------|------------------|
| Working product | 30% | Live URL + the Ama/Kojo demo end to end |
| Problem understanding | 15% | Interview evidence, current WhatsApp/phone process, what changed after research |
| Product thinking | 15% | Tight scope (must-haves only), privacy of phone numbers, Delivered vs Confirmed, honest limitations |
| Technical understanding | 15% | RLS (Step 2), atomic accept (Step 6), 60 security tests (Step 8) |
