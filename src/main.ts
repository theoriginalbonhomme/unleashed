import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import siteData from "../data/site.json";
import artistData from "../data/artists.json";
import releaseData from "../data/releases.json";
import playlistData from "../data/playlists.json";
import collabData from "../data/collabs.json";
import bhLogoUrl from "../img/bonhomme-bh.svg";
import portraitUrl from "../img/bonhomme-portrait.svg";
import sealUrl from "../img/bonhomme-seal.svg";
import wordmarkUrl from "../img/bonhomme-wordmark.svg";
import { copy } from "./copy";
import "./styles.css";

type Artist = {
  slug: string;
  name: string;
  aliases?: string[];
  roles?: string[];
  based?: string;
  bio?: string;
  offers?: string;
  looking_for?: string;
  creates?: string;
  links?: string[];
  contact?: string;
  open_to_unleash?: boolean;
  photo?: string;
  color?: string;
  sections?: { alias?: string; role: string; types?: string[] }[];
  wordmark?: string;
  meaning?: string;
  invited_by?: string | null;
  inviter?: { name: string; slug: string } | null;
};

type Release = {
  id: string;
  title: string;
  artists?: string[];
  alias?: string;
  type: string;
  date?: string;
  length?: string;
  bpm?: string;
  genre?: string;
  url?: string;
  download?: string;
  original_lost?: boolean;
  mood?: string;
  place?: string;
};

type Playlist = {
  id: string;
  title: string;
  by: string;
  mood?: string;
  items: string[];
};

type Collab = {
  id: string;
  title: string;
  by: string;
  date?: string;
  have?: string;
  need?: string[];
  text?: string;
  link?: string;
  status?: string;
};

type ProfileRow = {
  id: string;
  slug: string;
  name: string;
  roles: string[];
  location: string;
  bio: string;
  offers: string;
  looking_for: string;
  creates: string;
  links: string[];
  contact: string;
  photo_path: string | null;
  status: "pending" | "live" | "paused";
  invited_by: string | null;
  created_at: string;
};

type InviteRow = {
  id: string;
  code: string;
  created_by: string;
  email: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

type SubscriberRow = {
  id: string;
  email: string;
  consented_at: string;
  unsubscribed_at: string | null;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "slug" | "name">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      invites: {
        Row: InviteRow;
        Insert: Partial<InviteRow> & Pick<InviteRow, "code" | "created_by" | "email" | "expires_at">;
        Update: Partial<InviteRow>;
        Relationships: [];
      };
      roles_admin: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      subscribers: {
        Row: SubscriberRow;
        Insert: Pick<SubscriberRow, "email">;
        Update: Partial<SubscriberRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_invite: { Args: { p_code: string }; Returns: boolean };
      create_invite: {
        Args: { p_email: string };
        Returns: { id: string; code: string; expires_at: string }[];
      };
      submit_invited_profile: {
        Args: {
          p_code: string;
          p_slug: string;
          p_name: string;
          p_roles: string[];
          p_location: string;
          p_bio: string;
          p_offers: string;
          p_looking_for: string;
          p_creates: string;
          p_intention: string;
          p_links: string[];
          p_contact: string;
          p_photo_path?: string | null;
        };
        Returns: string;
      };
      get_profile_intentions: {
        Args: { p_profile_ids: string[] };
        Returns: { profile_id: string; intention: string }[];
      };
      get_live_profile_inviters: {
        Args: { p_profile_ids: string[] };
        Returns: { profile_id: string; inviter_name: string; inviter_slug: string }[];
      };
      admin_review_profile: {
        Args: { p_profile_id: string; p_approve: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(copy.messages.incompleteShell);
  return element;
}

const appView = requireElement<HTMLElement>("#view");
const toastElement = requireElement<HTMLElement>("#toast");

const site = siteData as { repo?: string; tagline?: string; intro?: string; support_url?: string; support_note?: string };
const artists = artistData as Artist[];
const releases = (releaseData as Release[]).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
const playlists = playlistData as Playlist[];
const collabs = collabData as Collab[];
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, { auth: { detectSessionInUrl: false } })
  : null;

let typeFilter: string = copy.library.all;
let roleFilter: string = copy.artists.all;
let searchQuery = "";
let playlistFilter: string = copy.artists.all;
let toastTimer: number | undefined;
let authCallbackMessage = "";
const pendingInviteKey = "unleashed.pending-invite";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function safeUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function assetPath(value: string | null | undefined): string {
  if (!value) return "";
  const assets: Record<string, string> = {
    "img/bonhomme-bh.svg": bhLogoUrl,
    "img/bonhomme-portrait.svg": portraitUrl,
    "img/bonhomme-seal.svg": sealUrl,
    "img/bonhomme-wordmark.svg": wordmarkUrl,
  };
  return assets[value] ?? safeUrl(value);
}

function showToast(message: string): void {
  toastElement.textContent = message;
  toastElement.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastElement.hidden = true;
  }, 2800);
}

function setMessage(element: Element | null, message: string, kind: "error" | "success" | "notice" = "notice"): void {
  if (!element) return;
  element.textContent = message;
  element.className = kind;
  element.setAttribute("role", "status");
}

function initialiseShell(): void {
  document.title = copy.brand.documentTitle;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = copy.brand.metaDescription;
  const word = document.querySelector<HTMLElement>(".word");
  if (word) word.innerHTML = `${escapeHtml(copy.brand.titleStart)}<span>${escapeHtml(copy.brand.titleEnd)}</span>`;
  const tagline = document.querySelector<HTMLElement>("#tagline");
  if (tagline) tagline.textContent = site.tagline || copy.brand.taglineFallback;
  const logo = document.querySelector<HTMLImageElement>(".bh");
  if (logo) {
    logo.src = assetPath("img/bonhomme-bh.svg");
    logo.alt = copy.brand.headerLogoAlt;
  }
  const byline = document.querySelector<HTMLElement>("#platform-line");
  if (byline) byline.textContent = copy.brand.platform;
  const navLabels = [copy.brand.channel, copy.brand.library, copy.brand.artists];
  document.querySelectorAll<HTMLElement>("nav a").forEach((link, index) => {
    link.textContent = navLabels[index] ?? "";
  });
  const nav = document.querySelector("nav");
  if (nav) nav.setAttribute("aria-label", copy.brand.sectionsLabel);
  const invitationPrompt = document.querySelector<HTMLElement>("#invitation-prompt-text");
  if (invitationPrompt) invitationPrompt.textContent = copy.brand.invitationPrompt;
  const invitationJoin = document.querySelector<HTMLAnchorElement>("#invitation-join");
  if (invitationJoin) invitationJoin.textContent = copy.brand.join;
  const accountArea = document.querySelector<HTMLElement>("#account-area");
  if (accountArea) accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
  const browseOldRender = document.querySelector<HTMLAnchorElement>("#browse-old-render");
  if (browseOldRender) {
    browseOldRender.textContent = copy.brand.browseOldRender;
    browseOldRender.href = `${location.pathname}?downloadable=1#library`;
  }
  const unleash = document.querySelector<HTMLAnchorElement>("#unleash");
  if (unleash) {
    unleash.textContent = copy.brand.unleash;
    unleash.href = "#collab";
  }
  const footer = document.querySelectorAll<HTMLElement>("footer span");
  if (footer[0]) footer[0].textContent = copy.brand.footer;
  if (footer[1]) footer[1].textContent = copy.brand.footerTagline;
  const loading = appView.querySelector<HTMLElement>(".note");
  if (loading) loading.textContent = copy.brand.loading;
}

async function updateAccountHeader(): Promise<void> {
  const accountArea = document.querySelector<HTMLElement>("#account-area");
  if (!accountArea) return;
  if (!supabase) {
    accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
    showToast(`${copy.messages.signInError} ${error.message}`);
    return;
  }
  const user = data.session?.user;
  if (!user) {
    accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
    return;
  }

  const [{ data: profile, error: profileError }, { data: admin, error: adminError }] = await Promise.all([
    supabase.from("profiles").select("name,slug,status").eq("id", user.id).maybeSingle(),
    supabase.from("roles_admin").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileError) {
    showToast(`${copy.brand.accountNameError} ${profileError.message}`);
  }
  if (adminError) {
    showToast(`${copy.messages.curatorCheckError} ${adminError.message}`);
  }
  const name = profile?.name || user.email || copy.brand.signedIn;
  const pendingInvite = !profile ? sessionStorage.getItem(pendingInviteKey) : null;
  const myProfileHref = profile?.status === "live" && profile.slug
    ? `#artist-${encodeURIComponent(profile.slug)}`
    : pendingInvite
      ? `${import.meta.env.BASE_URL}?invite=${encodeURIComponent(pendingInvite)}#join`
      : "#join";
  accountArea.innerHTML = `<details class="account-menu"><summary>${escapeHtml(copy.join.signedInAs)} ${escapeHtml(name)}</summary><div class="account-menu-items">
    <a href="${escapeHtml(myProfileHref)}">${escapeHtml(copy.brand.myProfile)}</a>
    ${admin ? `<a href="#curator">${escapeHtml(copy.brand.curatorDesk)}</a>` : ""}
    <button type="button" class="account-sign-out">${escapeHtml(copy.brand.signOut)}</button>
  </div></details>`;
  accountArea.querySelectorAll<HTMLAnchorElement>(".account-menu-items a").forEach((link) => {
    link.addEventListener("click", () => {
      const menu = accountArea.querySelector<HTMLDetailsElement>(".account-menu");
      if (menu) menu.open = false;
    });
  });
  accountArea.querySelector<HTMLButtonElement>(".account-sign-out")?.addEventListener("click", async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      showToast(`${copy.messages.signOutError} ${signOutError.message}`);
      return;
    }
    showToast(copy.messages.signOutSuccess);
    await updateAccountHeader();
    await render();
  });
}

