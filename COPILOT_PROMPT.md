# Build task for GitHub Copilot: Unleashed, the full platform

Paste everything below the line into GitHub Copilot (Agent mode in VS Code, or as the description of an issue assigned to the Copilot coding agent). Work through it one phase at a time.

---

You are building **Unleashed**, an invite-only portfolio and collaboration platform for artists, in this repository. Read `.github/copilot-instructions.md` first and follow it exactly: it holds the platform rules, the stack, the BONHOMME brand (colours, type, logos, voice) and the code rules.

The repository today is a static GitHub Pages site (`index.html`, `data/*.json`, issue-form approval via GitHub Actions). Keep it working while you rebuild it on Vite + TypeScript + Supabase. Do the work in four phases. **Finish each phase, list what you built and what I must set up by hand (for example creating the Supabase project or adding secrets), and stop for my review before starting the next one.**

## Phase 1: Accounts, invitations and profiles

Goal: members sign in, invite people, and BONHOMME approves profiles.

1. Move the site to Vite + TypeScript with a GitHub Actions workflow that builds and deploys to GitHub Pages. Keep the current look, routes (`#channel`, `#library`, `#artists`, `#collab`, `#join`, `#artist-<slug>`), fonts and logo files.
2. Supabase Auth with email magic links. No passwords.
3. Tables (with migrations and RLS):
   - `profiles` (id = auth user id, slug unique, name, roles text[], location text, bio, looking_for, links text[], contact, photo_path, status: `pending` | `live` | `paused`, invited_by → profiles.id, created_at).
   - `invites` (id, code unique, created_by → profiles.id, email, used_by, used_at, expires_at). Each live member can create invites; an invite link is single-use and expires after 14 days.
   - `roles_admin` (user_id): BONHOMME is the only admin at first.
4. Flow: invite link → sign in → fill profile → status `pending` → admin sees a **Curator desk** with pending profiles → Approve sets `live`, Decline deletes the draft. Only `live` profiles are public.
5. Show on each profile who invited them ("Invited by …"). Admin can see the full invite tree.
6. Seed script: import `data/artists.json` so BONHOMME's profile exists (slug `bonhomme`, already live, admin).

Done when: I can invite a test email, that person signs in and submits a profile, I approve it on the Curator desk, and it appears on the Artists page; RLS stops a non-admin from approving anyone.

## Phase 2: Portfolio, playlists and the download exchange

Goal: every member's central portfolio.

1. Tables: `works` (id, title, type: track | dj_mix | live_set | video | collab, date, bpm, length, mood, place, embed_url, download_path, created_by), `work_credits` (work_id, profile_id, role), `playlists` (id, owner, title, mood, position), `playlist_items` (playlist_id, work_id, position).
2. Members add works by pasting a SoundCloud, Mixcloud or YouTube link (validated, played in an embedded player) and, optionally, uploading the original file to Storage for free download. Works with no file show "Stream only".
3. A work credited to several members shows on every credited profile.
4. Members create, reorder and fill playlists on their own profile.
5. **Download exchange.** Pressing Download opens "Take it, give something back" with four options: your own track (link or upload), a photo (upload), a message for the artist, or money (Phase 4; show "coming soon" until then). The download unlocks only after one is given. Store each one in `exchanges` (id, work_id, giver_email or giver profile, kind, payload_path or text, created_at) and show the artist their exchanges on a private **Received** page.
6. Seed script: import `data/releases.json`, `data/playlists.json` and `data/collabs.json`.

Done when: my five existing releases and three playlists appear on my profile, a visitor can download a test file only after leaving a message, and I see that message on Received.

## Phase 3: Workspaces, split first, provable credits

Goal: the collaboration tool.

1. Tables: `workspaces` (id, title, created_by, status: `drafting_split` | `active` | `exported`), `workspace_members` (workspace_id, profile_id, role), `splits` (workspace_id, profile_id, percent numeric, accepted_at), `workspace_files` (id, workspace_id, uploaded_by, path, name, size, sha256, created_at), `workspace_log` (append-only: id, workspace_id, actor, action, detail jsonb, created_at), `tasks` (id, workspace_id, title, owner, status: todo | doing | done).
2. Any live member can create a workspace and invite live members into it.
3. **Split first:** while the status is `drafting_split`, members can only edit and accept the split. Percentages must total exactly 100. When every member has accepted, the status becomes `active` and file sharing opens. Any change to the split resets all acceptances.
4. In an active workspace: upload and download files (Storage, private bucket, access only for members), a simple task board, and a timeline from `workspace_log`.
5. Compute SHA-256 in the browser before upload and store it. `workspace_log` and `workspace_files` rows can never be updated or deleted (enforce with RLS and a trigger).
6. **Export:** produce a package (zip) with the final files, a `split-sheet.pdf` (title, members, roles, percentages, acceptance timestamps) and `credits.json` (every file with uploader, time and hash). Mark the workspace `exported` and optionally publish the result as a work credited to all members.

Done when: two test members agree a 60/40 split, cannot upload before both accept, upload files, and export a package whose split sheet and hashes match.

## Phase 4: Money: contributions, earnings and the inviter bonus

Goal: money follows the split. Build this last and keep it behind an admin switch until I enable it.

1. Contributions: the "money" option in the download exchange opens a Stripe Checkout pay-what-you-want session (Edge Function holds the Stripe secret).
2. Tables: `earnings` (id, work_id, source, gross_amount, currency, received_at), `ledger` (id, earning_id, profile_id, kind: `artist_share` | `inviter_bonus` | `platform`, amount). An Edge Function splits each earning: platform share `PLATFORM_SHARE` (setting, default 5%), of which the inviter bonus `INVITER_BONUS` (setting) goes to whoever invited each credited artist, one level only; the rest is divided by the work's split. The artists' combined share is never reduced to fund the bonus.
3. Payouts through Stripe Connect Express accounts, monthly, with a minimum payout setting.
4. Every member sees their own ledger; the admin sees all.

Done when: a test earning of €100 on a 60/40 work produces ledger rows that total €100, the bonus goes only to direct inviters, and nothing pays out while the admin switch is off.

## Throughout

- Follow the brand in `.github/copilot-instructions.md` on every screen, including empty states, errors and emails (magic-link and invite emails use the same voice and the BH logo).
- Mobile first: every screen works at 360px wide.
- Accessibility: labels on every input, visible focus, contrast as specified.
- Tell me before you add a dependency, change the platform rules, or do anything that needs a paid service.
- Legal note to keep in the README: Unleashed records proof of authorship and agreed splits; registering works for royalty collection (for example with EAÜ in Estonia or UPRS in Uganda) is still each artist's step, and the payment and payout terms need review by a lawyer before Phase 4 goes live.
