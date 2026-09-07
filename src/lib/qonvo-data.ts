export type Room = {
  id: string;
  name: string;
  region: string;
  online: number;
};

export const ROOMS: Room[] = [
  { id: "global", name: "Global Chat", region: "Featured", online: 12481 },
  { id: "hot", name: "Hot Topics", region: "Featured", online: 8204 },
  { id: "music", name: "Music & Vibes", region: "Entertainment", online: 2401 },
  { id: "game", name: "Gaming Lounge", region: "Gaming", online: 5802 },
  { id: "tech", name: "Tech", region: "Tech", online: 3901 },
  { id: "sport", name: "Sports", region: "Sports", online: 3102 },
  { id: "edu", name: "Education", region: "Education", online: 1402 },
  { id: "food", name: "Food", region: "Food", online: 980 },
  { id: "biz", name: "Business", region: "Business", online: 1604 },
  { id: "lang", name: "Language Exchange", region: "Featured", online: 3119 },
  { id: "ng", name: "Nigeria", region: "Africa", online: 8204 },
  { id: "gh", name: "Ghana", region: "Africa", online: 1892 },
  { id: "za", name: "South Africa", region: "Africa", online: 2103 },
  { id: "ke", name: "Kenya", region: "Africa", online: 1204 },
  { id: "eg", name: "Egypt", region: "Africa", online: 2890 },
  { id: "et", name: "Ethiopia", region: "Africa", online: 891 },
  { id: "ma", name: "Morocco", region: "Africa", online: 1340 },
  { id: "us", name: "United States", region: "Americas", online: 9310 },
  { id: "br", name: "Brazil", region: "Americas", online: 4108 },
  { id: "mx", name: "Mexico", region: "Americas", online: 3890 },
  { id: "ca", name: "Canada", region: "Americas", online: 2104 },
  { id: "ar", name: "Argentina", region: "Americas", online: 1802 },
  { id: "in", name: "India", region: "Asia", online: 11020 },
  { id: "jp", name: "Japan", region: "Asia", online: 6520 },
  { id: "kr", name: "South Korea", region: "Asia", online: 5102 },
  { id: "id", name: "Indonesia", region: "Asia", online: 4580 },
  { id: "ph", name: "Philippines", region: "Asia", online: 3740 },
  { id: "cn", name: "China", region: "Asia", online: 7041 },
  { id: "pk", name: "Pakistan", region: "Asia", online: 3120 },
  { id: "gb", name: "United Kingdom", region: "Europe", online: 3210 },
  { id: "fr", name: "France", region: "Europe", online: 2801 },
  { id: "de", name: "Germany", region: "Europe", online: 2210 },
  { id: "it", name: "Italy", region: "Europe", online: 1904 },
  { id: "es", name: "Spain", region: "Europe", online: 2011 },
  { id: "tr", name: "Turkey", region: "Middle East", online: 3401 },
  { id: "sa", name: "Saudi Arabia", region: "Middle East", online: 2890 },
  { id: "ae", name: "UAE", region: "Middle East", online: 2201 },
  { id: "au", name: "Australia", region: "Oceania", online: 2801 },
  { id: "nz", name: "New Zealand", region: "Oceania", online: 891 },
];

export const REGIONS = ["All", ...Array.from(new Set(ROOMS.map((r) => r.region)))];

export const COMMUNITIES = [
  { id: "africa", name: "Africa Hub", region: "Africa" },
  { id: "americas", name: "Americas Hub", region: "Americas" },
  { id: "asia", name: "Asia Hub", region: "Asia" },
  { id: "europe", name: "Europe Hub", region: "Europe" },
  { id: "me", name: "Middle East Hub", region: "Middle East" },
  { id: "tech", name: "Tech", region: "Tech" },
  { id: "game", name: "Gaming", region: "Gaming" },
] as const;

export const MENU = [
  ["home", "Home"],
  ["forum", "Forum & Topics"],
  ["community", "Communities"],
  ["search", "Search"],
  ["create", "Create post"],
  ["profile", "My Profile"],
  ["dashboard", "Dashboard"],
  ["bookmarks", "My Bookmarks"],
  ["notifications", "Notifications"],
  ["teams", "Teams"],
  ["badges", "Badges"],
  ["leaderboard", "Leaderboard"],
  ["trending", "Trending tags"],
  ["ads", "Advertise"],
  ["contact", "Contact"],
  ["admin", "Admin"],
  ["settings", "Settings"],
  ["help", "Help & FAQ"],
] as const;

