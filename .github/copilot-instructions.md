# Unleashed: instructions for GitHub Copilot

Read this before every change in this repository.

## What Unleashed is

Unleashed is an invite-only home and collaboration platform for artists, run by the artist BONHOMME at https://theoriginalbonhomme.github.io. BONHOMME built it first for himself: one central portfolio for everything he makes, plus the tools to collaborate easily with artists around the world. Every member gets the same tools.

Core rules of the platform (never break these):

1. **Free for members.** Nobody pays to use Unleashed. Nobody gets paid until the art earns.
2. **Download is an exchange.** Downloads cost no money, but every download asks for something back: the listener's own track, a photo, a message, or money if they want. Every exchange is recorded.
3. **Invite only.** Only members can invite. The inviter vouches for the person they invite. BONHOMME (the curator) approves every profile before it goes live.
4. **Split first.** In a workspace, everyone agrees the split (who gets what %) before any work starts. Nothing is uploaded or exported until every member has accepted it.
5. **Provable credits.** Every file added to a workspace is logged: who, when, file name, size and SHA-256 hash. Logs are append-only.
6. **Money flows by split.** When a work earns, each person in its split is paid their share. A small platform share funds an inviter bonus, one level deep only (you earn from people you invited, never from the people they invite). The artists' share is never reduced to pay it.

## Stack

- Front end: Vite + TypeScript, no UI framework. Deployed to GitHub Pages by a GitHub Actions workflow.
- Back end: Supabase (Auth with email magic links, Postgres with Row Level Security on every table, Storage for files, Edge Functions for anything that needs a secret).
- Payments (last phase only): Stripe Checkout for contributions; Stripe Connect for payouts.
- Keep dependencies minimal. Ask before adding any library beyond `@supabase/supabase-js` and Vite.
- Never commit secrets. The Supabase anon key and URL go in `.env` (read via `import.meta.env`); service-role keys and Stripe secrets live only in Supabase Edge Function secrets.

## Brand: the BONHOMME identity

Apply the identity everywhere. When in doubt, look at the current `index.html`, which already uses it.

**Colour tokens** (CSS custom properties; light theme on `:root`, dark theme under `prefers-color-scheme: dark` and `[data-theme="dark"]`):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | #F2F0E9 | #242323 | Page ground (Warm Off-white / Charcoal Black) |
| `--card` | #FBFAF6 | #2E2D2C | Cards, panels |
| `--ink` | #242323 | #F2F0E9 | Text |
| `--dim` | #4D4B48 | #B8B4AA | Secondary text |
| `--line` | #D9D6CC | #403E3C | Hairlines, borders |
| `--tq` | #00B8C7 | #00B8C7 | Primary Turquoise: fields, primary buttons, active tab |
| `--tq-text` | #007680 | #00B8C7 | Turquoise used as text or links |
| `--yellow` | #FFE800 | #FFE800 | Riso Yellow accent, 10% or less of any screen |
| `--on` | #242323 | #242323 | Text on turquoise or yellow |

- Never put off-white or yellow text on turquoise (fails contrast). Text on turquoise and yellow is always charcoal (`--on`).
- No other colours, gradients, glows or drop shadows.

**Type** (self-hosted WOFF2 in `/fonts`, SIL Open Font License):
- Archivo Black: headings, uppercase, tight letter-spacing (−1% to −3.5%).
- Archivo 400/600: running text, sentence case.
- IBM Plex Mono 400/700: labels, buttons, tags, dates, BPM, catalogue numbers; uppercase with +8% tracking.

**Logo files** live in `/img`: `bonhomme-wordmark.svg` (the name with the fused double M), `bonhomme-bh.svg` (BH, the short logo), `bonhomme-seal.svg` (the stencil face). Never retype the name BONHOMME in a font as a logo, never recolour the logo outside the palette, never stretch it.

**Shape and layout:** square corners (0) on fields and cards, 2px on buttons and inputs, 50% only for avatar crops and status dots. Side gutter at least 16px; works at 360px wide. Visible keyboard focus. Respect `prefers-reduced-motion`.

**Voice:** short, plain, direct sentences. No hype words, no exclamation marks, no emoji. Name things by what people do ("Invite an artist", "Accept the split"), never by system terms. Tagline: "In service of art."

## Code rules

- Every table has RLS enabled with explicit policies; deny by default.
- Every user-facing string goes through one `copy.ts` file so wording stays consistent.
- Escape all user content before rendering (no `innerHTML` with raw input). Only allow `https://` URLs from users.
- Embeds: only SoundCloud, Mixcloud and YouTube players, built from validated URLs.
- Write SQL migrations in `supabase/migrations/`, never change a live schema by hand.
- Keep the existing data in `data/*.json` working until it is migrated into Postgres by a seed script.