const staticArtist = (slug: string): Artist | undefined => artists.find((artist) => artist.slug === slug);
const artistName = (slug: string): string => staticArtist(slug)?.name ?? slug;

function platform(value: string): string {
  const url = safeUrl(value);
  if (!url) return copy.profile.link;
  const host = new URL(url).hostname.toLowerCase();
  if (host === "soundcloud.com" || host.endsWith(".soundcloud.com")) return copy.brand.platforms.soundcloud;
  if (host === "mixcloud.com" || host.endsWith(".mixcloud.com")) return copy.brand.platforms.mixcloud;
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return copy.brand.platforms.youtube;
  if (host.endsWith(".bandcamp.com")) return copy.brand.platforms.bandcamp;
  return copy.profile.link;
}

function embed(value: string): string {
  const url = safeUrl(value);
  if (!url) return "";
  const kind = platform(url);
  if (kind === "SoundCloud") {
    return `<iframe height="166" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2300B8C7&auto_play=false&visual=false" title="${escapeHtml(copy.profile.soundCloudPlayer)}"></iframe>`;
  }
  if (kind === "Mixcloud") {
    const path = new URL(url).pathname;
    return `<iframe height="120" allow="autoplay" src="https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(path)}&autoplay=0&hide_cover=1" title="${escapeHtml(copy.profile.mixcloudPlayer)}"></iframe>`;
  }
  if (kind === "YouTube") {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (match) {
      return `<iframe class="yt" allow="autoplay; encrypted-media" allowfullscreen src="https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=0" title="${escapeHtml(copy.profile.youtubePlayer)}"></iframe>`;
    }
  }
  return "";
}

function credits(release: Release): string {
  return (release.artists ?? []).map((slug) => {
    const href = `#artist-${encodeURIComponent(slug)}`;
    return staticArtist(slug)
      ? `<a href="${escapeHtml(href)}">${escapeHtml(artistName(slug))}</a>`
      : escapeHtml(slug);
  }).join(" × ");
}

function releaseRow(release: Release, showArtists = true): string {
  const url = safeUrl(release.url);
  const download = safeUrl(release.download);
  const kind = url ? platform(url) : "";
  const canPlay = Boolean(url && embed(url));
  const metadata = [
    `<span class="type">${escapeHtml(/collab/i.test(release.type) ? copy.profile.unleashed : release.type)}</span>`,
    showArtists ? `<span>${credits(release)}</span>` : "",
    release.alias ? `<span>${escapeHtml(copy.profile.as)} ${escapeHtml(release.alias)}</span>` : "",
    release.bpm ? `<span>${escapeHtml(release.bpm)} ${escapeHtml(copy.profile.bpm)}</span>` : "",
    release.length ? `<span>${escapeHtml(release.length)}</span>` : "",
    release.genre ? `<span>${escapeHtml(release.genre)}</span>` : "",
    release.mood ? `<span class="mood">${escapeHtml(release.mood)}</span>` : "",
    release.place ? `<span>${escapeHtml(copy.profile.madeIn)} ${escapeHtml(release.place)}</span>` : "",
    release.date ? `<span>${escapeHtml(release.date)}</span>` : "",
    kind ? `<span class="plat">${escapeHtml(kind)}</span>` : "",
  ].filter(Boolean).join("");
  return `<div class="rel" id="r-${escapeHtml(release.id)}"><div class="t">${escapeHtml(release.title)}</div><div class="acts">
    ${canPlay ? `<button class="btn solid" data-play="${escapeHtml(release.id)}">${escapeHtml(copy.library.play)}</button>` : ""}
    ${url ? `<a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(copy.library.open)}</a>` : ""}
    ${download ? `<button class="btn uv" data-give="${escapeHtml(release.id)}">${escapeHtml(copy.library.download)}</button>` : `<span class="btn ghost" title="${escapeHtml(release.original_lost ? copy.library.originalGone : copy.library.noDownload)}">${escapeHtml(copy.library.streamOnly)}</span>`}
  </div><div class="m">${metadata}</div><div class="slot"></div></div>`;
}

function wirePlay(): void {
  appView.querySelectorAll<HTMLButtonElement>("[data-play]").forEach((button) => {
    button.addEventListener("click", () => {
      const release = releases.find((item) => item.id === button.dataset.play);
      const slot = button.closest(".rel")?.querySelector<HTMLElement>(".slot");
      if (!release || !slot) return;
      appView.querySelectorAll<HTMLElement>(".slot").forEach((other) => {
        if (other !== slot) other.innerHTML = "";
      });
      appView.querySelectorAll<HTMLButtonElement>("[data-play]").forEach((other) => {
        other.textContent = copy.library.play;
      });
      if (slot.innerHTML) {
        slot.innerHTML = "";
        return;
      }
      slot.innerHTML = embed(release.url ?? "");
      button.textContent = copy.library.close;
    });
  });
  appView.querySelectorAll<HTMLButtonElement>("[data-give]").forEach((button) => {
    button.addEventListener("click", () => openGive(button));
  });
}

