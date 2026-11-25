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
  /** Shown only under Unleashed Publishing, never on the platform's Artists wall. */
  publishing_only?: boolean;
  photo?: string;
  color?: string;
  sections?: { alias?: string; role: string; types?: string[] }[];
  wordmark?: string;
  meaning?: string;
  invited_by?: string | null;
  inviter?: { name: string; slug: string } | null;
  incognito?: boolean;
};

type Release = {
  id: string;
  title: string;
  artists?: string[];
  credits?: { name: string; role: string; profile: string | null }[];
  alias?: string;
  type: string;
  date?: string;
  length?: string;
  bpm?: string;
  key?: string;
  genre?: string;
  description?: string;
  url?: string;
  audio?: string;
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
  ownerId?: string | null;
  ownerName?: string;
  date?: string;
  have?: string;
  need?: string[];
  text?: string;
  link?: string;
  status?: string;
};

type CallRow = {
  id: string;
  created_by: string | null;
  title: string;
  date: string;
  have: string;
  need: string[];
  text: string;
  link: string;
  status: string;
  created_at: string;
};

type DemoRow = {
  id: string;
  call_id: string;
  name: string;
  email: string;
  link: string;
  message: string;
  created_at: string;
  status: "new" | "listened" | "replied";
};

type MemberSession = {
  userId: string;
  name: string;
  slug: string;
  isAdmin: boolean;
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
  listed_slug?: string | null;
};
type ListedArtistRow = { slug: string; name: string; roles: string[]; created_at: string };

type SubscriberRow = {
  id: string;
  email: string;
  consented_at: string;
  unsubscribed_at: string | null;
  created_at: string;
};

