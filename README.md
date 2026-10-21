# Unleashed

Unleashed is a free, invitation-led home and collaboration platform for artists. It is built with Vite and TypeScript, uses Supabase for Phase 1 member accounts, and is deployed to GitHub Pages.

The existing visual identity and data-backed Channel, Library, Artists, Collab board, and Join pages remain in the root `data/*.json` files. The self-hosted Archivo and IBM Plex Mono fonts and BONHOMME marks live under `fonts/` and `img/`. Phase 2 will move the portfolio data into Supabase.

## Local development

1. Install Node.js 22 or newer, then run `npm ci`.
2. Create a Supabase project and apply `supabase/migrations/20261021000000_phase1.sql`.
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file.
4. In Supabase Auth, enable email sign-in, set the Site URL to `https://theoriginalbonhomme.github.io/unleashed/`, and allow redirects to `https://theoriginalbonhomme.github.io/unleashed/**` and `http://localhost:5173/unleashed/**`.
5. Run `npm run dev`. Run `npm run build` to type-check and create `dist/`.

Sign-in uses email magic links only. Invitees must use the address that received the single-use invitation. Each invitation expires after 14 days.

## First Curator setup

After applying the migration, run the seed script with a Supabase service-role key and the Curator's email:

```sh
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
BONHOMME_EMAIL=you@example.com \
npm run seed
```

The script reads the BONHOMME profile from `data/artists.json`, creates or reuses the Supabase Auth user, and marks the profile live and the user as admin. Never expose the service-role key in the browser or GitHub Pages build.

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds and deploys on pushes to `main`. In repository settings, enable Pages with **GitHub Actions** as the build and deployment source. Add the repository variable `VITE_SUPABASE_URL` and secret `VITE_SUPABASE_ANON_KEY`. The anon key is intended for browser use; database access is restricted by RLS.

## Legal note

Unleashed records proof of authorship and agreed splits. Registering works for royalty collection (for example with EAÜ in Estonia or UPRS in Uganda) is still each artist's step. Payment and payout terms need review by a lawyer before Phase 4 goes live.
