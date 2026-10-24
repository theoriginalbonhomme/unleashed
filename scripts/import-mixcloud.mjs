import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const apiUrl = new URL("https://api.mixcloud.com/theoriginalbonhomme/cloudcasts/");
const releasesPath = new URL("../data/releases.json", import.meta.url);

export function normalizeMixcloudUrl(value) {
  const url = new URL(value);
  url.hostname = url.hostname.replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "").toLowerCase();
}

export function formatDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error(`Invalid Mixcloud audio length: ${seconds}`);
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function releaseFromCloudcast(cloudcast) {
  if (!cloudcast || typeof cloudcast !== "object") {
    throw new Error("Mixcloud returned an invalid cloudcast.");
  }

  const title = typeof cloudcast.name === "string" ? cloudcast.name.trim() : "";
  const url = typeof cloudcast.url === "string" ? cloudcast.url : "";
  const createdAt = typeof cloudcast.created_time === "string" ? new Date(cloudcast.created_time) : null;
  const key = typeof cloudcast.key === "string" ? cloudcast.key : "";

  if (!title || !key || !createdAt || Number.isNaN(createdAt.valueOf())) {
    throw new Error("Mixcloud cloudcast is missing its name, key, or valid creation date.");
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "www.mixcloud.com") {
    throw new Error(`Mixcloud returned an unsupported cloudcast URL: ${url}`);
  }

  const audioLength = cloudcast.audio_length;
  if (!Number.isInteger(audioLength) || audioLength < 0) {
    throw new Error(`Mixcloud cloudcast "${title}" has an invalid audio length.`);
  }

  const slug = key.split("/").filter(Boolean).at(-1);
  const idSlug = slug?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!idSlug) {
    throw new Error(`Mixcloud cloudcast "${title}" has an invalid key.`);
  }

  const atIndex = title.indexOf("@");
  return {
    id: `mixcloud-${idSlug}`,
    title,
    artists: ["bonhomme"],
    alias: "",
    type: "DJ mix",
    date: createdAt.toISOString().slice(0, 10),
    length: formatDuration(audioLength),
    bpm: "",
    genre: "",
    url: parsedUrl.toString(),
    download: "",
    original_lost: false,
    mood: "",
    place: atIndex < 0 ? "" : title.slice(atIndex + 1).trim(),
  };
}

export function addMissingCloudcasts(releases, cloudcasts) {
  if (!Array.isArray(releases) || !Array.isArray(cloudcasts)) {
    throw new Error("Expected releases and cloudcasts to be arrays.");
  }

  const existingIds = new Set(releases.map((release) => release.id));
  const existingUrls = new Set(
    releases
      .filter((release) => typeof release.url === "string" && release.url.length > 0)
      .map((release) => normalizeMixcloudUrl(release.url)),
  );
  const additions = [];

  for (const cloudcast of cloudcasts) {
    const release = releaseFromCloudcast(cloudcast);
    const normalizedUrl = normalizeMixcloudUrl(release.url);
    if (existingIds.has(release.id) || existingUrls.has(normalizedUrl)) continue;

    existingIds.add(release.id);
    existingUrls.add(normalizedUrl);
    additions.push(release);
  }

  additions.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return [...additions, ...releases];
}

export async function fetchCloudcasts(fetchImpl = fetch) {
  const cloudcasts = [];
  const visited = new Set();
  let nextUrl = new URL(apiUrl);
  nextUrl.searchParams.set("limit", "100");

  while (nextUrl) {
    const currentUrl = nextUrl.toString();
    if (visited.has(currentUrl)) {
      throw new Error(`Mixcloud pagination repeated a page: ${currentUrl}`);
    }
    visited.add(currentUrl);

    const response = await fetchImpl(currentUrl);
    if (!response.ok) {
      throw new Error(`Mixcloud API request failed (${response.status} ${response.statusText}).`);
    }

    const page = await response.json();
    if (!page || !Array.isArray(page.data) || !page.paging || typeof page.paging !== "object") {
      throw new Error("Mixcloud API returned an invalid page.");
    }
    cloudcasts.push(...page.data);

    if (page.paging.next === null) {
      nextUrl = null;
    } else if (typeof page.paging.next === "string") {
      const followingUrl = new URL(page.paging.next);
      if (followingUrl.origin !== apiUrl.origin || followingUrl.pathname !== apiUrl.pathname) {
        throw new Error(`Mixcloud returned an unsupported pagination URL: ${followingUrl}`);
      }
      nextUrl = followingUrl;
    } else {
      throw new Error("Mixcloud API returned an invalid next-page URL.");
    }
  }

  return cloudcasts;
}

async function main() {
  const [releasesText, cloudcasts] = await Promise.all([
    readFile(releasesPath, "utf8"),
    fetchCloudcasts(),
  ]);
  const releases = JSON.parse(releasesText);
  const updatedReleases = addMissingCloudcasts(releases, cloudcasts);

  if (updatedReleases.length === releases.length) {
    console.info("No new Mixcloud uploads.");
    return;
  }

  const addedCount = updatedReleases.length - releases.length;
  await writeFile(releasesPath, `${JSON.stringify(updatedReleases, null, 2)}\n`);
  console.info(`Added ${addedCount} new Mixcloud upload${addedCount === 1 ? "" : "s"}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