type RoomRow = {
  id: string;
  title: string;
  created_by: string;
  status: "drafting_split" | "active";
  stage: string;
  next_owner: string | null;
  next_note: string;
  signed_at: string | null;
  created_at: string;
};
type RoomMemberRow = {
  room_id: string;
  profile_id: string;
  role: string;
  percent: number;
  accepted_at: string | null;
  added_at: string;
};
type RoomLinkRow = {
  id: string;
  room_id: string;
  added_by: string | null;
  label: string;
  url: string;
  kind: string;
  note: string;
  created_at: string;
};
type RoomLogRow = {
  id: number;
  room_id: string;
  actor: string | null;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
};
type ReadOnlyTable<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type CardCodeRow = {
  code: string;
  label: string;
  created_by: string | null;
  max_uses: number;
  uses: number;
  active: boolean;
  expires_at: string;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      listed_artists: ReadOnlyTable<ListedArtistRow>;
      rooms: ReadOnlyTable<RoomRow>;
      room_members: ReadOnlyTable<RoomMemberRow>;
      room_links: ReadOnlyTable<RoomLinkRow>;
      room_log: ReadOnlyTable<RoomLogRow>;
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
      calls: {
        Row: CallRow;
        Insert: Partial<CallRow> & Pick<CallRow, "created_by" | "title">;
        Update: Partial<CallRow>;
        Relationships: [];
      };
      card_codes: {
        Row: CardCodeRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      demos: {
        Row: DemoRow;
        Insert: Pick<DemoRow, "call_id" | "name" | "email" | "link" | "message">;
        Update: Pick<DemoRow, "status">;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_listed_artist: { Args: { p_name: string; p_slug: string; p_roles: string[] }; Returns: string };
      delete_listed_artist: { Args: { p_slug: string }; Returns: undefined };
      create_listed_invite: { Args: { p_slug: string; p_email: string }; Returns: { id: string; code: string; expires_at: string }[] };
      get_invite_listing: { Args: { p_code: string }; Returns: { slug: string; name: string; roles: string[] }[] };
      create_room: { Args: { p_title: string }; Returns: string };
      add_room_member: { Args: { p_room: string; p_slug: string; p_role?: string }; Returns: undefined };
      remove_room_member: { Args: { p_room: string; p_profile: string }; Returns: undefined };
      set_room_split: { Args: { p_room: string; p_splits: { profile_id: string; percent: number; role: string }[] }; Returns: undefined };
      accept_room_split: { Args: { p_room: string }; Returns: string };
      add_room_link: { Args: { p_room: string; p_label: string; p_url: string; p_kind?: string; p_note?: string }; Returns: undefined };
      set_room_next_step: { Args: { p_room: string; p_stage: string; p_next_owner: string | null; p_note?: string }; Returns: undefined };
      check_invite: { Args: { p_code: string }; Returns: boolean };
      create_card_code: { Args: { p_code: string; p_label: string; p_max_uses: number; p_expires_at: string }; Returns: string };
      set_card_code_active: { Args: { p_code: string; p_active: boolean }; Returns: undefined };
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
  const navLabels = [copy.brand.channel, copy.about.nav, copy.brand.library, copy.brand.artists, copy.studio.nav];
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
  setHeaderSignedIn(false);
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
  const footerLinks = document.querySelector<HTMLElement>("#footer-links");
  if (footerLinks) {
    footerLinks.setAttribute("role", "navigation");
    footerLinks.setAttribute("aria-label", copy.brand.footerLabel);
    const footerLabels: Record<string, string> = {
      bonhomme: copy.brand.footerBonhomme,
      publishing: copy.brand.footerPublishing,
      platform: copy.brand.footerPlatform,
      cofounder: copy.brand.footerCofounder,
      ass: copy.brand.footerAss,
    };
    footerLinks.querySelectorAll<HTMLAnchorElement>("a[data-foot]").forEach((link) => {
      link.textContent = footerLabels[link.dataset.foot ?? ""] ?? "";
    });
  }
  const loading = appView.querySelector<HTMLElement>(".note");
  if (loading) loading.textContent = copy.brand.loading;
}

function setHeaderSignedIn(signedIn: boolean): void {
  const prompt = document.querySelector<HTMLElement>("#invitation-prompt-text");
  const join = document.querySelector<HTMLAnchorElement>("#invitation-join");
  if (prompt) prompt.hidden = signedIn;
  if (join) join.hidden = signedIn;
}

async function updateAccountHeader(): Promise<void> {
  const accountArea = document.querySelector<HTMLElement>("#account-area");
  if (!accountArea) return;
  if (!supabase) {
    setHeaderSignedIn(false);
    accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setHeaderSignedIn(false);
    accountArea.innerHTML = ` · <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>`;
    showToast(`${copy.messages.signInError} ${error.message}`);
    return;
  }
  const user = data.session?.user;
  if (!user) {
    setHeaderSignedIn(false);
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
  setHeaderSignedIn(true);
  const name = profile?.name || user.email || copy.brand.signedIn;
  const pendingInvite = !profile ? sessionStorage.getItem(pendingInviteKey) : null;
  const myProfileHref = profile?.status === "live" && profile.slug
    ? `#artist-${encodeURIComponent(profile.slug)}`
    : pendingInvite
      ? `${import.meta.env.BASE_URL}?invite=${encodeURIComponent(pendingInvite)}#join`
      : "#join";
  accountArea.innerHTML = `<details class="account-menu"><summary>${escapeHtml(copy.join.signedInAs)} ${escapeHtml(name)} <span aria-hidden="true">▾</span></summary><div class="account-menu-items">
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

let listedArtists: Artist[] = [];

async function loadListedArtists(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("listed_artists").select("slug,name,roles,created_at").order("name");
  if (error) return;
  listedArtists = (data ?? [])
    .filter((row) => !artists.some((artist) => artist.slug === row.slug))
    .map((row) => ({ slug: row.slug, name: row.name, roles: row.roles ?? [], incognito: true, open_to_unleash: false, aliases: [], links: [] }));
}

const staticArtist = (slug: string): Artist | undefined => artists.find((artist) => artist.slug === slug)
  ?? listedArtists.find((artist) => artist.slug === slug);
const artistName = (slug: string): string => staticArtist(slug)?.name ?? slug;

function platform(value: string): string {
  const url = safeUrl(value);
  if (!url) return copy.profile.link;
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  if (host === "theoriginalbonhomme.github.io") {
    if (parsed.pathname.startsWith("/nii-palju-tahendusi")) return copy.brand.platforms.niiPalju;
    if (parsed.pathname.startsWith("/rhyme-rumble")) return copy.brand.platforms.rhymeRumble;
  }
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
  const artistsMarkup = (release.artists ?? []).map((slug) => {
    const href = `#artist-${encodeURIComponent(slug)}`;
    return staticArtist(slug)
      ? `<a href="${escapeHtml(href)}">${escapeHtml(artistName(slug))}</a>`
      : escapeHtml(slug);
  });
  const artistNames = new Set((release.artists ?? []).map(artistName));
  const creditsMarkup = (release.credits ?? [])
    .filter((credit) => !artistNames.has(credit.name))
    .map((credit) => {
      const artist = credit.profile ? staticArtist(credit.profile) : undefined;
      return artist
        ? `<a href="#artist-${encodeURIComponent(artist.slug)}">${escapeHtml(credit.name)}</a>`
        : escapeHtml(credit.name);
    });
  return [...artistsMarkup, ...creditsMarkup].join(" × ");
}

function releaseDownloadHref(release: Release): string {
  if (!release.download) return "";
  if (/^audio\/[a-z0-9][a-z0-9._-]*$/.test(release.download)) {
    return `${import.meta.env.BASE_URL}${release.download}`;
  }
  return safeUrl(release.download);
}

function releaseRow(release: Release, showArtists = true): string {
  const url = safeUrl(release.url);
  const download = releaseDownloadHref(release);
  const kind = url ? platform(url) : "";
  const audioPath = release.audio && /^audio\/[a-z0-9][a-z0-9._-]*$/.test(release.audio)
    ? release.audio
    : "";
  const audioUrl = audioPath ? `${import.meta.env.BASE_URL}${audioPath}` : "";
  const canPlay = Boolean(audioUrl || (url && embed(url)));
  const metadata = [
    `<span class="type">${escapeHtml(release.type)}</span>`,
    showArtists ? `<span>${credits(release)}</span>` : "",
    release.alias ? `<span>${escapeHtml(copy.profile.as)} ${escapeHtml(release.alias)}</span>` : "",
    release.bpm ? `<span>${escapeHtml(release.bpm)} ${escapeHtml(copy.profile.bpm)}</span>` : "",
    release.key ? `<span>${escapeHtml(release.key)}</span>` : "",
    release.length ? `<span>${escapeHtml(release.length)}</span>` : "",
    release.genre ? `<span>${escapeHtml(release.genre)}</span>` : "",
    release.mood ? `<span class="mood">${escapeHtml(release.mood)}</span>` : "",
    release.place ? `<span>${escapeHtml(copy.profile.madeIn)} ${escapeHtml(release.place)}</span>` : "",
    release.date ? `<span>${escapeHtml(release.date)}</span>` : "",
    kind ? `<span class="plat">${escapeHtml(kind)}</span>` : "",
  ].filter(Boolean).join("");
  return `<div class="rel" id="r-${escapeHtml(release.id)}"><div class="t">${escapeHtml(release.title)}</div>${release.description ? `<p class="description">${escapeHtml(release.description)}</p>` : ""}<div class="acts">
    ${canPlay ? `<button class="btn solid" data-play="${escapeHtml(release.id)}">${escapeHtml(copy.library.play)}</button>` : ""}
    ${url ? `<a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(audioUrl ? copy.library.fullTrack : copy.library.open)}</a>` : ""}
    ${download ? `<button class="btn uv" data-give="${escapeHtml(release.id)}">${escapeHtml(audioUrl ? copy.library.downloadPreview : copy.library.download)}</button>` : `<span class="btn ghost" title="${escapeHtml(release.original_lost ? copy.library.originalGone : copy.library.noDownload)}">${escapeHtml(copy.library.streamOnly)}</span>`}
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
      const audioPath = release.audio && /^audio\/[a-z0-9][a-z0-9._-]*$/.test(release.audio)
        ? release.audio
        : "";
      const audioUrl = audioPath ? `${import.meta.env.BASE_URL}${audioPath}` : "";
      slot.innerHTML = audioUrl
        ? `<div class="audio-preview"><span class="audio-preview-label">${escapeHtml(copy.library.preview)}</span><audio controls preload="none" src="${escapeHtml(audioUrl)}">${escapeHtml(copy.library.audioUnsupported)}</audio></div>`
        : embed(release.url ?? "");
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
  const download = release ? releaseDownloadHref(release) : "";
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
    <div class="give-in"></div>    <div><a class="btn uv" hidden href="${escapeHtml(download)}" target="_blank" rel="noopener"${release.download?.startsWith("audio/") ? " download" : ""}>${escapeHtml(copy.exchange.download)} ${escapeHtml(release.title)}</a></div></div>`;
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

function worksFor(artist: Artist): Release[] {
  return releases.filter((release) => (release.artists ?? []).includes(artist.slug)
    || (release.credits ?? []).some((credit) => credit.profile === artist.slug));
}

function incognitoCard(artist: Artist): string {
  const count = worksFor(artist).length;
  return `<article class="card incognito"><div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}<span class="role incognito-tag">${escapeHtml(copy.profile.incognito)}</span></div>
    <h4><a href="#artist-${encodeURIComponent(artist.slug)}">${escapeHtml(artist.name)}</a></h4>
    <span class="note">${count ? `${escapeHtml(count)} ${escapeHtml(count === 1 ? copy.profile.sharedWork : copy.profile.sharedWorks)}` : escapeHtml(copy.profile.firstUnleash)}</span></article>`;
}

function incognitoProfile(artist: Artist): string {
  const works = worksFor(artist);
  return `<div class="stack" style="gap:24px"><a class="back" href="#artists">${escapeHtml(copy.profile.back)}</a>
    <section class="stack">
      <div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}<span class="role incognito-tag">${escapeHtml(copy.profile.incognito)}</span></div>
      <h2 class="h">${escapeHtml(artist.name)}</h2>
      <p class="note">${escapeHtml(copy.profile.incognitoNoteStart)} ${escapeHtml(artist.name)} ${escapeHtml(copy.profile.incognitoNoteEnd)}</p>
    </section>
    ${workSection(copy.profile.unleashed, works, copy.profile.firstUnleash, true)}</div>`;
}

function card(artist: Artist): string {
  if (artist.incognito) return incognitoCard(artist);
  const firstLookingForLine = (artist.looking_for ?? "").split(/\r?\n/).find((line) => line.trim())?.replace(/^- /, "") ?? "";
  const image = assetPath(artist.photo);
  return `<article class="card">${image ? `<img class="card-seal" src="${escapeHtml(image)}" alt="" width="48" height="48">` : ""}<div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}</div>
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
  if (artist.incognito) return incognitoProfile(artist);
  const releasesForArtist = worksFor(artist);
  const artistPlaylists = playlistFor(artist);
  const selectedPlaylist = artistPlaylists.find((playlist) => playlist.id === playlistFilter);
  const playlistItems = selectedPlaylist ? new Set(selectedPlaylist.items) : null;
  const profileWorks = (group: "dj" | "production" | "unleashed") => releasesForArtist
    .filter((release) => workGroup(release) === group && (!playlistItems || playlistItems.has(release.id)));
  const portrait = assetPath(artist.photo);
  const initials = artist.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const portraitMarkup = portrait
    ? `<img class="portrait" src="${escapeHtml(portrait)}" alt="${escapeHtml(copy.profile.portraitAlt)} ${escapeHtml(artist.name)}" width="640" height="640">`
    : `<div class="portrait portrait-initials" aria-hidden="true">${escapeHtml(initials)}</div>`;
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
      ${portraitMarkup}
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
      ${profileWorks("dj").length ? workSection(copy.profile.djSets, profileWorks("dj"), copy.profile.nothingYet) : ""}
      ${profileWorks("production").length ? workSection(copy.profile.productions, profileWorks("production"), copy.profile.nothingYet) : ""}
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

function demoStatusLabel(status: DemoRow["status"]): string {
  return copy.collab.demoStatuses[status];
}

function demoList(callId: string, demos: DemoRow[]): string {
  if (!demos.length) return `<section class="demo-list"><h3 class="crate"><span>${escapeHtml(copy.collab.demos)}</span><span>${escapeHtml(copy.collab.zero)}</span></h3><p class="note">${escapeHtml(copy.collab.noDemos)}</p></section>`;
  return `<section class="demo-list stack"><h3 class="crate"><span>${escapeHtml(copy.collab.demos)}</span><span>${demos.length}</span></h3>
    ${demos.map((demo) => `<article class="demo-entry">
      <div class="demo-entry-heading"><b>${escapeHtml(demo.name)}</b><span class="note">${escapeHtml(copy.collab.demoDate)} · ${escapeHtml(new Date(demo.created_at).toLocaleDateString())}</span></div>
      <a href="${escapeHtml(demo.link)}" target="_blank" rel="noopener">${escapeHtml(demo.link)}</a>
      ${demo.message ? `<p>${escapeHtml(demo.message)}</p>` : ""}
      <label class="k" for="demo-status-${escapeHtml(demo.id)}">${escapeHtml(copy.collab.demoStatus)}</label>
      <select id="demo-status-${escapeHtml(demo.id)}" data-demo-status="${escapeHtml(demo.id)}" data-call-id="${escapeHtml(callId)}">${(["new", "listened", "replied"] as const).map((status) => `<option value="${status}"${demo.status === status ? " selected" : ""}>${escapeHtml(demoStatusLabel(status))}</option>`).join("")}</select>
    </article>`).join("")}
  </section>`;
}

async function currentMember(): Promise<MemberSession | null> {
  if (!supabase) return null;
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    showToast(`${copy.messages.signInError} ${sessionError.message}`);
    return null;
  }
  const user = session.session?.user;
  if (!user) return null;
  const [{ data: profile, error: profileError }, { data: admin, error: adminError }] = await Promise.all([
    supabase.from("profiles").select("name,slug,status").eq("id", user.id).maybeSingle(),
    supabase.from("roles_admin").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileError) {
    showToast(`${copy.messages.profileLoadError} ${profileError.message}`);
    return null;
  }
  if (adminError) showToast(`${copy.messages.curatorCheckError} ${adminError.message}`);
  if (!profile || profile.status !== "live") return null;
  return { userId: user.id, name: profile.name, slug: profile.slug, isAdmin: Boolean(admin) };
}

async function loadCalls(): Promise<Collab[]> {
  if (!supabase) return collabs;
  const { data: rows, error } = await supabase.from("calls")
    .select("id,created_by,title,date,have,need,text,link,status,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    showToast(`${copy.collab.callLoadError} ${error.message}`);
    return collabs;
  }
  const ownerIds = [...new Set((rows ?? []).map((row) => row.created_by).filter((id): id is string => Boolean(id)))];
  const ownerById = new Map<string, { slug: string; name: string }>();
  if (ownerIds.length) {
    const { data: owners, error: ownerError } = await supabase.from("profiles").select("id,slug,name").in("id", ownerIds);
    if (ownerError) showToast(`${copy.messages.loadProfilesError} ${ownerError.message}`);
    (owners ?? []).forEach((owner) => ownerById.set(owner.id, { slug: owner.slug, name: owner.name }));
  }
  const persisted = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    by: ownerById.get(row.created_by ?? "")?.slug ?? copy.collab.unknownMember,
    ownerId: row.created_by,
    ownerName: ownerById.get(row.created_by ?? "")?.name,
    date: row.date,
    have: row.have,
    need: row.need,
    text: row.text,
    link: row.link,
    status: row.status,
  } satisfies Collab));
  const persistedIds = new Set(persisted.map((call) => call.id));
  return [...persisted, ...collabs.filter((call) => !persistedIds.has(call.id))];
}

async function loadDemos(callIds: string[]): Promise<DemoRow[]> {
  if (!supabase || !callIds.length) return [];
  const { data, error } = await supabase.from("demos")
    .select("id,call_id,name,email,link,message,created_at,status")
    .in("call_id", callIds)
    .order("created_at", { ascending: false });
  if (error) {
    showToast(`${copy.collab.demoLoadError} ${error.message}`);
    return [];
  }
  return data ?? [];
}

function callCard(call: Collab, demos: DemoRow[] = [], showDemos = false, showOpenAll = false): string {
  const callArtist = staticArtist(call.by);
  const ownerName = callArtist?.name ?? call.ownerName ?? call.by;
  const ownerLink = callArtist || call.ownerName
    ? `<a href="#artist-${encodeURIComponent(call.by)}">${escapeHtml(ownerName)}</a>`
    : escapeHtml(ownerName);
  const callStatus = (call.status ?? "").toLowerCase() === "closed" ? copy.collab.statusClosed : copy.collab.statusOpen;
  return `<article class="card"><span class="k">${escapeHtml(callStatus)} · ${escapeHtml(call.date ?? "")}</span><h4>${escapeHtml(call.title)}</h4>
    <div><span class="k">${escapeHtml(copy.collab.from)}</span><br>${ownerLink}</div>
    <div><span class="k">${escapeHtml(copy.collab.have)}</span><br>${escapeHtml(call.have ?? "")}</div>
    <div><span class="k">${escapeHtml(copy.collab.needs)}</span><div class="roles" style="margin-top:4px">${(call.need ?? []).map((need) => `<span class="role">${escapeHtml(need)}</span>`).join("")}</div></div>
    ${call.text ? `<p>${escapeHtml(call.text)}</p>` : ""}
    ${safeUrl(call.link) ? `<div><a class="btn" href="${escapeHtml(safeUrl(call.link))}" target="_blank" rel="noopener">${escapeHtml(copy.collab.hear)}</a></div>` : ""}
    <button class="btn uv" type="button" data-send-demo="${escapeHtml(call.id)}">${escapeHtml(copy.collab.sendDemo)}</button>
    <div class="demo-form-slot" data-demo-form-slot="${escapeHtml(call.id)}"></div>
    ${showOpenAll ? `<a class="btn" href="#collab">${escapeHtml(copy.collab.openAll)}</a>` : ""}
    ${showDemos ? demoList(call.id, demos) : ""}</article>`;
}

function callFormMarkup(): string {
  return `<form id="create-call-form" class="stack call-form">
    <h3 class="crate">${escapeHtml(copy.collab.createRoom)}</h3>
    <p class="note">${escapeHtml(copy.collab.createRoomHelp)}</p>
    <label for="call-title">${escapeHtml(copy.collab.callTitle)}</label><input id="call-title" name="title" maxlength="160" required>
    <label for="call-have">${escapeHtml(copy.collab.callHave)}</label><textarea id="call-have" name="have" maxlength="1000" required></textarea>
    <label for="call-needs">${escapeHtml(copy.collab.callNeeds)}</label><input id="call-needs" name="need" maxlength="300"><span class="note">${escapeHtml(copy.collab.callNeedsHint)}</span>
    <label for="call-details">${escapeHtml(copy.collab.callDetails)}</label><textarea id="call-details" name="text" maxlength="1000"></textarea>
    <label for="call-link">${escapeHtml(copy.collab.callLink)}</label><input id="call-link" name="link" type="url" placeholder="${escapeHtml(copy.collab.httpsPlaceholder)}">
    <button class="btn uv" type="submit">${escapeHtml(copy.collab.createRoomSubmit)}</button>
    <p class="call-form-message note" aria-live="polite"></p>
  </form>`;
}

function demoFormMarkup(callId: string): string {
  return `<form class="demo-form stack" data-demo-form="${escapeHtml(callId)}">
    <label for="demo-name-${escapeHtml(callId)}">${escapeHtml(copy.collab.demoName)}</label><input id="demo-name-${escapeHtml(callId)}" name="name" maxlength="100" autocomplete="name" required>
    <label for="demo-email-${escapeHtml(callId)}">${escapeHtml(copy.collab.demoEmail)}</label><input id="demo-email-${escapeHtml(callId)}" name="email" type="email" maxlength="254" autocomplete="email" required>
    <label for="demo-link-${escapeHtml(callId)}">${escapeHtml(copy.collab.demoLink)}</label><input id="demo-link-${escapeHtml(callId)}" name="link" type="url" placeholder="${escapeHtml(copy.collab.httpsPlaceholder)}" required><span class="note">${escapeHtml(copy.collab.demoLinkHint)}</span>
    <label for="demo-message-${escapeHtml(callId)}">${escapeHtml(copy.collab.demoMessage)}</label><textarea id="demo-message-${escapeHtml(callId)}" name="message" maxlength="500"></textarea>
    <label class="demo-rights"><input name="rights" type="checkbox" required> <span>${escapeHtml(copy.collab.demoRights)}</span></label>
    <label class="demo-honeypot" aria-hidden="true">${escapeHtml(copy.collab.demoHoneypot)}<input name="website" tabindex="-1" autocomplete="off"></label>
    <button class="btn uv" type="submit">${escapeHtml(copy.collab.demoSubmit)}</button>
    <p class="demo-form-message note" aria-live="polite"></p>
  </form>`;
}

function allowedDemoUrl(value: string): string {
  const url = safeUrl(value.trim());
  if (!url) return "";
  const host = new URL(url).hostname.toLowerCase();
  const allowed = [
    "soundcloud.com", "mixcloud.com", "youtube.com", "youtu.be",
    "drive.google.com", "docs.google.com", "dropbox.com", "dropboxusercontent.com",
    "wetransfer.com", "we.tl",
  ];
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url : "";
}

function wireCallAndDemoForms(): void {
  appView.querySelector<HTMLButtonElement>("#show-create-call")?.addEventListener("click", () => {
    const slot = appView.querySelector<HTMLElement>("#create-call-slot");
    if (slot) slot.hidden = !slot.hidden;
  });
  appView.querySelectorAll<HTMLButtonElement>("[data-send-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      const callId = button.dataset.sendDemo ?? "";
      const slot = appView.querySelector<HTMLElement>(`[data-demo-form-slot="${CSS.escape(callId)}"]`);
      if (!slot) return;
      if (slot.firstElementChild) {
        slot.innerHTML = "";
        return;
      }
      slot.innerHTML = demoFormMarkup(callId);
      const form = slot.querySelector<HTMLFormElement>("[data-demo-form]");
      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!supabase) {
          setMessage(form.querySelector(".demo-form-message"), copy.messages.configMissing, "error");
          return;
        }
        const values = new FormData(form);
        const name = String(values.get("name") ?? "").trim();
        const email = String(values.get("email") ?? "").trim().toLowerCase();
        const link = allowedDemoUrl(String(values.get("link") ?? ""));
        const message = String(values.get("message") ?? "").trim();
        if (!link) {
          setMessage(form.querySelector(".demo-form-message"), copy.collab.invalidDemoLink, "error");
          return;
        }
        if (!values.has("rights")) {
          setMessage(form.querySelector(".demo-form-message"), copy.collab.demoAgreementRequired, "error");
          return;
        }
        if (String(values.get("website") ?? "").trim()) {
          setMessage(form.querySelector(".demo-form-message"), copy.collab.demoSent, "success");
          form.reset();
          return;
        }
        const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
        if (submit) submit.disabled = true;
        const { error } = await supabase.from("demos").insert({
          call_id: callId, name, email, link, message,
        });
        if (submit) submit.disabled = false;
        if (error) {
          setMessage(form.querySelector(".demo-form-message"), `${copy.collab.demoSendError} ${error.message}`, "error");
          return;
        }
        form.reset();
        setMessage(form.querySelector(".demo-form-message"), copy.collab.demoSent, "success");
      });
    });
  });

  appView.querySelectorAll<HTMLFormElement>("#create-call-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const member = await currentMember();
      if (!member) return;
      const values = new FormData(form);
      const linkValue = String(values.get("link") ?? "").trim();
      const link = linkValue ? safeUrl(linkValue) : "";
      if (linkValue && !link) {
        setMessage(form.querySelector(".call-form-message"), copy.collab.callLinkInvalid, "error");
        return;
      }
      const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
      if (submit) submit.disabled = true;
      const { error } = await supabase!.from("calls").insert({
        created_by: member.userId,
        title: String(values.get("title") ?? "").trim(),
        have: String(values.get("have") ?? "").trim(),
        need: String(values.get("need") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
        text: String(values.get("text") ?? "").trim(),
        link,
      });
      if (submit) submit.disabled = false;
      if (error) {
        setMessage(form.querySelector(".call-form-message"), `${copy.collab.callCreateError} ${error.message}`, "error");
        return;
      }
      await render();
    });
  });

  appView.querySelectorAll<HTMLSelectElement>("[data-demo-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      if (!supabase) return;
      select.disabled = true;
      const { error } = await supabase.from("demos").update({ status: select.value as DemoRow["status"] }).eq("id", select.dataset.demoStatus ?? "");
      if (error) {
        select.disabled = false;
        showToast(`${copy.collab.demoStatusError} ${error.message}`);
        return;
      }
      select.disabled = false;
    });
  });
}

async function channelView(): Promise<string> {
  const artist = staticArtist("bonhomme") ?? artists[0];
  const intro = site.intro ? `<p class="intro">${escapeHtml(site.intro)}</p>` : "";
  if (!artist) return `<div class="empty">${escapeHtml(copy.profile.noProfile)}</div>`;
  const latest = releases.find((release) => /dj mix|dj set|live set|track/i.test(release.type) && Boolean(embed(release.url ?? "")));
  const latestPlayer = latest
    ? `<section class="stack"><h3 class="crate"><span>${escapeHtml(copy.channel.latestWork)}</span><span>${escapeHtml(latest.date ?? "")}</span></h3><div class="feature-player"><div class="feature-embed">${embed(latest.url ?? "")}</div><div class="feature-copy"><b>${escapeHtml(latest.title).replace(/@/g, "@<wbr>")}</b><div class="m">${credits(latest)}${latest.place ? ` · ${escapeHtml(latest.place)}` : ""}</div><a class="btn uv" href="${escapeHtml(contributionHref())}">${escapeHtml(copy.channel.browseOldRender)}</a></div></div></section>`
    : `<div class="empty">${escapeHtml(copy.profile.noMusic)}</div>`;
  const newest = (group: "dj" | "production" | "unleashed") => releases.filter((release) => workGroup(release) === group).slice(0, 4);
  const openCalls = (await loadCalls()).filter((call) => (call.status ?? "").toLowerCase() === "open");
  const callsMarkup = openCalls.map((call) => callCard(call, [], false, true)).join("");
  const aboutStrip = `<section class="about-strip"><p>${escapeHtml(copy.about.strip)}</p><a class="btn uv" href="#about">${escapeHtml(copy.about.stripLink)}</a></section>`;
  return `${intro}${aboutStrip}<div class="stack channel-content">${latestPlayer}
    <div class="stack home-works">${workSection(copy.channel.djSets, newest("dj"), copy.profile.nothingYet)}${workSection(copy.channel.productions, newest("production"), copy.profile.nothingYet)}${workSection(copy.channel.unleashed, newest("unleashed"), copy.profile.firstUnleash, true)}</div>
    <section class="stack"><h3 class="crate"><span>${escapeHtml(copy.channel.openCalls)}</span><a href="#collab">${escapeHtml(copy.collab.openAll)}</a></h3><div class="cards">${callsMarkup || `<div class="empty">${escapeHtml(copy.collab.empty)}</div>`}</div></section>
    ${subscriberForm()}
    <p class="note channel-meaning">${escapeHtml(copy.channel.meaning)} <a href="#artist-bonhomme">${escapeHtml(copy.channel.readProfile)}</a></p>
  </div>`;
}

type StudioAccess = { state: "ready"; member: MemberSession } | { state: "signed-out" | "not-live" | "unconfigured" };

async function studioAccess(): Promise<StudioAccess> {
  if (!supabase) return { state: "unconfigured" };
  const member = await currentMember();
  if (member) return { state: "ready", member };
  const { data } = await supabase.auth.getSession();
  return { state: data.session?.user ? "not-live" : "signed-out" };
}

function studioGate(access: StudioAccess): string {
  const s = copy.studio;
  const message = access.state === "unconfigured" ? copy.messages.configMissing
    : access.state === "not-live" ? s.notLive : s.signedOut;
  const action = access.state === "signed-out" ? ` <a href="#signin">${escapeHtml(copy.brand.signIn)}</a>` : "";
  return `<div class="stack"><h2 class="h">${escapeHtml(s.title)}</h2><p class="intro">${escapeHtml(s.lead)}</p><div class="empty">${escapeHtml(message)}${action}</div></div>`;
}

function roomStatusLabel(room: RoomRow): string {
  return room.status === "active" ? copy.studio.statusActive : copy.studio.statusDrafting;
}

async function studioView(): Promise<string> {
  const s = copy.studio;
  const access = await studioAccess();
  if (access.state !== "ready" || !supabase) return studioGate(access);
  const { data: rooms, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) showToast(`${s.error} ${error.message}`);
  const list = (rooms ?? []).map((room) => `<div class="card"><p class="eyebrow">${escapeHtml(roomStatusLabel(room))}</p><h4><a href="#room-${escapeHtml(room.id)}">${escapeHtml(room.title)}</a></h4><span class="note">${escapeHtml(room.status === "active" ? room.stage : s.nextDrafting)}</span><a class="btn" href="#room-${escapeHtml(room.id)}">${escapeHtml(s.open)}</a></div>`).join("");
  return `<div class="stack studio"><h2 class="h">${escapeHtml(s.title)}</h2><p class="intro">${escapeHtml(s.lead)}</p>
    <h3 class="crate"><span>${escapeHtml(s.myRooms)}</span></h3>
    <div class="cards">${list || `<div class="empty">${escapeHtml(s.noRooms)}</div>`}</div>
    <form class="stack studio-form" id="create-room-form">
      <h3 class="crate"><span>${escapeHtml(s.newRoom)}</span></h3>
      <label for="room-title">${escapeHtml(s.roomTitle)}</label>
      <input id="room-title" name="title" maxlength="120" required placeholder="${escapeHtml(s.roomTitlePlaceholder)}">
      <button class="btn yellow" type="submit">${escapeHtml(s.create)}</button>
    </form></div>`;
}

function wireStudio(): void {
  const form = appView.querySelector<HTMLFormElement>("#create-room-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (button) { button.disabled = true; button.textContent = copy.studio.creating; }
    const { data, error } = await supabase.rpc("create_room", { p_title: title });
    if (error || !data) {
      showToast(`${copy.studio.error} ${error?.message ?? ""}`);
      if (button) { button.disabled = false; button.textContent = copy.studio.create; }
      return;
    }
    location.hash = `#room-${data}`;
  });
}

