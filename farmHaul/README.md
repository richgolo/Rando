# FarmHaul

A mobile-friendly web app that connects small-scale farmers with transporters. A farmer posts a produce load, transporters send prices in GHS, the farmer picks one, and both track the delivery to confirmation.

Built for the Codetrain 6-Week Innovation Challenge.

**Stack:** React + Vite · Supabase (Auth, Postgres, row-level security, database functions)

## Quick start
```bash
yarn                          # install
cp .env.example .env.local    # then fill in your Supabase URL + publishable key
yarn dev                      # http://localhost:5173
```
Database: paste [supabase/migrations/20261026000000_farmhaul_schema.sql](supabase/migrations/20261026000000_farmhaul_schema.sql) into the Supabase SQL Editor and run it.

## Scripts
| Command | What it does |
|---------|--------------|
| `yarn dev` | Run locally |
| `yarn build` | Production build into `dist/` |
| `yarn lint` | Check code style |
| `yarn test:db` | Run 60 database security tests (no Supabase needed) |

## Documentation
Step-by-step explanations of everything we built, with presentation talking points: **[docs/](docs/README.md)**.

## Limitations
No payments, GPS or SMS. WhatsApp is used only through chat and share links (no WhatsApp messages are sent by the app). The app can be added to a phone's home screen but needs internet to work. Pilot areas and units are placeholders until confirmed by research. See [docs/09-deploy-and-demo.md](docs/09-deploy-and-demo.md#limitations-be-upfront).