function openGive(button: HTMLButtonElement): void {
  const release = releases.find((item) => item.id === button.dataset.give);
  const slot = button.closest(".rel")?.querySelector<HTMLElement>(".slot");
  const download = safeUrl(release?.download);
  if (!release || !slot || !download) return;
  if (slot.querySelector(".give")) {
    slot.innerHTML = "";
    return;
  }
  slot.innerHTML = `<div class="give"><b>${escapeHtml(copy.exchange.title)}</b><p class="note">${escapeHtml(copy.exchange.description)}</p>
    <div class="tools" role="radiogroup" aria-label="${escapeHtml(copy.exchange.radioLabel)}">${[
      ["track", copy.exchange.track],
      ["photo", copy.exchange.photo],
      ["message", copy.exchange.message],
      ["money", copy.exchange.money],
    ].map(([key, label]) => `<button class="chip" type="button" role="radio" aria-checked="false" data-kind="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join("")}</div>
    <div class="give-in"></div><div><a class="btn uv" hidden href="${escapeHtml(download)}" target="_blank" rel="noopener">${escapeHtml(copy.exchange.download)} ${escapeHtml(release.title)}</a></div></div>`;
  const panel = slot.querySelector<HTMLElement>(".give");
  const inputContainer = slot.querySelector<HTMLElement>(".give-in");
  const downloadButton = slot.querySelector<HTMLAnchorElement>("a.btn");
  if (!panel || !inputContainer || !downloadButton) return;
  panel.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((choice) => {
    choice.addEventListener("click", () => {
      panel.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((other) => {
        other.setAttribute("aria-checked", String(other === choice));
        other.setAttribute("aria-pressed", String(other === choice));
      });
      const kind = choice.dataset.kind;
      downloadButton.hidden = true;
      if (kind === "money") {
        inputContainer.textContent = copy.exchange.moneyComingSoon;
        return;
      }
      const field = kind === "track"
        ? `<label class="note" for="give-${escapeHtml(release.id)}">${escapeHtml(copy.exchange.trackLabel)}</label><input id="give-${escapeHtml(release.id)}" type="url" placeholder="${escapeHtml(copy.exchange.trackPlaceholder)}">`
        : kind === "photo"
          ? `<label class="note" for="give-${escapeHtml(release.id)}">${escapeHtml(copy.exchange.photoLabel)}</label><input id="give-${escapeHtml(release.id)}" type="file" accept="image/*">`
          : `<label class="note" for="give-${escapeHtml(release.id)}">${escapeHtml(copy.exchange.messageLabel)}</label><input id="give-${escapeHtml(release.id)}" type="text" placeholder="${escapeHtml(copy.exchange.messagePlaceholder)}">`;
      inputContainer.innerHTML = field;
      const input = inputContainer.querySelector<HTMLInputElement>("input");
      const updateAvailability = () => {
        if (!input) return;
        const valid = input.type === "file"
          ? Boolean(input.files?.length)
          : input.type === "url"
            ? Boolean(safeUrl(input.value.trim()))
            : input.value.trim().length > 1;
        downloadButton.hidden = !valid;
      };
      input?.addEventListener("input", updateAvailability);
      input?.addEventListener("change", updateAvailability);
    });
  });
}

function textBlocks(value: string | undefined): string {
  const output: string[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    output.push(`<ul class="profile-list">${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    bullets = [];
  };
  for (const line of (value ?? "").split(/\r?\n/)) {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      if (line.trim()) output.push(`<p class="lead">${escapeHtml(line)}</p>`);
    }
  }
  flushBullets();
  return output.join("");
}

function card(artist: Artist): string {
  const firstLookingForLine = (artist.looking_for ?? "").split(/\r?\n/).find((line) => line.trim())?.replace(/^- /, "") ?? "";
  const image = assetPath(artist.photo) || sealUrl;
  return `<article class="card"><img class="card-seal" src="${escapeHtml(image)}" alt="" width="48" height="48"><div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}</div>
    <h4><a href="#artist-${encodeURIComponent(artist.slug)}">${escapeHtml(artist.name)}</a></h4>${artist.based ? `<span class="note based-line">${escapeHtml(artist.based)}</span>` : ""}
    ${firstLookingForLine ? `<div><span class="k accent-label">${escapeHtml(copy.profile.lookingFor)}</span><br><span class="card-looking">${escapeHtml(firstLookingForLine)}</span></div>` : ""}${artist.open_to_unleash !== false ? `<span class="open accent-yellow">${escapeHtml(copy.profile.openToUnleash)}</span>` : ""}</article>`;
}

function playlistFor(artist: Artist): Playlist[] {
  return playlists.filter((playlist) => playlist.by === artist.slug);
}

function workGroup(release: Release): "dj" | "production" | "unleashed" {
  const type = release.type.toLowerCase();
  if ((release.artists ?? []).length > 1 || type.includes("collab") || type.includes("unleash")) return "unleashed";
  return /dj mix|dj set|live set/.test(type) ? "dj" : "production";
}

function contactHref(artist: Artist): string {
  const url = safeUrl(artist.contact);
  if (url) return url;
  const email = artist.contact?.trim() ?? "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? `mailto:${encodeURIComponent(email)}` : "#collab";
}

function unleashButton(artist: Artist): string {
  return artist.open_to_unleash === false
    ? ""
    : `<a class="btn uv" href="${escapeHtml(contactHref(artist))}">${escapeHtml(copy.profile.unleashTrack)}</a>`;
}

function workSection(title: string, releasesForSection: Release[], emptyMessage: string, showArtists = false): string {
  return `<section class="stack"><h3 class="crate accent-label"><span>${escapeHtml(title)}</span><span>${releasesForSection.length}</span></h3><div class="list">${releasesForSection.map((release) => releaseRow(release, showArtists)).join("") || `<div class="empty">${escapeHtml(emptyMessage)}</div>`}</div></section>`;
}