function shortDate(value: string | null | undefined): string {
  return (value ?? "").slice(0, 10);
}

function logLine(entry: RoomLogRow, names: Map<string, string>): string {
  const s = copy.studio;
  const actor = entry.actor ? names.get(entry.actor) ?? copy.collab.unknownMember : "";
  const detail = entry.detail ?? {};
  const actions = s.logActions as Record<string, string>;
  const verb = actions[entry.action] ?? entry.action;
  let extra = "";
  if (entry.action === "member_added" || entry.action === "member_removed") extra = String(detail.name ?? "");
  if (entry.action === "link_added") extra = String(detail.label ?? "");
  if (entry.action === "next_step") extra = [detail.stage, detail.owner, detail.note].filter(Boolean).map(String).join(" · ");
  if (entry.action === "split_signed" && Array.isArray(detail.split)) {
    extra = (detail.split as { name?: string; percent?: number }[]).map((item) => `${item.name ?? ""} ${item.percent ?? 0}%`).join(", ");
  }
  const who = entry.action === "split_signed" ? "" : `<b>${escapeHtml(actor)}</b> `;
  return `<li><span class="m">${escapeHtml(shortDate(entry.created_at))}</span> ${who}${escapeHtml(verb)}${extra ? ` ${escapeHtml(extra)}` : ""}</li>`;
}

