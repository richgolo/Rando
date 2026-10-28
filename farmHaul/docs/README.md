# FarmHaul build docs

One document per build step. Each one says **what we built, why, how it works, which files hold it**, and ends with **"How to explain it"** (talking points) and **"Questions judges might ask"**.

Read them in order. Each step builds on the previous one.

| # | Step | What it covers |
|---|------|----------------|
| 1 | [Project setup](01-project-setup.md) | Tools, folder layout, connecting to Supabase |
| 2 | [Database and security](02-database-and-security.md) | Tables, row-level security, who can see what |
| 3 | [Sign-up and roles](03-sign-up-and-roles.md) | Accounts, farmer vs transporter, page guards |
| 4 | [Farmer: posting requests](04-farmer-requests.md) | New request form, my requests list, validation |
| 5 | [Transporter: vehicles and offers](05-transporter-vehicles-and-offers.md) | Vehicles, browsing loads, sending/editing/withdrawing offers |
| 6 | [Accepting an offer](06-accepting-an-offer.md) | The atomic accept function and why it matters |
| 7 | [Job tracking](07-job-tracking.md) | Picked up → delivered → confirmed, history, cancel, support |
| 8 | [Testing](08-testing.md) | Automated security tests and the manual checklist |
| 9 | [Deploy and demo](09-deploy-and-demo.md) | Putting it online, the Ama/Kojo demo script, limitations |

## The whole app in one paragraph

A farmer posts a load (what, how much, from where to where, which day). Transporters in the area see it and send a price in cedis. The farmer picks one offer. The database then, in one step, locks the request, marks that offer accepted, declines the rest, and creates a delivery job. The driver marks *picked up* and then *delivered*, and the farmer *confirms* receipt. Every change is logged with who made it and when. Phone numbers are only shared once both sides are matched.

## The one-sentence architecture

**React web app → Supabase (sign-in + Postgres database with row-level security + 3 small database functions).** There is no separate backend server; the rules live in the database itself.
