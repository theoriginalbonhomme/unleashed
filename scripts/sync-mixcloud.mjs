// Adds new Mixcloud uploads to data/releases.json.
// Existing entries are never changed, so hand edits stay safe.
// Usage: node scripts/sync-mixcloud.mjs [--fixture path/to/api-response.json]

import { readFile, writeFile } from "node:fs/promises";

const RELEASES = new URL("../data/releases.json", import.meta.url);
const ARTISTS = new URL("../data/artists.json", import.meta.url);
const OWNER_SLUG = "bonhomme";

const normalise = (url) => String(url ?? "").trim().toLowerCase().replace(/^http:/, "https:").replace(/\/?$/, "/");

const slugify = (text) => String(text)
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80) || "mix";

const duration = (seconds) => {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const capitalise = (text) => text.replace(/(^|[\s-])(\p{Ll})/gu, (_, gap, letter) => gap + letter.toUpperCase());

const placeFrom = (title) => {
  const match = String(title).match(/@\s*([^,]+)/);
  return match ? capitalise(match[1].trim()) : "";
};

// Mixcloud names look like "Rickyvonmond - Technosunday251026@ntungamo" or "smoothsession 14.10.26 @ Kampala".
// The site shows them as "Technosunday @ Ntungamo": no artist prefix (the artist is shown separately),
// no date (shown separately), place capitalised.
const cleanTitle = (name) => {
  let title = String(name).trim().replace(/^rickyvonmond\s*-\s*/i, "");
  const place = placeFrom(title);
  title = title.replace(/@.*$/, "");
  title = title.replace(/\b\d{1,2}\.\d{1,2}(\.\d{2,4})?\b/g, "").replace(/\d{6}$/, "").replace(/\s{2,}/g, " ").trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return place ? `${title} @ ${place}` : title;
};

async function mixcloudUser() {
  const artists = JSON.parse(await readFile(ARTISTS, "utf8"));
  const owner = artists.find((artist) => artist.slug === OWNER_SLUG);
  const link = (owner?.links ?? []).find((url) => /mixcloud\.com\//i.test(url));
  const user = link?.match(/mixcloud\.com\/([^/?#]+)/i)?.[1];
  if (!user) throw new Error("No Mixcloud link on the bonhomme profile in data/artists.json");
  return user;
}

async function fetchCloudcasts(user, fixture) {
  if (fixture) return JSON.parse(await readFile(fixture, "utf8")).data ?? [];
  const all = [];
  let next = `https://api.mixcloud.com/${encodeURIComponent(user)}/cloudcasts/?limit=100`;
  for (let page = 0; next && page < 20; page += 1) {
    const response = await fetch(next, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Mixcloud answered ${response.status} for ${next}`);
    const body = await response.json();
    all.push(...(body.data ?? []));
    next = body.paging?.next ?? "";
  }
  return all;
}

async function main() {
  const fixtureIndex = process.argv.indexOf("--fixture");
  const fixture = fixtureIndex > -1 ? process.argv[fixtureIndex + 1] : "";
  const user = await mixcloudUser();
  const cloudcasts = await fetchCloudcasts(user, fixture);
  const releases = JSON.parse(await readFile(RELEASES, "utf8"));
  const knownUrls = new Set(releases.map((release) => normalise(release.url)).filter((url) => url !== "/"));
  const knownIds = new Set(releases.map((release) => release.id));

  const added = [];
  for (const cast of cloudcasts) {
    const url = normalise(cast.url);
    if (!cast.url || !cast.name || knownUrls.has(url)) continue;
    let id = slugify(cast.name);
    for (let n = 2; knownIds.has(id); n += 1) id = `${slugify(cast.name)}-${n}`;
    knownIds.add(id);
    knownUrls.add(url);
    added.push({
      id,
      title: cleanTitle(cast.name),
      artists: [OWNER_SLUG],
      alias: "",
      type: "DJ mix",
      date: String(cast.created_time ?? "").slice(0, 10),
      length: duration(cast.audio_length),
      bpm: "",
      genre: cast.tags?.[0]?.name ?? "",
      url: cast.url,
      download: "",
      original_lost: false,
      mood: "",
      place: placeFrom(cast.name),
    });
  }

  if (!added.length) {
    console.log(`No new uploads on mixcloud.com/${user} (${cloudcasts.length} checked).`);
    return;
  }
  const merged = [...added, ...releases].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  await writeFile(RELEASES, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Added ${added.length} new upload(s):`);
  added.forEach((release) => console.log(`- ${release.date} ${release.title}`));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