async function roomView(roomId: string): Promise<string> {
  const s = copy.studio;
  const access = await studioAccess();
  if (access.state !== "ready" || !supabase) return studioGate(access);
  const me = access.member;
  const [roomResult, membersResult, linksResult, logResult] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
    supabase.from("room_members").select("*").eq("room_id", roomId).order("added_at"),
    supabase.from("room_links").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
    supabase.from("room_log").select("*").eq("room_id", roomId).order("id", { ascending: false }).limit(60),
  ]);
  const room = roomResult.data;
  if (!room) return `<div class="stack"><a href="#studio">${escapeHtml(s.back)}</a><div class="empty">${escapeHtml(s.notFound)}</div></div>`;
  const members = membersResult.data ?? [];
  const links = linksResult.data ?? [];
  const log = logResult.data ?? [];
  const ids = [...new Set([...members.map((m) => m.profile_id), ...links.map((l) => l.added_by), ...log.map((e) => e.actor)].filter((id): id is string => Boolean(id)))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,name,slug").in("id", ids) : { data: [] };
  const names = new Map((people ?? []).map((person) => [person.id, person.name]));
  const slugs = new Map((people ?? []).map((person) => [person.id, person.slug]));
  const isCreator = room.created_by === me.userId;
  const drafting = room.status === "drafting_split";
  const editable = isCreator && drafting;
  const mine = members.find((m) => m.profile_id === me.userId);
  const total = members.reduce((sum, m) => sum + Number(m.percent), 0);
  const nameOf = (id: string | null) => (id ? names.get(id) ?? copy.collab.unknownMember : s.nextNobody);
  const personLink = (id: string) => slugs.get(id)
    ? `<a href="#artist-${escapeHtml(slugs.get(id))}">${escapeHtml(nameOf(id))}</a>` : escapeHtml(nameOf(id));

  const next = drafting
    ? escapeHtml(s.nextDrafting)
    : `<b>${escapeHtml(room.stage)}</b> · ${escapeHtml(nameOf(room.next_owner))}${room.next_owner ? `’s ${escapeHtml(s.turnOf)}` : ""}${room.next_note ? ` · ${escapeHtml(room.next_note)}` : ""}`;

  const rows = members.map((m) => {
    const signedCell = m.accepted_at ? `<span class="signed">${escapeHtml(s.signed)} ${escapeHtml(shortDate(m.accepted_at))}</span>` : `<span class="m">${escapeHtml(s.notSigned)}</span>`;
    if (editable) {
      const removeButton = m.profile_id === me.userId ? "" : `<button class="btn" type="button" data-remove-member="${escapeHtml(m.profile_id)}">${escapeHtml(s.remove)}</button>`;
      return `<tr data-member="${escapeHtml(m.profile_id)}"><td>${personLink(m.profile_id)}</td><td><input name="role" maxlength="60" value="${escapeHtml(m.role)}" aria-label="${escapeHtml(s.role)}"></td><td><input name="percent" type="number" min="0" max="100" step="0.01" value="${escapeHtml(Number(m.percent))}" aria-label="${escapeHtml(s.share)}"></td><td>${signedCell}</td><td>${removeButton}</td></tr>`;
    }
    return `<tr><td>${personLink(m.profile_id)}</td><td>${escapeHtml(m.role)}</td><td>${escapeHtml(Number(m.percent))}%</td><td>${signedCell}</td><td></td></tr>`;
  }).join("");

  const acceptButton = drafting && mine && !mine.accepted_at
    ? `<button class="btn yellow" type="button" id="accept-split">${escapeHtml(s.accept)}</button>` : "";
  const signedNote = !drafting && room.signed_at ? `<p class="note">${escapeHtml(s.signedOn)} ${escapeHtml(shortDate(room.signed_at))}.</p>` : "";
  const addMember = editable && members.length < 6 ? `<form class="studio-form stack" id="add-member-form">
      <h4 class="crate"><span>${escapeHtml(s.addMember)}</span></h4>
      <label for="member-slug">${escapeHtml(s.memberSlug)}</label>
      <input id="member-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="none">
      <span class="note">${escapeHtml(s.memberSlugHint)}</span>
      <label for="member-role">${escapeHtml(s.memberRole)}</label>
      <input id="member-role" name="role" maxlength="60">
      <button class="btn" type="submit">${escapeHtml(s.add)}</button>
    </form>` : "";

  const split = `<section class="about-section"><p class="eyebrow">01</p><h3 class="about-title">${escapeHtml(s.splitTitle)}</h3>
    <p class="note">${escapeHtml(s.splitHelp)}</p>
    <form id="split-form"><div class="table-wrap"><table class="split-table">
      <thead><tr><th>${escapeHtml(s.member)}</th><th>${escapeHtml(s.role)}</th><th>${escapeHtml(s.share)}</th><th>${escapeHtml(s.signed)}</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td>${escapeHtml(s.total)}</td><td></td><td><b id="split-total" class="${total === 100 ? "ok" : "off"}">${escapeHtml(Math.round(total * 100) / 100)}%</b></td><td></td><td></td></tr></tfoot>
    </table></div>
    ${editable ? `<button class="btn" type="submit">${escapeHtml(s.saveSplit)}</button>` : ""}</form>
    ${acceptButton}${signedNote}${addMember}</section>`;

  const kinds = s.kinds as Record<string, string>;
  const linkItems = links.map((link) => {
    const href = safeUrl(link.url);
    return `<div class="card"><p class="eyebrow">${escapeHtml(kinds[link.kind] ?? link.kind)}</p><h4>${escapeHtml(link.label)}</h4>${link.note ? `<span>${escapeHtml(link.note)}</span>` : ""}<span class="note">${escapeHtml(s.by)} ${escapeHtml(nameOf(link.added_by))} · ${escapeHtml(shortDate(link.created_at))}</span>${href ? `<a class="btn uv" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.open)}</a>` : ""}</div>`;
  }).join("");
  const files = `<section class="about-section"><p class="eyebrow">02</p><h3 class="about-title">${escapeHtml(s.filesTitle)}</h3>
    ${drafting ? `<div class="empty">${escapeHtml(s.filesLocked)}</div>` : `<p class="note">${escapeHtml(s.filesHelp)}</p>
    <div class="cards">${linkItems || `<div class="empty">${escapeHtml(s.noFiles)}</div>`}</div>
    <form class="studio-form stack" id="add-link-form">
      <label for="link-label">${escapeHtml(s.linkLabel)}</label>
      <input id="link-label" name="label" maxlength="120" required placeholder="${escapeHtml(s.linkLabelPlaceholder)}">
      <label for="link-url">${escapeHtml(s.linkUrl)}</label>
      <input id="link-url" name="url" type="url" required placeholder="https://">
      <label for="link-kind">${escapeHtml(s.linkKind)}</label>
      <select id="link-kind" name="kind">${Object.entries(kinds).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}</select>
      <label for="link-note">${escapeHtml(s.linkNote)}</label>
      <input id="link-note" name="note" maxlength="280" placeholder="${escapeHtml(s.linkNotePlaceholder)}">
      <button class="btn uv" type="submit">${escapeHtml(s.addLink)}</button>
    </form>`}</section>`;

  const stageIndex = s.stages.indexOf(room.stage as (typeof s.stages)[number]);
  const workflow = drafting ? "" : `<section class="about-section"><p class="eyebrow">03</p><h3 class="about-title">${escapeHtml(s.workflowTitle)}</h3>
    <ol class="stages">${s.stages.map((stage, index) => `<li class="${index < stageIndex ? "done" : index === stageIndex ? "current" : ""}">${escapeHtml(stage)}</li>`).join("")}</ol>
    <form class="studio-form stack" id="next-step-form">
      <label for="next-stage">${escapeHtml(s.nextStage)}</label>
      <select id="next-stage" name="stage">${s.stages.map((stage) => `<option${stage === room.stage ? " selected" : ""}>${escapeHtml(stage)}</option>`).join("")}</select>
      <label for="next-owner">${escapeHtml(s.nextOwner)}</label>
      <select id="next-owner" name="owner">${members.map((m) => `<option value="${escapeHtml(m.profile_id)}"${m.profile_id === room.next_owner ? " selected" : ""}>${escapeHtml(nameOf(m.profile_id))}</option>`).join("")}</select>
      <label for="next-note">${escapeHtml(s.nextNote)}</label>
      <input id="next-note" name="note" maxlength="280" value="${escapeHtml(room.next_note)}">
      <button class="btn yellow" type="submit">${escapeHtml(s.saveNext)}</button>
    </form></section>`;

  const timeline = `<section class="about-section"><p class="eyebrow">${drafting ? "03" : "04"}</p><h3 class="about-title">${escapeHtml(s.logTitle)}</h3>
    <ul class="room-log">${log.map((entry) => logLine(entry, names)).join("")}</ul></section>`;

  return `<div class="stack studio room" data-room="${escapeHtml(room.id)}">
    <a href="#studio">${escapeHtml(s.back)}</a>
    <p class="eyebrow">${escapeHtml(roomStatusLabel(room))}</p>
    <h2 class="h">${escapeHtml(room.title)}</h2>
    <div class="next-line"><span class="eyebrow">${escapeHtml(s.nextLabel)}</span><p>${next}</p></div>
    ${split}${files}${workflow}${timeline}</div>`;
}

