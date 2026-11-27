import assert from "node:assert/strict";
import test from "node:test";
import {
  addMissingCloudcasts,
  fetchCloudcasts,
  formatDuration,
  releaseFromCloudcast,
} from "./import-mixcloud.mjs";

const cloudcast = (overrides = {}) => ({
  key: "/theoriginalbonhomme/test-upload/",
  url: "https://www.mixcloud.com/theoriginalbonhomme/test-upload/",
  name: "Studio set @ Kampala",
  created_time: "2026-10-23T23:41:01Z",
  audio_length: 6067,
  ...overrides,
});

test("maps cloudcast metadata to a DJ mix release", () => {
  assert.deepEqual(releaseFromCloudcast(cloudcast()), {
    id: "mixcloud-test-upload",
    title: "Studio set @ Kampala",
    artists: ["bonhomme"],
    alias: "",
    type: "DJ mix",
    date: "2026-10-23",
    length: "1:41:07",
    bpm: "",
    genre: "",
    url: "https://www.mixcloud.com/theoriginalbonhomme/test-upload/",
    download: "",
    original_lost: false,
    mood: "",
    place: "Kampala",
  });
});

test("formats short and hour-long durations", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(2244), "37:24");
  assert.equal(formatDuration(3600), "1:00:00");
  assert.throws(() => formatDuration(-1), /Invalid Mixcloud audio length/);
});

test("deduplicates URLs and IDs while preserving existing entries", () => {
  const existing = [{ id: "existing", url: "https://mixcloud.com/theoriginalbonhomme/test-upload" }];
  const result = addMissingCloudcasts(existing, [cloudcast()]);
  assert.equal(result.length, 1);
  assert.equal(result[0], existing[0]);

  const duplicatePage = addMissingCloudcasts([], [cloudcast(), cloudcast()]);
  assert.equal(duplicatePage.length, 1);
});

test("fetches every page and rejects pagination outside the Mixcloud API endpoint", async () => {
  const requested = [];
  const pages = [
    {
      data: [cloudcast()],
      paging: { next: "https://api.mixcloud.com/theoriginalbonhomme/cloudcasts/?until=next" },
    },
    { data: [cloudcast({ key: "/theoriginalbonhomme/second/", name: "Second", url: "https://www.mixcloud.com/theoriginalbonhomme/second/" })], paging: { next: null } },
  ];
  const items = await fetchCloudcasts(async (url) => {
    requested.push(url);
    return { ok: true, json: async () => pages[requested.length - 1] };
  });
  assert.equal(items.length, 2);
  assert.equal(requested.length, 2);

  await assert.rejects(
    fetchCloudcasts(async () => ({
      ok: true,
      json: async () => ({ data: [], paging: { next: "https://example.com/elsewhere" } }),
    })),
    /unsupported pagination URL/,
  );
});
