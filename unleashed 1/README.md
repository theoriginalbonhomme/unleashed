# Unleashed

Free music for every DJ, and a low-key place for musicians to find collaborators.
Curated by theoriginalbonhomme. Lives at https://theoriginalbonhomme.github.io

## Put it online (about 10 minutes, once)

1. On GitHub, create a new **public** repository named exactly `theoriginalbonhomme.github.io`.
2. Upload everything in this folder, including the hidden `.github` folder (drag the whole folder into "Add file → Upload files", or use GitHub Desktop).
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. Go to **Settings → Actions → General → Workflow permissions** and choose "Read and write permissions". Save.
5. Go to **Issues → Labels** and create four labels: `artist`, `release`, `collab`, `approved`.

The site is live at https://theoriginalbonhomme.github.io a minute or two later.

## How approval works

- Artists apply with the **Join Unleashed** form (a GitHub issue). Releases and collab calls use the **Add music** and **Post a collab call** forms.
- Each submission arrives in your **Issues** tab.
- To approve: add the `approved` label. The site adds the profile, release or call, comments "Approved" and closes the issue.
- To decline: close the issue without the label.
- Only you (and people you add as collaborators) can add labels, so nothing goes live without you.

## Editing by hand

All content lives in four files in `data/`:

| File | What it holds |
| --- | --- |
| `site.json` | Name, tagline, and your contribution link (`support_url`) |
| `artists.json` | Approved artist profiles |
| `releases.json` | Tracks, DJ mixes, collabs and videos |
| `collabs.json` | Open collab calls (set `status` to `Closed` when done) |

To add a contribution link, paste your PayPal, Ko-fi or Buy Me a Coffee link into `support_url` in `site.json`.
For a release where you still have the file, put a Google Drive or Dropbox link in `download`. Leave it empty and the release shows "Stream only".

SoundCloud, Mixcloud and YouTube links play right on the site.