function wireRoom(roomId: string): void {
  if (!supabase) return;
  const client = supabase;
  const s = copy.studio;
  const run = async (call: () => PromiseLike<{ error: { message: string } | null }>, success: string) => {
    const { error } = await call();
    if (error) {
      showToast(`${s.error} ${error.message}`);
      return;
    }
    showToast(success);
    await render();
  };
  const splitForm = appView.querySelector<HTMLFormElement>("#split-form");
  const updateTotal = () => {
    const sum = [...appView.querySelectorAll<HTMLInputElement>("#split-form input[name=percent]")].reduce((acc, input) => acc + (Number(input.value) || 0), 0);
    const totalEl = appView.querySelector<HTMLElement>("#split-total");
    if (totalEl) {
      totalEl.textContent = `${Math.round(sum * 100) / 100}%`;
      totalEl.className = Math.abs(sum - 100) < 0.001 ? "ok" : "off";
    }
  };
  splitForm?.addEventListener("input", updateTotal);
  splitForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const splits = [...splitForm.querySelectorAll<HTMLTableRowElement>("tr[data-member]")].map((row) => ({
      profile_id: row.dataset.member ?? "",
      percent: Number(row.querySelector<HTMLInputElement>("input[name=percent]")?.value ?? 0),
      role: row.querySelector<HTMLInputElement>("input[name=role]")?.value.trim() ?? "",
    }));
    void run(() => client.rpc("set_room_split", { p_room: roomId, p_splits: splits }), s.splitSaved);
  });
  appView.querySelectorAll<HTMLButtonElement>("[data-remove-member]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.confirm(s.removeConfirm)) return;
      void run(() => client.rpc("remove_room_member", { p_room: roomId, p_profile: button.dataset.removeMember ?? "" }), s.splitSaved);
    });
  });
  appView.querySelector<HTMLButtonElement>("#accept-split")?.addEventListener("click", async () => {
    const { data, error } = await client.rpc("accept_room_split", { p_room: roomId });
    if (error) {
      showToast(`${s.error} ${error.message}`);
      return;
    }
    showToast(data === "active" ? s.allSigned : s.accepted);
    await render();
  });
  const memberForm = appView.querySelector<HTMLFormElement>("#add-member-form");
  memberForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(memberForm);
    void run(() => client.rpc("add_room_member", {
      p_room: roomId,
      p_slug: String(values.get("slug") ?? "").trim().toLowerCase(),
      p_role: String(values.get("role") ?? "").trim(),
    }), s.splitSaved);
  });
  const linkForm = appView.querySelector<HTMLFormElement>("#add-link-form");
  linkForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(linkForm);
    const url = safeUrl(String(values.get("url") ?? "").trim());
    if (!url) {
      showToast(copy.collab.callLinkInvalid);
      return;
    }
    void run(() => client.rpc("add_room_link", {
      p_room: roomId,
      p_label: String(values.get("label") ?? "").trim(),
      p_url: url,
      p_kind: String(values.get("kind") ?? "other"),
      p_note: String(values.get("note") ?? "").trim(),
    }), s.linkAdded);
  });
  const nextForm = appView.querySelector<HTMLFormElement>("#next-step-form");
  nextForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(nextForm);
    void run(() => client.rpc("set_room_next_step", {
      p_room: roomId,
      p_stage: String(values.get("stage") ?? "Idea"),
      p_next_owner: String(values.get("owner") ?? "") || null,
      p_note: String(values.get("note") ?? "").trim(),
    }), s.nextSaved);
  });
}

const publishingEmail = "theoriginalbonhomme@gmail.com";

function publishingView(): string {
  const p = copy.publishing;
  const mailto = `mailto:${publishingEmail}?subject=${encodeURIComponent(p.contactSubject)}`;
  const section = (eyebrow: string, title: string, body: string) =>
    `<section class="about-section"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h3 class="about-title">${escapeHtml(title)}</h3>${body}</section>`;
  const values = section(p.valueEyebrow, p.valueTitle,
    `<div class="cards">${p.values.map((item) => `<div class="card"><h4>${escapeHtml(item.title)}</h4><span>${escapeHtml(item.text)}</span></div>`).join("")}</div>`);
  const caseStudy = section(p.caseEyebrow, p.caseTitle,
    `<p class="lead">${escapeHtml(p.caseLead)}</p>
    <div class="publishing-works">${p.caseWorks.map((work) => `<div class="publishing-work"><h4>${escapeHtml(work.title)}</h4><span>${escapeHtml(work.text)}</span>${work.href ? `<a class="btn solid" href="${escapeHtml(work.href)}" target="_blank" rel="noopener">${escapeHtml(work.cta)}</a>` : ""}</div>`).join("")}</div>
    <p><a class="btn" href="#artist-kati-murutar">${escapeHtml(p.caseProfile)}</a></p>
    <h4 class="crate"><span>${escapeHtml(p.caseDidTitle)}</span></h4>
    <ul class="about-points">${p.caseDid.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
    <p class="about-notice">${escapeHtml(p.caseStatus)}</p>
    <p class="note">${escapeHtml(p.caseNote)}</p>`);
  const steps = section(p.stepsEyebrow, p.stepsEyebrow.replace(/^\d+ · /, ""),
    `<div class="steps">${p.steps.map((step) => `<div class="step"><b>${escapeHtml(step.title)}</b><span>${escapeHtml(step.text)}</span></div>`).join("")}</div>`);
  const who = section(p.forEyebrow, p.forTitle,
    `<ul class="about-points">${p.forItems.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`);
  const door = section(p.doorEyebrow, p.doorTitle,
    `<p class="lead">${escapeHtml(p.doorText)}</p><p><a class="btn yellow" href="${escapeHtml(mailto)}">${escapeHtml(p.contact)}</a></p>`);
  return `<div class="stack about publishing">
    <p class="eyebrow">${escapeHtml(p.eyebrow)}</p>
    <h2 class="h">${escapeHtml(p.title)}</h2>
    <p class="intro">${escapeHtml(p.lead)}</p>
    <p><a class="btn uv" href="${escapeHtml(mailto)}">${escapeHtml(p.contact)}</a></p>
    ${values}${caseStudy}${steps}${who}${door}</div>`;
}

