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

## Phase 2: Old Render, portfolios and contributor claims

Why Unleashed exists: after finishing a track or a DJ set, the artist is tired. Getting it up must take seconds, so it never ends up forgotten on an old hard drive. Friends must be able to share tracks and work on projects together. The hard problems are file sharing, DAW matching and understanding each other's workflow.

Goal: every Unleasher has one portfolio and a fast way to save unfinished music.

### Old Render: every Unleasher's dump for never-ready music

1. Drag and drop many files at once. BONHOMME starts with about 50 renders from the last 12 months and around 250 more from earlier years. No form: take the title from the file name (strip the `bh - ` prefix), take the date from the file, and make everything else optional and editable later.
2. Bulk import: drop a whole folder and show every file's title, date, size and checkbox, then import the selected files together.
3. Each item is Private by default, Friends (members I choose) or Public (shown in my portfolio).
4. Free-plan storage: Supabase has 1 GB total and 50 MB per file. Store an MP3 preview at 192 kbps, made in the browser before upload when the source is WAV/AIFF. Ask before adding any library. Originals (WAV, AIFF, stems and project files) are links to Google Drive, Dropbox or WeTransfer. Show storage used per member and warn before anyone exceeds their share.
5. One-click **Unleash this** starts a workspace from an item.
6. Names such as `bh ft brigita` and `bh & lumi` become suggested contributors on import.
7. Rights check: when a file name looks like a cover or remix of another artist (for example it contains `cover`, `remix` or a famous artist's name), default it to **Stream only, no download** and explain that downloads of another artist's song need permission.

### Portfolio and playlists

1. Tables: `works` (id, title, type: track | dj_mix | live_set | video | collab, date, bpm, length, mood, place, embed_url, download_path, created_by), `work_credits` (work_id, profile_id, role), `playlists` (id, owner, title, mood, position), `playlist_items` (playlist_id, work_id, position).
2. Members add works using validated SoundCloud, Mixcloud or YouTube links, optionally with an original file for free download. Works without a file show **Stream only**. A work credited to several members appears on every credited profile.
3. Members create, reorder and fill playlists on their own profile. Seed `data/releases.json`, `data/playlists.json` and `data/collabs.json`.
4. **Download exchange:** Download opens **Take it, give something back** with a track (link or upload), photo, message, or money (Phase 4; show **coming soon** until then). Unlock the download only after a contribution. Store each exchange (work, giver, kind, payload and time) and show it on the artist's private **Received** page.
5. Every profile has a **My setup** section: DAW and version (Ableton Live, FL Studio, Logic, Bitwig, Reaper, Pro Tools, Cubase or other), default sample rate, OS and key plugins.

### Add a contributor when uploading

1. Add contributors to a work by selecting an existing member or entering a name for someone not on Unleashed yet. Assign each a role (producer, vocalist, MC, mix, master or other) and a split percentage. Percentages must total 100.
2. For a non-member, create a private claim link that is single-use, valid for 30 days and copyable for WhatsApp or email. It is also their invite, with the sender as inviter; no passwords.
3. On the link, the person sees the work and split, signs in with an email magic link, accepts the split and fills in their profile, including their intention. The Curator reviews the profile, and the person is credited on the work.
4. Until every contributor accepts, only the contributors can see the work; show **Split waiting for <name>**. Once all accept, publish it under **UNLEASHED** on every credited profile.
5. Show each claim link's status (sent, opened, accepted); let the creator resend or cancel it. Credits for people without a profile are plain names, not links.
6. First UNLEASH test case: the track BONHOMME made with producer iLLEGAL P near Kampala.

Done when: my five existing releases and three playlists appear on my profile; Old Render imports individual files and a folder in bulk; a visitor downloads a test file only after leaving a message; and I see that message on Received. A test multi-artist work stays private until every split is accepted, then appears on every credited profile.

## Phase 3: Workspaces, split first, handover cards and workflow

Goal: a collaboration workspace where everyone agrees the split before work starts and can see what happens next.

1. Tables: `workspaces` (id, title, created_by, status: `drafting_split` | `active` | `exported`), `workspace_members` (workspace_id, profile_id, role), `splits` (workspace_id, profile_id, percent numeric, accepted_at), `workspace_files` (id, workspace_id, uploaded_by, path, name, size, sha256, created_at), `workspace_log` (append-only: id, workspace_id, actor, action, detail jsonb, created_at), and `tasks` (id, workspace_id, title, owner, status: todo | doing | done).
2. Any live member can create a workspace and invite live members. A workspace can start from **Unleash this** on an Old Render item.
3. **Split first:** while status is `drafting_split`, members can only edit and accept the split. Percentages must total exactly 100. When every member accepts, status becomes `active` and file sharing opens. Any split change resets every acceptance.
4. In an active workspace, members upload and download files from a private Storage bucket, use a simple task board, and see a timeline from `workspace_log`.
5. Every Old Render item and workspace file has a **Handover Card**: DAW and version, BPM, key, sample rate, bit depth, plugins used, and what's included (master, stems, project file, MIDI). When members use different DAWs, show a plain note, for example: “This is an Ableton 12 project. Buffalo uses FL Studio, so send stems.”
6. Before upload, show a stems checklist: every track is WAV, starts at bar 1, has the same length and sample rate, and is named `NN_Instrument_BPM_Key`.
7. Each workspace has a **Workflow Board** with fixed stages: Idea → Stems → Arrangement → Vocals → Mix → Master → Release. Each stage has an owner and status. At the top of the workspace, always show in one line what happens next and whose turn it is.
8. Compute SHA-256 in the browser before upload and store it. `workspace_log` and `workspace_files` rows are append-only and cannot be updated or deleted (enforce with RLS and a trigger).
9. **Export:** create a package (zip) with final files, a `split-sheet.pdf` (title, members, roles, percentages and acceptance times) and `credits.json` (every file's uploader, time and hash). Mark the workspace `exported` and optionally publish the result as a work credited to all members.

Done when: two test members agree a 60/40 split, cannot upload before both accept, upload files, see the right next owner/stage and matching-DAW note, and export a package whose split sheet and hashes match.

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
