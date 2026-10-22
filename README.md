# Unleashed

Unleashed is a free, invitation-led home and collaboration platform for artists. It is built with Vite and TypeScript, uses Supabase for Phase 1 member accounts, and is deployed to GitHub Pages.

The existing visual identity and data-backed Channel, Library, Artists, Unleash (Call Board), and Join pages remain in the root `data/*.json` files. The self-hosted Archivo and IBM Plex Mono fonts and BONHOMME marks live under `fonts/` and `img/`. Phase 2 will move the portfolio data into Supabase.

## Local development

1. Install Node.js 22 or newer, then run `npm ci`.
2. Create a Supabase project and run the SQL in `supabase/migrations/20261021000000_phase1.sql`, followed by `supabase/migrations/20261022000000_phase1_profile_fields.sql`.
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file.
4. In Supabase Auth, enable email sign-in, set the Site URL to `https://theoriginalbonhomme.github.io/unleashed/`, and allow redirects to `https://theoriginalbonhomme.github.io/unleashed/**` and `http://localhost:5173/unleashed/**`.
5. Run `npm run dev`. Run `npm run build` to type-check and create `dist/`.

Sign-in uses email magic links only. Invitees must use the address that received the single-use invitation. Each invitation expires after 14 days. Profile intentions are available only to the profile owner and the Curator.

## First Curator setup

After applying both migrations, create your account under **Authentication → Users** in Supabase. Open **SQL Editor**, paste the contents of `supabase/seed/bonhomme.sql`, replace its single `YOUR_EMAIL_HERE` placeholder with the same account email, and run it. This browser-only seed reads the existing account, inserts or updates BONHOMME's live profile and grants that account the Curator role. It does not need Terminal or a service-role key.

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds and deploys on pushes to `main`. In repository settings, enable Pages with **GitHub Actions** as the build and deployment source. Add the repository variable `VITE_SUPABASE_URL` and secret `VITE_SUPABASE_ANON_KEY`. The anon key is intended for browser use; database access is restricted by RLS.

## Legal note

Unleashed records proof of authorship and agreed splits. Registering works for royalty collection (for example with EAÜ in Estonia or UPRS in Uganda) is still each artist's step. Payment and payout terms need review by a lawyer before Phase 4 goes live.