function cofounderView(): string {
  const c = copy.cofounder;
  const mailto = `mailto:${publishingEmail}?subject=${encodeURIComponent(c.contactSubject)}`;
  const section = (eyebrow: string, title: string, body: string) =>
    `<section class="about-section"><p class="eyebrow">${escapeHtml(eyebrow)}</p>${title ? `<h3 class="about-title">${escapeHtml(title)}</h3>` : ""}${body}</section>`;
  const list = (items: readonly string[]) => `<ul class="about-points">${items.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
  const who = section(c.whoEyebrow, c.whoTitle, list(c.whoPoints));
  const values = section(c.valueEyebrow, c.valueTitle,
    `<div class="cards">${c.values.map((item) => `<div class="card"><h4>${escapeHtml(item.title)}</h4><span>${escapeHtml(item.text)}</span></div>`).join("")}</div>`);
  const steps = section(c.stepsEyebrow, c.stepsEyebrow.replace(/^\d+ · /, ""),
    `<div class="steps">${c.steps.map((step) => `<div class="step"><b>${escapeHtml(step.title)}</b><span>${escapeHtml(step.text)}</span></div>`).join("")}</div>`);
  const principles = section(c.principlesEyebrow, c.principlesEyebrow.replace(/^\d+ · /, ""), list(c.principles));
  const forWho = section(c.forEyebrow, c.forTitle, list(c.forItems));
  const door = section(c.doorEyebrow, c.doorTitle,
    `<p class="lead">${escapeHtml(c.doorText)}</p><p><a class="btn yellow" href="${escapeHtml(mailto)}">${escapeHtml(c.contact)}</a></p>`);
  return `<div class="stack about cofounder">
    <p class="eyebrow">${escapeHtml(c.eyebrow)}</p>
    <h2 class="h">${escapeHtml(c.title)}</h2>
    <p class="intro">${escapeHtml(c.lead)}</p>
    <p><a class="btn uv" href="${escapeHtml(mailto)}">${escapeHtml(c.contact)}</a></p>
    ${who}${values}${steps}${principles}${forWho}${door}</div>`;
}

function aboutView(): string {
  const a = copy.about;
  const section = (eyebrow: string, title: string, body: string) =>
    `<section class="about-section"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h3 class="about-title">${escapeHtml(title)}</h3>${body}</section>`;
  const what = section(a.whatEyebrow, a.whatTitle,
    `<ul class="about-points">${a.whatPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul><p class="note">${escapeHtml(a.whatNote)}</p>`);
  const who = section(a.whoEyebrow, a.whoTitle,
    `<p class="lead">${escapeHtml(a.whoText)}</p><ul class="cities">${a.cities.map((city, index) => `<li${index === 0 ? ' class="first"' : ""}><b>${escapeHtml(city)}</b><span>${escapeHtml(index === 0 ? a.cityFirst : a.cityNext)}</span></li>`).join("")}</ul><p class="note">${escapeHtml(a.curators)}</p>`);
  const money = section(a.moneyEyebrow, a.moneyTitle,
    `<p class="about-notice">${escapeHtml(a.moneyNotice)}</p><div class="steps">${a.moneyPoints.map((point) => `<div class="step"><b>${escapeHtml(point.title)}</b><span>${escapeHtml(point.text)}</span></div>`).join("")}</div>`);
  const inside = section(a.insideEyebrow, a.insideEyebrow.replace(/^\d+ · /, ""),
    `<div class="cards">${a.insideItems.map((item) => `<div class="card"><p class="eyebrow">${escapeHtml(item.live ? a.live : a.coming)}</p><h4>${escapeHtml(item.title)}</h4><span>${escapeHtml(item.text)}</span>${item.href ? `<a class="btn" href="${escapeHtml(item.href)}">${escapeHtml(a.open)}</a>` : ""}</div>`).join("")}</div>`);
  const door = section(a.doorEyebrow, a.doorTitle,
    `<p class="lead">${escapeHtml(a.doorText)}</p><p><a class="btn yellow" href="#join">${escapeHtml(a.doorJoin)}</a></p>${subscriberForm()}`);
  return `<div class="stack about"><h2 class="h">${escapeHtml(a.title)}</h2><p class="intro">${escapeHtml(a.lead)}</p>${what}${who}${money}${inside}${door}</div>`;
}

function libraryView(): string {
  const types = [copy.library.all, ...new Set(releases.map((release) => release.type))];
  const query = searchQuery.toLowerCase();
  const downloadableOnly = new URLSearchParams(location.search).get("downloadable") === "1";
  const list = releases.filter((release) => (typeFilter === copy.library.all || release.type === typeFilter)
    && (!downloadableOnly || Boolean(releaseDownloadHref(release)))
    && (!query || [release.title, release.genre, release.bpm, release.alias, release.mood, release.place, ...(release.artists ?? []).map(artistName)]
      .join(" ").toLowerCase().includes(query)));
  return `<div class="stack"><h2 class="h">${escapeHtml(copy.library.title)}</h2><p class="note">${escapeHtml(copy.library.description)}</p>
    <div class="tools"><input type="search" id="q" placeholder="${escapeHtml(copy.library.search)}" value="${escapeHtml(searchQuery)}" aria-label="${escapeHtml(copy.library.search)}">${types.map((type) => `<button class="chip" data-t="${escapeHtml(type)}" aria-pressed="${type === typeFilter}">${escapeHtml(type)}</button>`).join("")}</div>
    ${downloadableOnly ? `<p class="note">${escapeHtml(copy.library.downloadableOnly)}</p>` : ""}
    <div class="list">${list.map((release) => releaseRow(release)).join("") || `<div class="empty">${escapeHtml(downloadableOnly ? copy.library.noDownloadable : list.length ? copy.library.noResults : copy.library.empty)}</div>`}</div></div>`;
}

function artistsView(liveArtists: Artist[]): string {
  const publishingOnly = new Set(artists.filter((artist) => artist.publishing_only).map((artist) => artist.slug));
  const allArtists = artists.filter((artist) => !artist.publishing_only);
  [...liveArtists, ...listedArtists].forEach((candidate) => {
    if (publishingOnly.has(candidate.slug)) return;
    if (!allArtists.some((artist) => artist.slug === candidate.slug)) allArtists.push(candidate);
  });
  const roles = [copy.artists.all, ...new Set(allArtists.flatMap((artist) => artist.roles ?? []))];
  const filtered = allArtists.filter((artist) => roleFilter === copy.artists.all || (artist.roles ?? []).includes(roleFilter));
  return `<div class="stack"><h2 class="h">${escapeHtml(copy.artists.title)}</h2><p class="note">${escapeHtml(copy.artists.description)}</p>
    <div class="tools">${roles.map((role) => `<button class="chip" data-r="${escapeHtml(role)}" aria-pressed="${role === roleFilter}">${escapeHtml(role)}</button>`).join("")}</div>
    <div class="cards">${filtered.map(card).join("") || `<div class="empty">${escapeHtml(copy.artists.noRole)}</div>`}</div>
    <p class="note">${escapeHtml(copy.artists.joinInvite)} <a href="#join">${escapeHtml(copy.artists.apply)}</a>.</p></div>`;
}

async function collabView(): Promise<string> {
  const member = await currentMember();
  const calls = await loadCalls();
  const visibleCalls = member ? calls : calls.filter((call) => (call.status ?? "").toLowerCase() === "open");
  const demoCallIds = visibleCalls
    .filter((call) => Boolean(member && (member.isAdmin || call.ownerId === member.userId)))
    .map((call) => call.id);
  const demos = await loadDemos(demoCallIds);
  const demosByCall = new Map<string, DemoRow[]>();
  demos.forEach((demo) => demosByCall.set(demo.call_id, [...(demosByCall.get(demo.call_id) ?? []), demo]));
  const createRoom = member
    ? `<button class="btn uv" type="button" id="show-create-call">${escapeHtml(copy.collab.createRoom)}</button>`
    : "";
  const createForm = member ? `<div id="create-call-slot" hidden>${callFormMarkup()}</div>` : "";
  return `<div class="stack"><div class="mast" style="align-items:center"><h2 class="h">${escapeHtml(copy.collab.title)}</h2>${createRoom}</div>
    <p class="note">${escapeHtml(copy.collab.description)}</p>
    ${createForm}
    <div class="cards">${visibleCalls.map((call) => {
      const showDemos = Boolean(member && (member.isAdmin || call.ownerId === member.userId));
      return callCard(call, demosByCall.get(call.id) ?? [], showDemos);
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
  const artist = artists.find((candidate) => candidate.slug === slug)
    ?? liveArtists.find((candidate) => candidate.slug === slug)
    ?? listedArtists.find((candidate) => candidate.slug === slug);
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
  const route = hash.slice(1) === "press" ? "publishing" : hash.slice(1);
  if (route.startsWith("room-")) return { view: "room", arg: route.slice("room-".length) };
  return route.startsWith("artist-")
    ? { view: "artist", arg: route.slice("artist-".length) }
    : route === "curator"
      ? { view: "join", arg: "curator" }
      : { view: ["channel", "about", "library", "artists", "studio", "publishing", "cofounder", "collab", "join", "signin"].includes(route) ? route : "channel", arg: "" };
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

function slugFromName(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function inviteUrlFor(code: string): string {
  return `${location.origin}${location.pathname}?invite=${encodeURIComponent(code)}#join`;
}

function inviteMailto(email: string, inviteUrl: string, listed?: { name: string; slug: string }): string {
  const j = copy.join;
  const profileUrl = listed ? `${location.origin}${location.pathname}#artist-${encodeURIComponent(listed.slug)}` : "";
  const body = (listed ? j.mailBodyListed : j.mailBodyPlain).replace("{profile}", profileUrl).replace("{link}", inviteUrl);
  const text = `${j.mailGreeting}${listed ? ` ${listed.name}` : ""},\n\n${body}\n\n${j.mailSignoff}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(j.mailSubject)}&body=${encodeURIComponent(text)}`;
}

function inviteResultMarkup(email: string, inviteUrl: string, expiresAt: string, listed?: { name: string; slug: string }): string {
  return `<p class="note">${escapeHtml(copy.join.inviteReady)} ${escapeHtml(copy.join.inviteExpires)} ${escapeHtml(new Date(expiresAt).toLocaleDateString())}.</p>
    <div class="links"><a class="btn yellow" href="${escapeHtml(inviteMailto(email, inviteUrl, listed))}">${escapeHtml(copy.join.emailInvite)}</a><button type="button" class="btn copy-invite" data-url="${escapeHtml(inviteUrl)}">${escapeHtml(copy.join.copyLink)}</button></div>`;
}

function wireCopyInvite(scope: ParentNode, messageTarget: Element | null): void {
  scope.querySelectorAll<HTMLButtonElement>(".copy-invite").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.url ?? "");
        showToast(copy.join.copied);
      } catch {
        setMessage(messageTarget, copy.messages.copyError, "error");
      }
    });
  });
}