export type MenuId = (typeof MENU)[number][0];

export type ChatMsg = {
  n: string;
  t: string;
  ts: number;
  rx?: Record<string, number>;
};

export type Post = {
  id: string;
  title: string;
  body: string;
  excerpt?: string;
  author: string;
  ts: number;
  comments: { author: string; body: string; ts: number }[];
  category?: string;
  tags?: string;
  link?: string;
  image?: string;
  slug?: string;
  status?: "draft" | "publish";
};

export const POST_CATS = ["General", "News", "Naija", "Tech", "Sports", "Business", "Culture", "Opinion"];

export function safeHttpUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export type Team = { id: string; name: string; members: string[] };
export type Campaign = {
  id: string;
  name: string;
  note: string;
  ts: number;
  status: "pending" | "paid" | "approved" | "rejected";
  placement: "sidebar" | "hero" | "chat";
  txHash?: string;
  amount?: string;
};
export type Join = { name: string; ts: number; room?: string };
export type Note = { id: string; text: string; ts: number };

export const PREFIX = "qonvo.v6.";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function clearAll() {
  const drop: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) drop.push(k);
  }
  drop.forEach((k) => localStorage.removeItem(k));
}

export function allRoomMessages(): ChatMsg[] {
  const out: ChatMsg[] = [];
  for (const room of ROOMS) {
    out.push(...loadJson<ChatMsg[]>(`msgs.${room.id}`, []));
  }
  return out;
}

export function roomName(id: string) {
  return ROOMS.find((r) => r.id === id)?.name ?? id;
}

export function handleColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 64%)`;
}

export const TERMS = `NaijaForum Terms of Use

By creating an account or using post, music, video, or advertising tools you agree:

1. You are responsible for what you publish. Do not post illegal content, scams, hate, or anyone’s private data.
2. Music and video links must be yours to share. Playback stays on YouTube, Spotify, and other platforms. We do not host audio or video files.
3. Ads you submit may be refused. Payment hashes are a record only until a live payment check exists.
4. Handles and public posts can be seen by others on this device network. Do not treat this preview as a bank or a lawyer.
5. We may hide, reject, or remove content and accounts that break these rules.
6. The service is provided as-is. Community chat is not professional advice.

Last updated September 2026.`;

export function timeLabel(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  platform: string;
  embed?: string;
  cover?: string;
  genre?: string;
  album?: string;
  note?: string;
  tags?: string;
  author: string;
  ts: number;
};

const MUSIC_HOSTS = [
  "open.spotify.com",
  "spotify.com",
  "soundcloud.com",
  "audiomack.com",
  "music.apple.com",
  "boomplay.com",
  "deezer.com",
];

export function parseMusicUrl(raw: string): { url: string; platform: string; embed?: string } | undefined {
  const url = safeHttpUrl(raw);
  if (!url) return undefined;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
  if (host.includes("youtu")) return undefined;
  if (!MUSIC_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return undefined;

  if (host.includes("spotify")) {
    const path = new URL(url).pathname.replace(/^\/intl-[^/]+/, "");
    return { url, platform: "Spotify", embed: `https://open.spotify.com/embed${path}` };
  }
  if (host.includes("soundcloud")) {
    return { url, platform: "SoundCloud", embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%231f8a5b&auto_play=false` };
  }
  if (host.includes("audiomack")) {
    const path = new URL(url).pathname;
    return { url, platform: "Audiomack", embed: `https://audiomack.com/embed${path}` };
  }
  if (host.includes("apple")) {
    return { url, platform: "Apple Music", embed: url.replace("music.apple.com", "embed.music.apple.com") };
  }
  if (host.includes("boomplay")) return { url, platform: "Boomplay" };
  if (host.includes("deezer")) {
    const id = url.match(/track\/(\d+)/)?.[1];
    return { url, platform: "Deezer", embed: id ? `https://widget.deezer.com/widget/dark/track/${id}` : undefined };
  }
  return { url, platform: host };
}