function profile(artist: Artist): string {
  const releasesForArtist = releases.filter((release) => (release.artists ?? []).includes(artist.slug));
  const artistPlaylists = playlistFor(artist);
  const selectedPlaylist = artistPlaylists.find((playlist) => playlist.id === playlistFilter);
  const playlistItems = selectedPlaylist ? new Set(selectedPlaylist.items) : null;
  const profileWorks = (group: "dj" | "production" | "unleashed") => releasesForArtist
    .filter((release) => workGroup(release) === group && (!playlistItems || playlistItems.has(release.id)));
  const portrait = assetPath(artist.photo) || sealUrl;
  const wordmark = assetPath(artist.wordmark);
  const inviter = artist.inviter;
  const links = (artist.links ?? []).map((link) => {
    const url = safeUrl(link);
    return url ? `<a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(platform(url))}</a>` : "";
  }).join("");
  const sections = [
    [copy.profile.offersTitle, copy.profile.offersSubtitle, artist.offers],
    [copy.profile.lookingFor, copy.profile.lookingForSubtitle, artist.looking_for],
    [copy.profile.createsTitle, copy.profile.createsSubtitle, artist.creates],
  ] as const;
  return `<div class="stack" style="gap:24px"><a class="back" href="#artists">${escapeHtml(copy.profile.back)}</a>
    <section class="hero">
      <img class="portrait" src="${escapeHtml(portrait)}" alt="${escapeHtml(copy.profile.portraitAlt)} ${escapeHtml(artist.name)}" width="640" height="640">
      <div class="hero-txt"><div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}</div>
        ${wordmark ? `<h2 class="h" style="margin:0"><img class="wmark" src="${escapeHtml(wordmark)}" alt="${escapeHtml(artist.name)}"></h2>` : `<h2 class="h">${escapeHtml(artist.name)}</h2>`}
        ${artist.aliases?.length ? `<span class="k">${escapeHtml(copy.profile.alsoKnownAs)} ${artist.aliases.map(escapeHtml).join(" · ")}</span>` : ""}
        <div class="hero-meta">${artist.based ? `<span class="based-line">${escapeHtml(artist.based)}</span>` : ""}${artist.open_to_unleash !== false ? `<span class="open accent-yellow">${escapeHtml(copy.profile.openToUnleash)}</span>` : ""}${inviter ? `<span>${escapeHtml(copy.profile.invitedBy)} <a href="#artist-${encodeURIComponent(inviter.slug)}">${escapeHtml(inviter.name)}</a></span>` : ""}</div>
        ${unleashButton(artist)}
        <div class="links">${links}</div></div>
    </section>
    ${artist.bio ? `<section class="stack profile-copy">${textBlocks(artist.bio)}</section>` : ""}
    ${sections.map(([title, subtitle, content]) => content?.trim()
      ? `<section class="stack profile-copy"><h3 class="crate accent-label"><span>${escapeHtml(title)}</span><span>${escapeHtml(subtitle)}</span></h3>${textBlocks(content)}</section>`
      : "").join("")}
    ${artistPlaylists.length ? `<div class="tools"><span class="k">${escapeHtml(copy.profile.playlists)}</span><button class="chip" data-pl="All" aria-pressed="${!selectedPlaylist}">${escapeHtml(copy.profile.everything)}</button>${artistPlaylists.map((playlist) => `<button class="chip" data-pl="${escapeHtml(playlist.id)}" aria-pressed="${selectedPlaylist?.id === playlist.id}">${escapeHtml(playlist.title)} · ${playlist.items.length}</button>`).join("")}</div>` : ""}
    <div class="stack profile-works">
      ${workSection(copy.profile.djSets, profileWorks("dj"), copy.profile.nothingYet)}
      ${workSection(copy.profile.productions, profileWorks("production"), copy.profile.nothingYet)}
      ${workSection(copy.profile.unleashed, profileWorks("unleashed"), copy.profile.firstUnleash, true)}
    </div></div>`;
}

function contributionHref(): string {
  return `${location.pathname}?downloadable=1#library`;
}

function subscriberForm(): string {
  return `<section class="stack subscriber-block"><h3 class="crate"><span>${escapeHtml(copy.subscriber.title)}</span></h3>
    <p class="note">${escapeHtml(copy.subscriber.text)}</p>
    <form class="subscriber-form stack">
      <label for="subscriber-email">${escapeHtml(copy.subscriber.email)}</label>
      <input id="subscriber-email" name="email" type="email" autocomplete="email" required>
      <label class="subscriber-consent"><input name="consent" type="checkbox" required> <span>${escapeHtml(copy.subscriber.consent)}</span></label>
      <button class="btn uv" type="submit">${escapeHtml(copy.subscriber.notify)}</button>
      <p class="subscriber-message note" aria-live="polite"></p>
    </form>
  </section>`;
}

function wireSubscriberForms(): void {
  appView.querySelectorAll<HTMLFormElement>(".subscriber-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!supabase) {
        setMessage(form.querySelector(".subscriber-message"), copy.messages.configMissing, "error");
        return;
      }
      const values = new FormData(form);
      const email = String(values.get("email") ?? "").trim().toLowerCase();
      if (!values.has("consent")) return;
      const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
      if (submit) submit.disabled = true;
      const { error } = await supabase.from("subscribers").insert({ email });
      if (submit) submit.disabled = false;
      if (error) {
        setMessage(form.querySelector(".subscriber-message"), `${copy.messages.subscriberSubmitError} ${error.message}`, "error");
        return;
      }
      form.reset();
      setMessage(form.querySelector(".subscriber-message"), copy.subscriber.thanks, "success");
    });
  });
}

function channelView(): string {
  const artist = staticArtist("bonhomme") ?? artists[0];
  const intro = site.intro ? `<p class="intro">${escapeHtml(site.intro)}</p>` : "";
  if (!artist) return `<div class="empty">${escapeHtml(copy.profile.noProfile)}</div>`;
  const latest = releases.find((release) => /dj mix|dj set|live set|track/i.test(release.type) && Boolean(embed(release.url ?? "")));
  const latestPlayer = latest
    ? `<section class="stack"><h3 class="crate"><span>${escapeHtml(copy.channel.latestWork)}</span><span>${escapeHtml(latest.date ?? "")}</span></h3><div class="feature-player"><div class="feature-embed">${embed(latest.url ?? "")}</div><div class="feature-copy"><b>${escapeHtml(latest.title)}</b><div class="m">${credits(latest)}${latest.place ? ` · ${escapeHtml(latest.place)}` : ""}</div><a class="btn uv" href="${escapeHtml(contributionHref())}">${escapeHtml(copy.channel.browseOldRender)}</a></div></div></section>`
    : `<div class="empty">${escapeHtml(copy.profile.noMusic)}</div>`;
  const newest = (group: "dj" | "production" | "unleashed") => releases.filter((release) => workGroup(release) === group).slice(0, 4);
  const openCalls = collabs.filter((call) => (call.status ?? "").toLowerCase() === "open");
  const callsMarkup = openCalls.map((call) => {
    const callArtist = staticArtist(call.by);
    return `<article class="card"><span class="k">${escapeHtml(call.date ?? "")}</span><h4>${escapeHtml(call.title)}</h4><p>${escapeHtml(call.text ?? call.have ?? "")}</p>${callArtist ? unleashButton(callArtist) : ""}<a class="btn" href="#collab">${escapeHtml(copy.collab.openAll)}</a></article>`;
  }).join("");
  return `${intro}<div class="stack channel-content">${latestPlayer}
    <div class="stack home-works">${workSection(copy.channel.djSets, newest("dj"), copy.profile.nothingYet)}${workSection(copy.channel.productions, newest("production"), copy.profile.nothingYet)}${workSection(copy.channel.unleashed, newest("unleashed"), copy.profile.firstUnleash, true)}</div>
    <section class="stack"><h3 class="crate"><span>${escapeHtml(copy.channel.openCalls)}</span><a href="#collab">${escapeHtml(copy.collab.openAll)}</a></h3><div class="cards">${callsMarkup || `<div class="empty">${escapeHtml(copy.collab.empty)}</div>`}</div></section>
    ${subscriberForm()}
    <p class="note channel-meaning">${escapeHtml(copy.channel.meaning)} <a href="#artist-bonhomme">${escapeHtml(copy.channel.readProfile)}</a></p>
  </div>`;
}