async function prefillFromListing(panel: HTMLElement, code: string): Promise<void> {
  if (!supabase || !code) return;
  const { data } = await supabase.rpc("get_invite_listing", { p_code: code });
  const listing = data?.[0];
  if (!listing) return;
  const set = (selector: string, value: string) => {
    const input = panel.querySelector<HTMLInputElement>(selector);
    if (input && !input.value) input.value = value;
  };
  set("#profile-name", listing.name);
  set("#profile-slug", listing.slug);
  if (listing.roles?.length) set("#profile-roles", listing.roles.join(", "));
  panel.querySelector("#profile-form h3")?.insertAdjacentHTML("afterend",
    `<p class="notice">${escapeHtml(copy.join.listedWaitingStart)} ${escapeHtml(listing.name)} ${escapeHtml(copy.join.listedWaitingMiddle)} <b>${escapeHtml(listing.slug)}</b> ${escapeHtml(copy.join.listedWaitingEnd)}</p>`);
}

function codeFormMarkup(): string {
  const j = copy.join;
  return `<form id="code-form" class="stack code-form"><label for="card-code">${escapeHtml(j.codeLabel)}</label>
    <div class="code-row"><input id="card-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" required placeholder="${escapeHtml(j.codePlaceholder)}"><button class="btn uv" type="submit">${escapeHtml(j.codeButton)}</button></div>
    <span class="note">${escapeHtml(j.codeHelp)}</span><p id="code-message" aria-live="polite"></p></form>`;
}

function wireCodeForm(panel: HTMLElement): void {
  const form = panel.querySelector<HTMLFormElement>("#code-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const raw = String(new FormData(form).get("code") ?? "").trim();
    const message = form.querySelector<HTMLElement>("#code-message");
    const submit = form.querySelector<HTMLButtonElement>("button");
    if (!raw) return;
    if (submit) submit.disabled = true;
    const { data: valid, error } = await supabase.rpc("check_invite", { p_code: raw });
    if (submit) submit.disabled = false;
    if (error) {
      setMessage(message, `${copy.messages.inviteCheckError} ${error.message}`, "error");
      return;
    }
    if (!valid) {
      setMessage(message, copy.join.codeInvalid, "error");
      return;
    }
    const cardCode = /^[0-9a-f]{32}$/.test(raw) ? raw : raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    history.replaceState(null, "", `${location.pathname}?invite=${encodeURIComponent(cardCode)}#join`);
    await joinPage();
  });
}

async function cardCodesDeskMarkup(): Promise<string> {
  if (!supabase) return "";
  const j = copy.join;
  const { data: codes, error } = await supabase.from("card_codes").select("*").order("created_at", { ascending: false });
  if (error) return `<p class="note">${escapeHtml(error.message)}</p>`;
  const items = (codes ?? []).map((row) => {
    const expired = new Date(row.expires_at).getTime() <= Date.now();
    const state = !row.active ? j.cardCodeOff : expired ? j.cardCodeExpired : row.uses >= row.max_uses ? j.cardCodeFull : j.cardCodeOn;
    return `<article class="card"><span class="k">${escapeHtml(state)}</span><h4 class="card-code">${escapeHtml(row.code)}</h4>
      <span class="note">${escapeHtml(row.label)}</span>
      <span class="note">${escapeHtml(`${row.uses} / ${row.max_uses} ${j.cardCodeUsed} · ${j.inviteExpires} ${new Date(row.expires_at).toLocaleDateString()}`)}</span>
      <button class="btn" type="button" data-card-code="${escapeHtml(row.code)}" data-card-active="${row.active ? "false" : "true"}">${escapeHtml(row.active ? j.cardCodeSwitchOff : j.cardCodeSwitchOn)}</button></article>`;
  }).join("");
  return `<section class="stack" id="card-codes-desk"><h3 class="crate"><span>${escapeHtml(j.cardCodesTitle)}</span></h3>
    <p class="note">${escapeHtml(j.cardCodesHelp)}</p>
    <div class="cards">${items || `<p class="note">${escapeHtml(j.cardCodesEmpty)}</p>`}</div>
    <form class="studio-form stack" id="card-code-form">
      <label for="new-card-code">${escapeHtml(j.cardCodeNew)}</label><input id="new-card-code" name="code" maxlength="20" autocomplete="off" required>
      <label for="new-card-label">${escapeHtml(j.cardCodeLabel)}</label><input id="new-card-label" name="label" maxlength="120">
      <label for="new-card-max">${escapeHtml(j.cardCodeMax)}</label><input id="new-card-max" name="max" type="number" min="1" max="10000" value="300" required>
      <label for="new-card-end">${escapeHtml(j.cardCodeEnd)}</label><input id="new-card-end" name="end" type="date" required>
      <button class="btn uv" type="submit">${escapeHtml(j.cardCodeCreate)}</button>
    </form><p id="card-code-message" aria-live="polite"></p></section>`;
}

function wireCardCodesDesk(panel: HTMLElement): void {
  if (!supabase) return;
  const client = supabase;
  const message = panel.querySelector("#card-code-message");
  panel.querySelectorAll<HTMLButtonElement>("[data-card-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const { error } = await client.rpc("set_card_code_active", { p_code: button.dataset.cardCode ?? "", p_active: button.dataset.cardActive === "true" });
      if (error) {
        button.disabled = false;
        setMessage(message, error.message, "error");
        return;
      }
      await joinPage();
    });
  });
  const form = panel.querySelector<HTMLFormElement>("#card-code-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const end = String(values.get("end") ?? "");
    const { error } = await client.rpc("create_card_code", {
      p_code: String(values.get("code") ?? ""),
      p_label: String(values.get("label") ?? ""),
      p_max_uses: Number(values.get("max") ?? 0),
      p_expires_at: new Date(`${end}T23:59:59`).toISOString(),
    });
    if (error) {
      setMessage(message, error.message, "error");
      return;
    }
    await joinPage();
  });
}

async function listedDeskMarkup(): Promise<string> {
  if (!supabase) return "";
  const j = copy.join;
  const [{ data: listed }, { data: invites }, { data: claimed }] = await Promise.all([
    supabase.from("listed_artists").select("slug,name,roles,created_at").order("name"),
    supabase.from("invites").select("*").not("listed_slug", "is", null).order("created_at", { ascending: false }),
    supabase.from("profiles").select("slug,status"),
  ]);
  const claimedSlugs = new Map((claimed ?? []).map((profile) => [profile.slug, profile.status]));
  const items = (listed ?? []).map((artist) => {
    const invite = (invites ?? []).find((row) => row.listed_slug === artist.slug);
    const claimStatus = claimedSlugs.get(artist.slug);
    const status = claimStatus
      ? `${j.listedStatusClaimed}${claimStatus === "pending" ? ` · ${j.profilePending}` : ""}`
      : invite
        ? `${j.listedStatusInvited} ${invite.email}${invite.used_at ? ` · ${j.used}` : ` · ${j.inviteExpires} ${new Date(invite.expires_at).toLocaleDateString()}`}`
        : j.listedStatusIncognito;
    const inviteForm = claimStatus ? "" : `<form class="studio-form stack" data-listed-invite="${escapeHtml(artist.slug)}" data-listed-name="${escapeHtml(artist.name)}">
        <label>${escapeHtml(j.listedInviteEmail)}<input type="email" name="email" autocomplete="off" required></label>
        <button class="btn uv" type="submit">${escapeHtml(j.listedInviteButton)}</button>
        <div data-listed-result></div>
      </form>`;
    return `<article class="card incognito"><div class="roles">${(artist.roles ?? []).map((role) => `<span class="role">${escapeHtml(role)}</span>`).join("")}</div>
      <h4><a href="#artist-${encodeURIComponent(artist.slug)}">${escapeHtml(artist.name)}</a></h4>
      <span class="note">${escapeHtml(status)}</span>${inviteForm}
      <button class="btn" type="button" data-listed-remove="${escapeHtml(artist.slug)}">${escapeHtml(j.listedRemove)}</button></article>`;
  }).join("");
  return `<section class="stack" id="listed-desk"><h3 class="crate"><span>${escapeHtml(j.listedTitle)}</span><span>${escapeHtml(j.listedSubtitle)}</span></h3>
    <p class="note">${escapeHtml(j.listedHelp)}</p>
    <form class="studio-form stack" id="listed-form">
      <label for="listed-name">${escapeHtml(j.listedName)}</label><input id="listed-name" name="name" maxlength="80" required>
      <label for="listed-slug">${escapeHtml(j.listedSlug)}</label><input id="listed-slug" name="slug" maxlength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" required autocapitalize="none">
      <label for="listed-roles">${escapeHtml(j.listedRoles)}</label><input id="listed-roles" name="roles" maxlength="200"><span class="note">${escapeHtml(j.rolesHint)}</span>
      <button class="btn yellow" type="submit">${escapeHtml(j.listedCreate)}</button>
    </form>
    <div class="cards">${items || `<div class="empty">${escapeHtml(j.listedEmpty)}</div>`}</div>
    <p id="listed-message" aria-live="polite"></p></section>`;
}

function wireListedDesk(panel: HTMLElement): void {
  if (!supabase) return;
  const client = supabase;
  const message = panel.querySelector("#listed-message");
  const nameInput = panel.querySelector<HTMLInputElement>("#listed-name");
  const slugInput = panel.querySelector<HTMLInputElement>("#listed-slug");
  let slugTouched = false;
  slugInput?.addEventListener("input", () => { slugTouched = true; });
  nameInput?.addEventListener("input", () => {
    if (!slugTouched && slugInput) slugInput.value = slugFromName(nameInput.value);
  });
  const form = panel.querySelector<HTMLFormElement>("#listed-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const roles = String(values.get("roles") ?? "").split(",").map((role) => role.trim()).filter(Boolean);
    const { error } = await client.rpc("create_listed_artist", {
      p_name: String(values.get("name") ?? "").trim(),
      p_slug: String(values.get("slug") ?? "").trim().toLowerCase(),
      p_roles: roles,
    });
    if (error) {
      setMessage(message, error.message, "error");
      return;
    }
    showToast(copy.join.listedCreated);
    await loadListedArtists();
    await joinPage();
  });
  panel.querySelectorAll<HTMLFormElement>("[data-listed-invite]").forEach((inviteForm) => {
    inviteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(new FormData(inviteForm).get("email") ?? "").trim().toLowerCase();
      const slug = inviteForm.dataset.listedInvite ?? "";
      const name = inviteForm.dataset.listedName ?? "";
      const button = inviteForm.querySelector<HTMLButtonElement>("button[type=submit]");
      if (button) button.disabled = true;
      const { data, error } = await client.rpc("create_listed_invite", { p_slug: slug, p_email: email }).single();
      if (button) button.disabled = false;
      const result = inviteForm.querySelector<HTMLElement>("[data-listed-result]");
      if (error || !data || !result) {
        setMessage(result ?? message, error?.message ?? copy.messages.inviteCreateError, "error");
        return;
      }
      result.innerHTML = inviteResultMarkup(email, inviteUrlFor(data.code), data.expires_at, { name, slug });
      wireCopyInvite(result, message);
    });
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-listed-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm(copy.join.listedRemoveConfirm)) return;
      const { error } = await client.rpc("delete_listed_artist", { p_slug: button.dataset.listedRemove ?? "" });
      if (error) {
        setMessage(message, error.message, "error");
        return;
      }
      await loadListedArtists();
      await joinPage();
    });
  });
}

async function handleInvite(email: string): Promise<void> {
  if (!supabase) throw new Error(copy.messages.configMissing);
  const { data, error } = await supabase.rpc("create_invite", { p_email: email }).single();
  if (error) throw new Error(`${copy.messages.inviteCreateError} ${error.message}`);
  const inviteUrl = inviteUrlFor(data.code);
  const message = appView.querySelector<HTMLElement>("#invite-message");
  if (message) {
    message.innerHTML = inviteResultMarkup(email, inviteUrl, data.expires_at);
    message.className = "";
    wireCopyInvite(message, message);
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
    { data: callRows, error: callError },
    { data: demoRows, error: demoError },
  ] = await Promise.all([
    supabase.from("profiles").select("id,slug,name,roles,location,bio,offers,looking_for,creates,links,contact,photo_path,status,invited_by,created_at").order("created_at"),
    supabase.from("invites").select("*").order("created_at"),
    supabase.from("subscribers").select("id,email,consented_at,unsubscribed_at,created_at").order("created_at"),
    supabase.from("calls").select("id,created_by,title,date,have,need,text,link,status,created_at").order("created_at", { ascending: false }),
    supabase.from("demos").select("id,call_id,name,email,link,message,created_at,status").order("created_at", { ascending: false }),
  ]);
  if (profileError) throw new Error(`${copy.messages.loadProfilesError} ${profileError.message}`);
  if (inviteError) throw new Error(`${copy.messages.inviteListError} ${inviteError.message}`);
  if (subscriberError) throw new Error(`${copy.messages.subscriberLoadError} ${subscriberError.message}`);
  if (callError) throw new Error(`${copy.collab.callLoadError} ${callError.message}`);
  if (demoError) throw new Error(`${copy.collab.demoLoadError} ${demoError.message}`);

  const allProfiles = profileRows ?? [];
  const allInvites = inviteRows ?? [];
  const names = new Map(allProfiles.map((profile) => [profile.id, profile.name]));
  const pending = allProfiles.filter((profile) => profile.status === "pending");
  const { data: intentions, error: intentionError } = await supabase.rpc("get_profile_intentions", {
    p_profile_ids: pending.map((profile) => profile.id),
  });
  if (intentionError) throw new Error(`${copy.messages.intentionLoadError} ${intentionError.message}`);
  const intentionByProfile = new Map((intentions ?? []).map((item) => [item.profile_id, item.intention]));
  const demosByCall = new Map<string, DemoRow[]>();
  (demoRows ?? []).forEach((demo) => demosByCall.set(demo.call_id, [...(demosByCall.get(demo.call_id) ?? []), demo]));
  const curatorDemos = (callRows ?? []).map((call) => `<article class="demo-call"><h4>${escapeHtml(call.title)}</h4>${demoList(call.id, demosByCall.get(call.id) ?? [])}</article>`).join("")
    || `<p class="note">${escapeHtml(copy.collab.noDemos)}</p>`;
  return `<section id="curator-desk" class="stack"><h3 class="crate"><span>${escapeHtml(copy.join.curatorDesk)}</span><span>${escapeHtml(copy.join.pendingApplications)}</span></h3>
    ${pending.length ? pending.map((profile) => `<article class="card pending-card" style="margin:10px 0"><span class="k">${escapeHtml(new Date(profile.created_at).toLocaleDateString())}</span><h4>${escapeHtml(profile.name)}</h4><span class="note">${escapeHtml(profile.roles.join(" · "))}${profile.location ? ` · ${escapeHtml(profile.location)}` : ""}</span><p class="lead">${escapeHtml(profile.bio)}</p><section class="stack"><h3 class="crate"><span>${escapeHtml(copy.join.intention)}</span></h3>${textBlocks(intentionByProfile.get(profile.id))}</section>${profile.invited_by ? `<p class="note">${escapeHtml(copy.profile.invitedBy)} <a href="#artist-${encodeURIComponent(allProfiles.find((inviter) => inviter.id === profile.invited_by)?.slug ?? "")}">${escapeHtml(names.get(profile.invited_by) ?? "")}</a></p>` : ""}<div class="links"><button class="btn uv" type="button" data-review="approve" data-id="${escapeHtml(profile.id)}">${escapeHtml(copy.join.approve)}</button><button class="btn" type="button" data-review="veto" data-id="${escapeHtml(profile.id)}">${escapeHtml(copy.join.veto)}</button></div></article>`).join("") : `<p class="note">${escapeHtml(copy.join.noPending)}</p>`}
    <details><summary class="k">${escapeHtml(copy.join.fullInviteTree)}</summary><ul class="journey">${allProfiles.map((profile) => `<li><b>${escapeHtml(profile.name)}</b><span class="note">${profile.invited_by ? `${escapeHtml(copy.profile.invitedBy)} ${escapeHtml(names.get(profile.invited_by) ?? "")}` : ""}${allInvites.filter((invite) => invite.created_by === profile.id).map((invite) => `<br>${escapeHtml(invite.email)} · ${escapeHtml(invite.used_by ? copy.join.used : copy.join.unused)} · ${escapeHtml(copy.join.inviteExpires)} ${escapeHtml(new Date(invite.expires_at).toLocaleDateString())}`).join("")}</span></li>`).join("") || `<li class="note">${escapeHtml(copy.join.noPending)}</li>`}</ul></details>
    <section class="stack"><h3 class="crate"><span>${escapeHtml(copy.subscriber.curatorTitle)}</span><button type="button" class="btn copy-subscriber-emails">${escapeHtml(copy.subscriber.copyAllEmails)}</button></h3>
      <ul class="subscriber-list">${(subscriberRows ?? []).map((subscriber) => `<li>${escapeHtml(subscriber.email)}</li>`).join("") || `<li class="note">${escapeHtml(copy.subscriber.empty)}</li>`}</ul>
      <p id="subscriber-copy-message" aria-live="polite"></p>
    </section><section class="stack"><h3 class="crate">${escapeHtml(copy.collab.demos)}</h3>${curatorDemos}</section>
    <p id="review-message" aria-live="polite"></p></section>`;
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
    if (!code) {
      panel.innerHTML = codeFormMarkup();
      wireCodeForm(panel);
      return;
    }
    panel.innerHTML = `<p class="note">${escapeHtml(copy.join.codeAccepted)}</p><form id="magic-link-form" class="stack"><label for="join-email">${escapeHtml(copy.join.inviteEmail)}</label><input id="join-email" type="email" name="email" autocomplete="email" required><button class="btn uv" type="submit">${escapeHtml(copy.join.sendMagicLink)}</button><p id="auth-message" class="note" aria-live="polite"></p></form>`;
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
        panel.insertAdjacentHTML("beforeend", await cardCodesDeskMarkup());
        wireCardCodesDesk(panel);
        panel.insertAdjacentHTML("beforeend", await listedDeskMarkup());
        wireListedDesk(panel);
        panel.insertAdjacentHTML("beforeend", curator);
        wireCallAndDemoForms();
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
    panel.innerHTML = `<p class="note">${escapeHtml(copy.join.signedInAs)} ${escapeHtml(user.email ?? "")}. ${escapeHtml(copy.join.inviteRequired)}</p>${codeFormMarkup()}`;
    wireCodeForm(panel);
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
  void prefillFromListing(panel, code);
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

type SiteSection = "publishing" | "cofounder" | "platform";

function setSection(section: SiteSection): void {
  const meta = section === "publishing" ? copy.publishing : section === "cofounder" ? copy.cofounder : null;
  document.body.dataset.section = section;
  const word = document.querySelector<HTMLElement>(".word");
  if (word) word.innerHTML = `${escapeHtml(copy.brand.titleStart)}<span>${escapeHtml(copy.brand.titleEnd)}</span>${meta ? `<b class="word-section">${escapeHtml(meta.nav)}</b>` : ""}`;
  const tagline = document.querySelector<HTMLElement>("#tagline");
  if (tagline) tagline.textContent = meta ? meta.sectionTagline : site.tagline || copy.brand.taglineFallback;
  const byline = document.querySelector<HTMLElement>("#platform-line");
  if (byline) byline.textContent = meta ? meta.sectionByline : copy.brand.platform;
  document.title = meta ? meta.eyebrow : copy.brand.documentTitle;
  document.querySelectorAll<HTMLAnchorElement>("#footer-links a[data-foot]").forEach((link) => {
    link.setAttribute("aria-current", link.dataset.foot === section ? "page" : "false");
  });
}

async function render(): Promise<void> {
  document.querySelector("#auth-callback-message")?.remove();
  const route = routeName();
  setSection(route.view === "publishing" ? "publishing" : route.view === "cofounder" ? "cofounder" : "platform");
  document.querySelectorAll<HTMLAnchorElement>("nav a").forEach((link) => {
    const target = route.view === "artist" ? "artists" : route.view === "room" ? "studio" : route.view;
    link.setAttribute("aria-current", link.getAttribute("href") === `#${target}` ? "page" : "false");
  });
  const liveArtists = route.view === "artists" || route.view === "artist" ? await getLiveProfiles() : [];
  switch (route.view) {
    case "about":
      appView.innerHTML = aboutView();
      wireSubscriberForms();
      return;
    case "publishing":
      appView.innerHTML = publishingView();
      return;
    case "cofounder":
      appView.innerHTML = cofounderView();
      return;
    case "studio":
      appView.innerHTML = await studioView();
      wireStudio();
      return;
    case "room":
      appView.innerHTML = await roomView(route.arg);
      wireRoom(route.arg);
      return;
    case "library":
      appView.innerHTML = libraryView();
      wireLibrary();
      return;
    case "artists":
      appView.innerHTML = artistsView(liveArtists);
      wireArtists();
      return;
    case "collab":
      appView.innerHTML = await collabView();
      wireCallAndDemoForms();
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
      appView.innerHTML = await channelView();
      wireSubscriberForms();
      wireProfile();
      wirePlay();
      wireCallAndDemoForms();
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

  await Promise.all([updateAccountHeader(), loadListedArtists()]);
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