function libraryView(): string {
  const types = [copy.library.all, ...new Set(releases.map((release) => release.type))];
  const query = searchQuery.toLowerCase();
  const downloadableOnly = new URLSearchParams(location.search).get("downloadable") === "1";
  const list = releases.filter((release) => (typeFilter === copy.library.all || release.type === typeFilter)
    && (!downloadableOnly || Boolean(safeUrl(release.download)))
    && (!query || [release.title, release.genre, release.bpm, release.alias, release.mood, release.place, ...(release.artists ?? []).map(artistName)]
      .join(" ").toLowerCase().includes(query)));
  return `<div class="stack"><h2 class="h">${escapeHtml(copy.library.title)}</h2><p class="note">${escapeHtml(copy.library.description)}</p>
    <div class="tools"><input type="search" id="q" placeholder="${escapeHtml(copy.library.search)}" value="${escapeHtml(searchQuery)}" aria-label="${escapeHtml(copy.library.search)}">${types.map((type) => `<button class="chip" data-t="${escapeHtml(type)}" aria-pressed="${type === typeFilter}">${escapeHtml(type)}</button>`).join("")}</div>
    ${downloadableOnly ? `<p class="note">${escapeHtml(copy.library.downloadableOnly)}</p>` : ""}
    <div class="list">${list.map((release) => releaseRow(release)).join("") || `<div class="empty">${escapeHtml(downloadableOnly ? copy.library.noDownloadable : list.length ? copy.library.noResults : copy.library.empty)}</div>`}</div></div>`;
}

function artistsView(liveArtists: Artist[]): string {
  const allArtists = [...artists];
  liveArtists.forEach((live) => {
    if (!allArtists.some((artist) => artist.slug === live.slug)) allArtists.push(live);
  });
  const roles = [copy.artists.all, ...new Set(allArtists.flatMap((artist) => artist.roles ?? []))];
  const filtered = allArtists.filter((artist) => roleFilter === copy.artists.all || (artist.roles ?? []).includes(roleFilter));
  return `<div class="stack"><h2 class="h">${escapeHtml(copy.artists.title)}</h2><p class="note">${escapeHtml(copy.artists.description)}</p>
    <div class="tools">${roles.map((role) => `<button class="chip" data-r="${escapeHtml(role)}" aria-pressed="${role === roleFilter}">${escapeHtml(role)}</button>`).join("")}</div>
    <div class="cards">${filtered.map(card).join("") || `<div class="empty">${escapeHtml(copy.artists.noRole)}</div>`}</div>
    <p class="note">${escapeHtml(copy.artists.joinInvite)} <a href="#join">${escapeHtml(copy.artists.apply)}</a>.</p></div>`;
}

function collabView(): string {
  const repo = site.repo || "theoriginalbonhomme/theoriginalbonhomme.github.io";
  const url = `https://github.com/${repo}/issues/new`;
  return `<div class="stack"><div class="mast" style="align-items:center"><h2 class="h">${escapeHtml(copy.collab.title)}</h2><a class="btn uv" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(copy.collab.postCall)}</a></div>
    <p class="note">${escapeHtml(copy.collab.description)}</p>
    <div class="cards">${collabs.map((call) => {
      const callArtist = staticArtist(call.by);
      return `<article class="card"><span class="k">${escapeHtml(call.status || copy.collab.statusOpen)} · ${escapeHtml(call.date ?? "")}</span><h4>${escapeHtml(call.title)}</h4>
        <div><span class="k">${escapeHtml(copy.collab.from)}</span><br>${callArtist ? `<a href="#artist-${encodeURIComponent(call.by)}">${escapeHtml(callArtist.name)}</a>` : escapeHtml(call.by)}</div>
        <div><span class="k">${escapeHtml(copy.collab.have)}</span><br>${escapeHtml(call.have ?? "")}</div>
        <div><span class="k">${escapeHtml(copy.collab.needs)}</span><div class="roles" style="margin-top:4px">${(call.need ?? []).map((need) => `<span class="role">${escapeHtml(need)}</span>`).join("")}</div></div>
        ${call.text ? `<p>${escapeHtml(call.text)}</p>` : ""}
        ${callArtist ? unleashButton(callArtist) : ""}
        ${safeUrl(call.link) ? `<div><a class="btn" href="${escapeHtml(safeUrl(call.link))}" target="_blank" rel="noopener">${escapeHtml(copy.collab.hear)}</a></div>` : ""}</article>`;
    }).join("") || `<div class="empty">${escapeHtml(copy.collab.empty)}</div>`}</div></div>`;
}

function joinViewMarkup(): string {
  return `<div class="stack" style="gap:22px"><h2 class="h">${escapeHtml(copy.join.title)}</h2>
    <p class="lead">${escapeHtml(copy.join.lead)}</p>
    <div class="steps">
      <div class="step"><b>${escapeHtml(copy.join.apply)}</b><span>${escapeHtml(copy.join.applyText)}</span><span class="note">${escapeHtml(copy.join.inviteOnly)}</span></div>
      <div class="step"><b>${escapeHtml(copy.join.signIn)}</b><span>${escapeHtml(copy.join.signInText)}</span><div id="join-panel"><p class="note">${escapeHtml(copy.brand.loading)}</p></div></div>
      <div class="step"><b>${escapeHtml(copy.join.verifyIntention)}</b><span>${escapeHtml(copy.join.verifyIntentionText)}</span></div>
      <div class="step"><b>${escapeHtml(copy.join.makeThings)}</b><span>${escapeHtml(copy.join.makeText)}</span></div>
    </div>
    ${subscriberForm()}</div>`;
}

function signInViewMarkup(): string {
  return `<div class="stack sign-in-view"><h2 class="h">${escapeHtml(copy.brand.signInTitle)}</h2>
    <form class="stack" id="sign-in-form">
      <label for="sign-in-email">${escapeHtml(copy.brand.signInEmail)}</label>
      <input id="sign-in-email" name="email" type="email" autocomplete="email" required>
      <button class="btn uv" type="submit">${escapeHtml(copy.brand.sendMeLink)}</button>
      <p id="sign-in-message" class="note" aria-live="polite"></p>
    </form>
  </div>`;
}

function wireSignInForm(): void {
  const form = appView.querySelector<HTMLFormElement>("#sign-in-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector<HTMLElement>("#sign-in-message");
    if (!supabase) {
      setMessage(message, copy.messages.configMissing, "error");
      return;
    }
    const email = String(new FormData(form).get("email") ?? "").trim();
    const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (submit) submit.disabled = true;
    const redirect = new URL(import.meta.env.BASE_URL, location.origin).href;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect, shouldCreateUser: false },
    });
    if (submit) submit.disabled = false;
    setMessage(message, error ? `${copy.messages.linkError} ${error.message}` : copy.brand.signInSent, error ? "error" : "success");
  });
}

function artistView(slug: string, liveArtists: Artist[]): string {
  const artist = staticArtist(slug) ?? liveArtists.find((candidate) => candidate.slug === slug);
  return artist
    ? profile(artist)
    : `<div class="empty">${escapeHtml(copy.artists.notLive)} <a href="#artists">${escapeHtml(copy.artists.allArtists)}</a>.</div>`;
}

function routeName(): { view: string; arg: string } {
  let hash = location.hash || "#channel";
  try {
    hash = decodeURIComponent(hash);
  } catch {
    return { view: "channel", arg: "" };
  }
  const route = hash.slice(1);
  return route.startsWith("artist-")
    ? { view: "artist", arg: route.slice("artist-".length) }
    : route === "curator"
      ? { view: "join", arg: "curator" }
      : { view: ["channel", "library", "artists", "collab", "join", "signin"].includes(route) ? route : "channel", arg: "" };
}

async function getLiveProfiles(): Promise<Artist[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id,slug,name,roles,location,bio,offers,looking_for,creates,links,contact,photo_path,status,invited_by,created_at")
    .eq("status", "live")
    .order("name");
  if (error) {
    showToast(`${copy.messages.loadProfilesError} ${error.message}`);
    return [];
  }
  const rows = data ?? [];
  const inviterIds = [...new Set(rows.map((row) => row.invited_by).filter((id): id is string => Boolean(id)))];
  const inviters = new Map<string, { name: string; slug: string }>();
  if (inviterIds.length) {
    const { data: inviterRows, error: inviterError } = await supabase.rpc("get_live_profile_inviters", {
      p_profile_ids: rows.filter((row) => Boolean(row.invited_by)).map((row) => row.id),
    });
    if (inviterError) {
      showToast(`${copy.messages.loadProfilesError} ${inviterError.message}`);
    } else {
      (inviterRows ?? []).forEach((row) => inviters.set(row.profile_id, { name: row.inviter_name, slug: row.inviter_slug }));
    }
  }
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    roles: row.roles,
    based: row.location,
    bio: row.bio,
    offers: row.offers,
    looking_for: row.looking_for,
    creates: row.creates,
    links: row.links,
    contact: row.contact,
    photo: row.photo_path ?? undefined,
    open_to_unleash: true,
    invited_by: row.invited_by,
    inviter: row.invited_by ? inviters.get(row.invited_by) ?? null : null,
  }));
}

function wireLibrary(): void {
  wirePlay();
  appView.querySelectorAll<HTMLButtonElement>("[data-t]").forEach((button) => {
    button.addEventListener("click", () => {
      typeFilter = button.dataset.t ?? copy.library.all;
      void render();
    });
  });
  const search = appView.querySelector<HTMLInputElement>("#q");
  if (search) {
    search.addEventListener("input", () => {
      searchQuery = search.value;
      const selection = search.selectionStart ?? search.value.length;
      void render().then(() => {
        const nextSearch = appView.querySelector<HTMLInputElement>("#q");
        nextSearch?.focus();
        nextSearch?.setSelectionRange(selection, selection);
      });
    });
  }
}

function wireProfile(): void {
  appView.querySelectorAll<HTMLButtonElement>("[data-pl]").forEach((button) => {
    button.addEventListener("click", () => {
      playlistFilter = button.dataset.pl ?? copy.artists.all;
      void render();
    });
  });
}

function wireArtists(): void {
  appView.querySelectorAll<HTMLButtonElement>("[data-r]").forEach((button) => {
    button.addEventListener("click", () => {
      roleFilter = button.dataset.r ?? copy.artists.all;
      void render();
    });
  });
}

async function handleInvite(email: string): Promise<void> {
  if (!supabase) throw new Error(copy.messages.configMissing);
  const { data, error } = await supabase.rpc("create_invite", { p_email: email }).single();
  if (error) throw new Error(`${copy.messages.inviteCreateError} ${error.message}`);
  const inviteUrl = `${location.origin}${location.pathname}?invite=${encodeURIComponent(data.code)}#join`;
  const message = appView.querySelector<HTMLElement>("#invite-message");
  if (message) {
    message.innerHTML = `${escapeHtml(copy.join.inviteCreated)} ${escapeHtml(new Date(data.expires_at).toLocaleDateString())}. <a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a> <button type="button" class="btn copy-invite">${escapeHtml(copy.join.copyLink)}</button>`;
    message.className = "note";
    message.querySelector(".copy-invite")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setMessage(message, copy.join.copied, "success");
      } catch {
        setMessage(message, copy.messages.copyError, "error");
      }
    });
  }
  const form = appView.querySelector<HTMLFormElement>("#invite-form");
  form?.reset();
}

async function loadCuratorDesk(currentUserId: string): Promise<string> {
  if (!supabase) return "";
  const { data: admin, error: adminError } = await supabase
    .from("roles_admin")
    .select("user_id")
    .eq("user_id", currentUserId)
    .maybeSingle();
  if (adminError) throw new Error(`${copy.messages.curatorCheckError} ${adminError.message}`);
  if (!admin) return "";

  const [
    { data: profileRows, error: profileError },
    { data: inviteRows, error: inviteError },
    { data: subscriberRows, error: subscriberError },
  ] = await Promise.all([
    supabase.from("profiles").select("id,slug,name,roles,location,bio,offers,looking_for,creates,links,contact,photo_path,status,invited_by,created_at").order("created_at"),
    supabase.from("invites").select("*").order("created_at"),
    supabase.from("subscribers").select("id,email,consented_at,unsubscribed_at,created_at").order("created_at"),
  ]);
  if (profileError) throw new Error(`${copy.messages.loadProfilesError} ${profileError.message}`);
  if (inviteError) throw new Error(`${copy.messages.inviteListError} ${inviteError.message}`);
  if (subscriberError) throw new Error(`${copy.messages.subscriberLoadError} ${subscriberError.message}`);

  const allProfiles = profileRows ?? [];
  const allInvites = inviteRows ?? [];
  const names = new Map(allProfiles.map((profile) => [profile.id, profile.name]));
  const pending = allProfiles.filter((profile) => profile.status === "pending");
  const { data: intentions, error: intentionError } = await supabase.rpc("get_profile_intentions", {
    p_profile_ids: pending.map((profile) => profile.id),
  });
  if (intentionError) throw new Error(`${copy.messages.intentionLoadError} ${intentionError.message}`);
  const intentionByProfile = new Map((intentions ?? []).map((item) => [item.profile_id, item.intention]));
  return `<section id="curator-desk" class="stack"><h3 class="crate"><span>${escapeHtml(copy.join.curatorDesk)}</span><span>${escapeHtml(copy.join.pendingApplications)}</span></h3>
    ${pending.length ? pending.map((profile) => `<article class="card pending-card" style="margin:10px 0"><span class="k">${escapeHtml(new Date(profile.created_at).toLocaleDateString())}</span><h4>${escapeHtml(profile.name)}</h4><span class="note">${escapeHtml(profile.roles.join(" · "))}${profile.location ? ` · ${escapeHtml(profile.location)}` : ""}</span><p class="lead">${escapeHtml(profile.bio)}</p><section class="stack"><h3 class="crate"><span>${escapeHtml(copy.join.intention)}</span></h3>${textBlocks(intentionByProfile.get(profile.id))}</section>${profile.invited_by ? `<p class="note">${escapeHtml(copy.profile.invitedBy)} <a href="#artist-${encodeURIComponent(allProfiles.find((inviter) => inviter.id === profile.invited_by)?.slug ?? "")}">${escapeHtml(names.get(profile.invited_by) ?? "")}</a></p>` : ""}<div class="links"><button class="btn uv" type="button" data-review="approve" data-id="${escapeHtml(profile.id)}">${escapeHtml(copy.join.approve)}</button><button class="btn" type="button" data-review="veto" data-id="${escapeHtml(profile.id)}">${escapeHtml(copy.join.veto)}</button></div></article>`).join("") : `<p class="note">${escapeHtml(copy.join.noPending)}</p>`}
    <details><summary class="k">${escapeHtml(copy.join.fullInviteTree)}</summary><ul class="journey">${allProfiles.map((profile) => `<li><b>${escapeHtml(profile.name)}</b><span class="note">${profile.invited_by ? `${escapeHtml(copy.profile.invitedBy)} ${escapeHtml(names.get(profile.invited_by) ?? "")}` : ""}${allInvites.filter((invite) => invite.created_by === profile.id).map((invite) => `<br>${escapeHtml(invite.email)} · ${escapeHtml(invite.used_by ? copy.join.used : copy.join.unused)} · ${escapeHtml(copy.join.inviteExpires)} ${escapeHtml(new Date(invite.expires_at).toLocaleDateString())}`).join("")}</span></li>`).join("") || `<li class="note">${escapeHtml(copy.join.noPending)}</li>`}</ul></details>
    <section class="stack"><h3 class="crate"><span>${escapeHtml(copy.subscriber.curatorTitle)}</span><button type="button" class="btn copy-subscriber-emails">${escapeHtml(copy.subscriber.copyAllEmails)}</button></h3>
      <ul class="subscriber-list">${(subscriberRows ?? []).map((subscriber) => `<li>${escapeHtml(subscriber.email)}</li>`).join("") || `<li class="note">${escapeHtml(copy.subscriber.empty)}</li>`}</ul>
      <p id="subscriber-copy-message" aria-live="polite"></p>
    </section><p id="review-message" aria-live="polite"></p></section>`;
}

async function joinPage(): Promise<void> {
  const panel = appView.querySelector<HTMLElement>("#join-panel");
  if (!panel) return;
  if (!supabase) {
    setMessage(panel, copy.messages.configMissing, "notice");
    return;
  }

  const code = new URLSearchParams(location.search).get("invite") ?? "";
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    setMessage(panel, `${copy.messages.signInError} ${sessionError.message}`, "error");
    return;
  }
  const user = sessionData.session?.user;
  if (!user) {
    if (code) {
      const { data: valid, error } = await supabase.rpc("check_invite", { p_code: code });
      if (error) {
        setMessage(panel, `${copy.messages.inviteCheckError} ${error.message}`, "error");
        return;
      }
      if (!valid) {
        setMessage(panel, copy.join.inviteInvalid, "error");
        return;
      }
    }
    panel.innerHTML = `${code ? "" : `<p class="note">${escapeHtml(copy.join.inviteOnly)}</p>`}<form id="magic-link-form" class="stack"><label for="join-email">${escapeHtml(copy.join.inviteEmail)}</label><input id="join-email" type="email" name="email" autocomplete="email" required><button class="btn uv" type="submit">${escapeHtml(copy.join.sendMagicLink)}</button><p id="auth-message" class="note" aria-live="polite"></p></form>`;
    panel.querySelector<HTMLFormElement>("#magic-link-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const submit = form.querySelector<HTMLButtonElement>("button");
      const message = form.querySelector<HTMLElement>("#auth-message");
      const email = String(new FormData(form).get("email") ?? "").trim();
      if (submit) {
        submit.disabled = true;
        submit.textContent = copy.join.sending;
      }
      const redirect = `${location.origin}${location.pathname}${code ? `?invite=${encodeURIComponent(code)}` : ""}#join`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect, shouldCreateUser: Boolean(code) },
      });
      if (submit) {
        submit.disabled = false;
        submit.textContent = copy.join.sendMagicLink;
      }
      setMessage(message, error ? `${copy.messages.linkError} ${error.message}` : copy.join.checkInbox, error ? "error" : "success");
    });
    return;
  }

  const { data: ownProfile, error: ownProfileError } = await supabase
    .from("profiles")
    .select("id,slug,name,roles,location,bio,offers,looking_for,creates,links,contact,photo_path,status,invited_by,created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (ownProfileError) {
    setMessage(panel, `${copy.messages.profileLoadError} ${ownProfileError.message}`, "error");
    return;
  }
  if (ownProfile) {
    const statusMessage = ownProfile.status === "pending"
      ? copy.join.profilePending
      : ownProfile.status === "live" ? copy.join.profileLive : copy.join.profilePaused;
    panel.innerHTML = `<p class="note">${escapeHtml(copy.join.signedInAs)} ${escapeHtml(user.email ?? "")}. ${escapeHtml(statusMessage)}</p><button type="button" class="btn" id="sign-out">${escapeHtml(copy.join.signOut)}</button>${ownProfile.status === "live" ? `<section class="stack" style="margin-top:14px"><h3 class="crate"><span>${escapeHtml(copy.join.inviteCreate)}</span></h3><p class="note">${escapeHtml(copy.join.expiresIn14Days)}</p><form id="invite-form" class="stack"><label for="invite-email">${escapeHtml(copy.join.inviteEmail)}</label><input id="invite-email" type="email" name="email" autocomplete="email" required><button class="btn uv" type="submit">${escapeHtml(copy.join.inviteCreateButton)}</button></form><p id="invite-message" aria-live="polite"></p></section>` : ""}`;
    panel.querySelector<HTMLButtonElement>("#sign-out")?.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) setMessage(panel, `${copy.messages.signOutError} ${error.message}`, "error");
      else {
        showToast(copy.messages.signOutSuccess);
        await joinPage();
      }
    });
    panel.querySelector<HTMLFormElement>("#invite-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const submit = form.querySelector<HTMLButtonElement>("button");
      const email = String(new FormData(form).get("email") ?? "").trim();
      if (submit) submit.disabled = true;
      try {
        await handleInvite(email);
      } catch (error) {
        setMessage(panel.querySelector("#invite-message"), error instanceof Error ? error.message : copy.messages.inviteCreateError, "error");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
    try {
      const curator = await loadCuratorDesk(user.id);
      if (curator) {
        panel.insertAdjacentHTML("beforeend", curator);
        panel.querySelector<HTMLButtonElement>(".copy-subscriber-emails")?.addEventListener("click", async () => {
          const emails = [...panel.querySelectorAll(".subscriber-list li")]
            .map((item) => item.textContent?.trim() ?? "")
            .filter((email) => email.includes("@"));
          try {
            await navigator.clipboard.writeText(emails.join("\n"));
            setMessage(panel.querySelector("#subscriber-copy-message"), copy.subscriber.copied, "success");
          } catch {
            setMessage(panel.querySelector("#subscriber-copy-message"), copy.subscriber.copyError, "error");
          }
        });
        panel.querySelectorAll<HTMLButtonElement>("[data-review]").forEach((button) => {
          button.addEventListener("click", async () => {
            button.disabled = true;
            const approve = button.dataset.review === "approve";
            const { error } = await supabase.rpc("admin_review_profile", {
              p_profile_id: button.dataset.id ?? "",
              p_approve: approve,
            });
            if (error) {
              button.disabled = false;
              setMessage(panel.querySelector("#review-message"), `${copy.messages.reviewError} ${error.message}`, "error");
              return;
            }
            showToast(approve ? copy.messages.approveSuccess : copy.messages.declineSuccess);
            await joinPage();
          });
        });
      }
    } catch (error) {
      setMessage(panel, error instanceof Error ? error.message : copy.messages.curatorCheckError, "error");
    }
    return;
  }

  if (!code) {
    setMessage(panel, copy.join.inviteRequired, "error");
    return;
  }
  const { data: valid, error: inviteError } = await supabase.rpc("check_invite", { p_code: code });
  if (inviteError) {
    setMessage(panel, `${copy.messages.inviteCheckError} ${inviteError.message}`, "error");
    return;
  }
  if (!valid) {
    setMessage(panel, copy.join.inviteInvalid, "error");
    return;
  }
  panel.innerHTML = `<form id="profile-form" class="stack"><h3 class="crate">${escapeHtml(copy.join.createProfile)}</h3><p class="note">${escapeHtml(copy.join.signedInAs)} ${escapeHtml(user.email ?? "")}</p>
    <label for="profile-name">${escapeHtml(copy.join.name)}</label><input id="profile-name" name="name" maxlength="100" required>
    <label for="profile-slug">${escapeHtml(copy.join.slug)}</label><input id="profile-slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" required><span class="note">${escapeHtml(copy.join.slugHint)}</span>
    <label for="profile-roles">${escapeHtml(copy.join.roles)}</label><input id="profile-roles" name="roles" maxlength="240" required><span class="note">${escapeHtml(copy.join.rolesHint)}</span>
    <label for="profile-location">${escapeHtml(copy.join.location)}</label><input id="profile-location" name="location" maxlength="120">
    <label for="profile-bio">${escapeHtml(copy.join.bio)}</label><textarea id="profile-bio" name="bio" rows="4" maxlength="1500"></textarea>
    <label for="profile-offers">${escapeHtml(copy.join.offers)}</label><textarea id="profile-offers" name="offers" rows="4" maxlength="1500"></textarea><span class="note">${escapeHtml(copy.join.offersHelp)}</span>
    <label for="profile-looking-for">${escapeHtml(copy.join.lookingFor)}</label><textarea id="profile-looking-for" name="looking_for" rows="4" maxlength="1500"></textarea><span class="note">${escapeHtml(copy.join.lookingForHelp)}</span>
    <label for="profile-creates">${escapeHtml(copy.join.creates)}</label><textarea id="profile-creates" name="creates" rows="4" maxlength="1500"></textarea><span class="note">${escapeHtml(copy.join.createsHelp)}</span>
    <label for="profile-intention">${escapeHtml(copy.join.intention)}</label><textarea id="profile-intention" name="intention" rows="3" maxlength="1000" required></textarea><span class="note">${escapeHtml(copy.join.intentionHelp)}</span>
    <label for="profile-links">${escapeHtml(copy.join.links)}</label><input id="profile-links" name="links" placeholder="https://example.com"><span class="note">${escapeHtml(copy.join.linksHint)}</span>
    <label for="profile-contact">${escapeHtml(copy.join.contact)}</label><input id="profile-contact" name="contact" maxlength="200">
    <button class="btn uv" type="submit">${escapeHtml(copy.join.submitProfile)}</button><p id="profile-message" aria-live="polite"></p></form>`;
  panel.querySelector<HTMLFormElement>("#profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const submit = form.querySelector<HTMLButtonElement>("button");
    const message = form.querySelector<HTMLElement>("#profile-message");
    const links = String(values.get("links") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (links.some((link) => !safeUrl(link))) {
      setMessage(message, copy.join.linksHint, "error");
      return;
    }
    const intention = String(values.get("intention") ?? "").trim();
    if (!intention) {
      setMessage(message, copy.messages.intentionRequired, "error");
      return;
    }
    if (submit) submit.disabled = true;
    const { error } = await supabase.rpc("submit_invited_profile", {
      p_code: code,
      p_slug: String(values.get("slug") ?? "").trim().toLowerCase(),
      p_name: String(values.get("name") ?? "").trim(),
      p_roles: String(values.get("roles") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      p_location: String(values.get("location") ?? "").trim(),
      p_bio: String(values.get("bio") ?? "").trim(),
      p_offers: String(values.get("offers") ?? "").trim(),
      p_looking_for: String(values.get("looking_for") ?? "").trim(),
      p_creates: String(values.get("creates") ?? "").trim(),
      p_intention: intention,
      p_links: links,
      p_contact: String(values.get("contact") ?? "").trim(),
      p_photo_path: null,
    });
    if (submit) submit.disabled = false;
    if (error) {
      setMessage(message, `${copy.messages.profileSubmitError} ${error.message}`, "error");
      return;
    }
    setMessage(message, copy.join.profileSubmitted, "success");
    window.setTimeout(() => void joinPage(), 900);
  });
}

async function render(): Promise<void> {
  document.querySelector("#auth-callback-message")?.remove();
  const route = routeName();
  document.querySelectorAll<HTMLAnchorElement>("nav a").forEach((link) => {
    const target = route.view === "artist" ? "artists" : route.view;
    link.setAttribute("aria-current", link.getAttribute("href") === `#${target}` ? "page" : "false");
  });
  const liveArtists = route.view === "artists" || route.view === "artist" ? await getLiveProfiles() : [];
  switch (route.view) {
    case "library":
      appView.innerHTML = libraryView();
      wireLibrary();
      return;
    case "artists":
      appView.innerHTML = artistsView(liveArtists);
      wireArtists();
      return;
    case "collab":
      appView.innerHTML = collabView();
      return;
    case "join":
      appView.innerHTML = joinViewMarkup();
      wireSubscriberForms();
      await joinPage();
      if (route.arg === "curator") appView.querySelector("#curator-desk")?.scrollIntoView();
      return;
    case "signin":
      appView.innerHTML = signInViewMarkup();
      wireSignInForm();
      return;
    case "artist":
      appView.innerHTML = artistView(route.arg, liveArtists);
      wireProfile();
      wirePlay();
      return;
    case "channel":
    default:
      appView.innerHTML = channelView();
      wireSubscriberForms();
      wireProfile();
      wirePlay();
  }
}

function parseAuthCallback(): URLSearchParams {
  const params = new URLSearchParams();
  const normalizedHash = location.hash.slice(1).replace(
    /%23(?=(?:access_token|refresh_token|error|error_description|error_code)=)/gi,
    "#",
  );
  const hashParts = normalizedHash.split("#");
  hashParts.forEach((part) => {
    const segment = new URLSearchParams(part);
    segment.forEach((value, key) => params.set(key, value));
  });
  return params;
}

async function startApp(): Promise<void> {
  const callback = parseAuthCallback();
  const hasAuthCallback = ["access_token", "refresh_token", "error", "error_description", "error_code"]
    .some((key) => callback.has(key));
  if (hasAuthCallback) {
    const accessToken = callback.get("access_token");
    const refreshToken = callback.get("refresh_token");
    const invite = new URLSearchParams(location.search).get("invite");
    if (invite) sessionStorage.setItem(pendingInviteKey, invite);
    try {
      if (accessToken && refreshToken && supabase) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) authCallbackMessage = callback.get("error_description") || error.message;
      } else if (callback.has("error")) {
        authCallbackMessage = callback.get("error_description") || copy.messages.magicLinkExpired;
      } else if (accessToken || refreshToken) {
        authCallbackMessage = copy.messages.configMissing;
      }
    } catch {
      authCallbackMessage = callback.get("error_description") || copy.messages.magicLinkExpired;
    } finally {
      const cleanUrl = new URL(import.meta.env.BASE_URL, location.origin);
      cleanUrl.hash = "#channel";
      history.replaceState(null, document.title, cleanUrl.href);
    }
  }

  await updateAccountHeader();
  await render();
  if (authCallbackMessage) {
    const message = document.createElement("p");
    message.id = "auth-callback-message";
    message.className = "notice";
    message.setAttribute("role", "status");
    message.textContent = authCallbackMessage;
    appView.prepend(message);
  }
}

initialiseShell();
supabase?.auth.onAuthStateChange(() => {
  window.setTimeout(() => void updateAccountHeader(), 0);
});
window.addEventListener("hashchange", () => {
  playlistFilter = copy.artists.all;
  void render().then(() => window.scrollTo(0, 0));
});
void startApp();
