import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bookmark,
  Copy,
  Eye,
  Hash,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  PlusSquare,
  Radio,
  Play,
  Search,
  Send,
  Share2,
  Smile,
  Settings,
  Trophy,
  User,
  Users,
  UsersRound,
  Shield,
  X,
} from "lucide-react";
import { MENU, POST_CATS, REGIONS, ROOMS, fmtCount, handleColor, parseMusicUrl, roomName, timeLabel, youtubeId, type Campaign, type MenuId, type Room } from "@/lib/qonvo-data";
import { DIGITAL_TRACKS, VIDEO_CATALOG, VIDEO_SECTIONS } from "@/lib/qonvo-seed";
import { useQonvo } from "@/lib/use-qonvo";
import { QonvoScreen } from "@/components/qonvo-screens";
import { QonvoMark } from "@/components/qonvo-mark";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { accountEmail, publicUsername } from "@/lib/account-email";
import { authClient } from "@/lib/auth/client";

const EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "🙏", "💯", "🎉", "😢", "😮", "😎", "❤️", "🇳🇬", "👀", "🤔", "💭"];

const ICONS: Record<MenuId, typeof Home> = {
  home: Home,
  forum: MessageSquare,
  community: Users,
  search: Search,
  create: PlusSquare,
  profile: User,
  dashboard: LayoutDashboard,
  bookmarks: Bookmark,
  notifications: Radio,
  teams: UsersRound,
  badges: Award,
  leaderboard: Trophy,
  trending: Hash,
  ads: Megaphone,
  contact: Mail,
  admin: Shield,
  settings: Settings,
  help: HelpCircle,
};

const MENU_GROUPS: { label: string; ids: MenuId[] }[] = [
  { label: "Explore", ids: ["home", "forum", "community", "trending", "search"] },
  { label: "You", ids: ["profile", "dashboard", "create", "bookmarks", "notifications", "teams", "badges"] },
  { label: "More", ids: ["leaderboard", "ads", "contact", "settings", "help"] },
];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
}


export function QonvoApp() {
  const store = useQonvo();
  const session = useCurrentUserState();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<MenuId>("home");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "feeds" | "advert" | "music" | "videos">("feeds");
  const [joinPass, setJoinPass] = useState("");
  const [joinAgree, setJoinAgree] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [purge, setPurge] = useState("18:00:00");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const room = ROOMS.find((r) => r.id === store.roomId) ?? ROOMS[0];
  const listed = useMemo(
    () =>
      ROOMS.filter(
        (r) =>
          (region === "All" || r.region === region) &&
          r.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, region],
  );
  const hot = useMemo(() => [...ROOMS].sort((a, b) => b.online - a.online).slice(0, 8), []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [store.msgs]);

  const purged = useRef(false);
  useEffect(() => {
    const end = Date.now() + 18 * 3600 * 1000;
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const rest = s % 3600;
      setPurge(`${h}:${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`);
      if (s === 0 && !purged.current) {
        purged.current = true;
        store.purgeChat();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function goHome(roomId?: string) {
    if (roomId) store.openRoom(roomId);
    else setHomeTab("feeds");
    setScreen("home");
    setMenuOpen(false);
    setRoomsOpen(false);
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="z-20 shrink-0 border-b border-line bg-panel">
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          <button type="button" className="flex items-center gap-2" onClick={() => goHome()}>
            <QonvoMark className="size-8" />
            <div className="text-left">
              <div className="text-base font-extrabold leading-none">
                Naija<span className="text-lime-2">Forum</span>
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] text-lime-2 sm:flex">
              <span className="size-1.5 rounded-full bg-lime-2" />
              Live
            </span>
            <button type="button" className="btn-3d rounded-md px-2 py-1 text-xs md:hidden" onClick={() => setRoomsOpen(true)}>
              Rooms
            </button>
            <button type="button" className="btn-3d rounded-md px-2 py-1 text-xs" onClick={() => setMenuOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Menu className="size-3.5" /> Menu
              </span>
            </button>
            {session.isPending ? (
              <span className="h-7 w-16 animate-pulse rounded-md bg-white/10" />
            ) : (
              <>
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <Link to="/login" className="btn-3d rounded-md px-2 py-1 text-xs font-semibold">
                    Sign in
                  </Link>
                </SignedOut>
              </>
            )}
          </div>
        </div>
        <div className="inset-well h-7 overflow-hidden border-x-0">
          <div className="ticker-track px-4 text-[11px] leading-7 text-muted">
            {[...ROOMS.slice(0, 12), ...ROOMS.slice(0, 12)].map((r, i) => (
              <button key={r.id + i} type="button" className="shrink-0 hover:text-fg" onClick={() => goHome(r.id)}>
                {r.name} · {fmt(r.online)}
              </button>
            ))}
            {store.campaigns
              .filter((c) => c.status === "approved")
              .flatMap((c) => [c, c])
              .map((c, i) => (
                <span key={c.id + "t" + i} className="shrink-0 text-fg/80">
                  Ad · {c.name}
                </span>
              ))}
          </div>
        </div>
      </header>

      {screen === "home" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden shrink-0 items-baseline justify-between border-b border-line px-4 py-2 md:flex">
            <h1 className="text-lg font-extrabold">
              Naija's <span className="text-lime-2">Open Forum</span>
            </h1>
            <p className="text-[11px] text-muted">Anonymous · Free</p>
          </div>
          {store.campaigns.some((c) => c.status === "approved" && c.placement === "hero") ? (
            <div className="hidden shrink-0 border-b border-line px-4 py-1.5 text-xs text-muted md:block">
              {store.campaigns
                .filter((c) => c.status === "approved" && c.placement === "hero")
                .map((c) => (
                  <span key={c.id} className="mr-4">
                    Placement · {c.name}
                  </span>
                ))}
            </div>
          ) : null}
          <div className="hidden shrink-0 gap-2 overflow-x-auto border-b border-white/5 bg-panel px-3 py-1.5 md:flex">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={`rounded-full px-3 py-1 text-xs ${
                  region === r ? "btn-3d font-semibold" : "border border-white/10 text-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 border-b border-white/5 bg-panel-2 px-3 py-1.5 md:block">
            <div className="flex gap-2 overflow-x-auto">
              {hot.map((r) => (
                <HotCard key={r.id} room={r} active={r.id === store.roomId} onOpen={goHome} />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-panel px-2 py-1.5">
            <HomeTab label="Chat" on={homeTab === "chat"} onClick={() => setHomeTab("chat")} />
            <HomeTab label="Feeds" on={homeTab === "feeds"} onClick={() => setHomeTab("feeds")} />
            <HomeTab label="Advert" on={homeTab === "advert"} onClick={() => setHomeTab("advert")} />
            <HomeTab label="Music" on={homeTab === "music"} onClick={() => setHomeTab("music")} />
            <HomeTab label="Videos" on={homeTab === "videos"} onClick={() => setHomeTab("videos")} />
            {homeTab === "feeds" ? (
              <button type="button" className="btn-3d ml-auto shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold" onClick={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))}>
                New
              </button>
            ) : null}
            {homeTab === "music" ? (
              <button type="button" className="btn-3d ml-auto shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold" onClick={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))}>
                Add
              </button>
            ) : null}
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[210px_minmax(0,1fr)_180px]">
            <aside className="hidden min-h-0 overflow-hidden border-r border-white/5 bg-panel md:flex md:flex-col">
              <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} onOpen={goHome} />
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-bg">
              {homeTab === "feeds" ? (
                <FeedPane store={store} />
              ) : homeTab === "music" ? (
                <MusicPane store={store} onAdd={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))} />
              ) : homeTab === "videos" ? (
                <VideoPane />
              ) : homeTab === "advert" ? (
                <AdvertPane
                  ads={store.campaigns}
                  onCreate={() => (store.authed || session.user ? setScreen("ads") : setJoinOpen(true))}
                  onView={(id) => store.see("ads", id)}
                />
              ) : (
                <>
              <div className="flex items-center justify-between border-b border-white/5 bg-panel px-3 py-2">
                <div>
                  <div className="text-sm font-bold">{room.name}</div>
                  <div className="text-[10px] text-muted">
                    {fmt(room.online)} · {store.handle || "guest"}
                  </div>
                </div>
                <button type="button" onClick={store.pinRoom} className="btn-3d rounded-full px-3 py-1 text-xs">
                  Bookmark
                </button>
              </div>
              {store.campaigns
                .filter((c) => c.status === "approved" && c.placement === "chat")
                .map((c) => (
                  <div key={c.id} className="raised mx-3 mt-2 rounded-lg px-3 py-2 text-xs">
                    Placement · {c.name}
                    {c.note ? <span className="text-muted"> — {c.note}</span> : null}
                  </div>
                ))}
              <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {store.msgs.length === 0 ? <p className="text-sm text-muted">No messages yet. Be first.</p> : null}
                {store.msgs.map((m, i) => (
                  <div key={m.ts + i}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold" style={{ color: handleColor(m.n) }}>
                        {m.n}
                      </span>
                      <span className="text-[10px] text-muted">{timeLabel(m.ts)}</span>
                    </div>
                    <div className="text-sm">{m.t}</div>
                    <div className="mt-1 flex gap-3">
                      <button type="button" className="text-[11px] text-muted" onClick={() => store.react(m.ts, "up")}>
                        + {m.rx?.up ?? 0}
                      </button>
                      <button type="button" className="text-[11px] text-muted" onClick={() => store.react(m.ts, "fire")}>
                        🔥 {m.rx?.fire ?? 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="relative flex shrink-0 gap-2 border-t border-white/5 bg-panel p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                onSubmit={(e) => {
                  e.preventDefault();
                  store.send(draft);
                  setDraft("");
                  setEmojiOpen(false);
                  inputRef.current?.focus();
                }}
              >
                {emojiOpen ? (
                  <div className="absolute bottom-full left-2 mb-1 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-line bg-panel-2 p-2">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" className="grid size-8 place-items-center text-base" onClick={() => setDraft((d) => d + e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="btn-3d grid size-11 place-items-center rounded-lg" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji">
                  <Smile className="size-4 text-lime-2" />
                </button>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message + emoji"
                  className="min-h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-3 text-sm outline-none"
                />
                <button type="submit" className="btn-3d inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold">
                  <Send className="size-3.5" /> Send
                </button>
              </form>
                </>
              )}
            </section>

            <aside className="hidden min-h-0 overflow-y-auto border-l border-white/5 bg-panel md:block">
              {store.campaigns.filter((c) => c.status === "approved" && c.placement === "sidebar").map((c) => (
                <div key={c.id} className="raised m-2 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted">Ad</div>
                  <div className="text-sm font-semibold">{c.name}</div>
                </div>
              ))}
              {homeTab === "chat" ? (
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">Chat purge</div>
                <div className="text-base font-extrabold text-danger">{purge}</div>
                <p className="mt-1 text-[10px] text-muted">Clears this room’s chat only. Feeds, music, videos, and ads stay.</p>
              </div>
              ) : null}
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Who just joined</div>
                {store.joins.length === 0 ? <p className="text-[11px] text-muted">Waiting for joins</p> : null}
                {store.joins.slice(0, 6).map((j) => (
                  <div key={j.name + j.ts} className="flex items-center justify-between py-1 text-xs">
                    <span className="truncate text-fg">{j.name}</span>
                    <span className="max-w-[72px] truncate text-[10px] text-lime-2">{j.room ? roomName(j.room) : "live"}</span>
                  </div>
                ))}
              </div>
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Activity</div>
                {store.notes.length === 0 ? <p className="text-[11px] text-muted">Quiet right now</p> : null}
                {store.notes.slice(0, 8).map((n) => (
                  <div key={n.id} className="border-t border-white/5 py-1.5 text-[11px] text-muted">
                    {n.text}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <QonvoScreen
            id={screen}
            store={store}
            onHome={goHome}
            onForum={() => {
              setScreen("home");
              setHomeTab(store.tracks[0] && Date.now() - store.tracks[0].ts < 4000 ? "music" : "feeds");
            }}
          />
        </div>
      )}

      <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        <Tab icon={<Home className="size-4" />} label="Home" on={screen === "home"} onClick={() => setScreen("home")} />
        <Tab icon={<Users className="size-4" />} label="Forum" on={screen === "forum"} onClick={() => setScreen("forum")} />
        <Tab icon={<Search className="size-4" />} label="Search" on={screen === "search"} onClick={() => setScreen("search")} />
        <Tab icon={<Bookmark className="size-4" />} label="Saved" on={screen === "bookmarks"} onClick={() => setScreen("bookmarks")} />
        <Tab icon={<Menu className="size-4" />} label="More" on={menuOpen} onClick={() => setMenuOpen(true)} />
      </nav>

      {roomsOpen ? (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <aside className="h-full w-[min(300px,88vw)] overflow-y-auto bg-panel">
            <div className="flex items-center justify-between border-b border-line p-3">
              <strong>Rooms</strong>
              <button type="button" onClick={() => setRoomsOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-2">
              {REGIONS.slice(0, 8).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${region === r ? "border-lime-2/50" : "border-line text-muted"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} onOpen={goHome} />
          </aside>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close rooms" onClick={() => setRoomsOpen(false)} />
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-30 flex">
          <aside className="flex h-full w-[min(300px,88vw)] flex-col border-r border-line bg-panel">
            <div className="flex items-center gap-3 border-b border-line p-4">
              <QonvoMark className="size-10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{store.handle || "Guest"}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">NaijaForum</div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-4">
              {MENU_GROUPS.map((group) => (
                <div key={group.label} className="mb-3">
                  <div className="px-2 py-1 text-[10px] font-semibold tracking-widest text-muted uppercase">{group.label}</div>
                  {group.ids.map((id) => {
                    const Icon = ICONS[id];
                    const label = MENU.find((m) => m[0] === id)?.[1] ?? id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id === "home") goHome();
                          else setScreen(id);
                          setMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm ${
                          screen === id ? "bg-panel-2" : "hover:bg-panel-2"
                        }`}
                      >
                        <Icon className="size-4 shrink-0 text-lime-2" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="px-2 py-1 text-[10px] font-semibold tracking-widest text-muted uppercase">Rooms</div>
              {ROOMS.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => goHome(r.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-panel-2"
                >
                  <span>{r.name}</span>
                  <span className="text-[10px] text-muted">{fmt(r.online)}</span>
                </button>
              ))}
            </div>
          </aside>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}

      {joinOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Username + password</h2>
              <button type="button" onClick={() => setJoinOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Username"
              className="mb-2 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-sm outline-none"
            />
            <input
              type="password"
              value={joinPass}
              onChange={(e) => setJoinPass(e.target.value)}
              placeholder="Password"
              className="mb-3 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-sm outline-none"
            />
            {joinErr ? <p className="mb-2 text-sm text-danger">{joinErr}</p> : null}
            {store.authErr ? <p className="mb-2 text-sm text-danger">{store.authErr}</p> : null}
            <label className="mb-2 flex items-start gap-2 text-[11px] text-muted">
              <input type="checkbox" className="mt-0.5" checked={joinAgree} onChange={(e) => setJoinAgree(e.target.checked)} />
              <span>
                I agree to the{" "}
                <button type="button" className="text-lime-2 underline" onClick={() => { setJoinOpen(false); setScreen("help"); }}>
                  Terms & Conditions
                </button>{" "}
                and that I am responsible for posts, music URLs, and ads I submit.
              </span>
            </label>
            <p className="mb-2 text-[11px] text-muted">No email. Needed to post, list music, or place ads. Browse stays open.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-line bg-panel-3 py-2 text-sm font-bold"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    const handle = publicUsername(joinName);
                    if (handle.length < 3) {
                      setJoinErr("Username needs 3+ characters.");
                      return;
                    }
                    if (joinPass.length < 8) {
                      setJoinErr("Password needs 8+ characters.");
                      return;
                    }
                    if (!joinAgree) {
                      setJoinErr("Accept the Terms to register.");
                      return;
                    }
                    const r = await authClient.signUp.email({ email: accountEmail(handle), password: joinPass, name: handle });
                    if (r.error) setJoinErr(r.error.message ?? "Sign up failed");
                    else window.location.reload();
                  })();
                }}
              >
                Register
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-line py-2 text-sm"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    const handle = publicUsername(joinName);
                    const r = await authClient.signIn.email({ email: accountEmail(handle), password: joinPass });
                    if (r.error) setJoinErr(r.error.message ?? "Sign in failed");
                    else window.location.reload();
                  })();
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Tab({
  icon,
  label,
  on,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] ${on ? "text-fg" : "text-muted"}`}>
      {icon}
      {label}
    </button>
  );
}

function RoomList({
  query,
  setQuery,
  listed,
  roomId,
  onOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  listed: Room[];
  roomId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-white/5 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {listed.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r.id)}
          className={`flex w-full items-center justify-between border-l-2 px-3 py-2 text-left ${
            r.id === roomId ? "border-lime-2 bg-panel-2" : "border-transparent hover:bg-panel-2"
          }`}
        >
          <span>
            <span className="block text-xs font-semibold">{r.name}</span>
            <span className="text-[10px] text-muted">
              {fmt(r.online)} · {r.region}
            </span>
          </span>
        </button>
      ))}
      </div>
    </>
  );
}

function MusicPane({ store, onAdd }: { store: ReturnType<typeof useQonvo>; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [play, setPlay] = useState<string | null>(null);
  const mine = store.tracks.filter((t) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${t.artist} ${t.title} ${t.author}`.toLowerCase().includes(s);
  });
  const digital = DIGITAL_TRACKS.filter((t) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${t.artist} ${t.title}`.toLowerCase().includes(s);
  });

  function Row({ t }: { t: (typeof store.tracks)[number] }) {
    const on = play === t.id;
    return (
      <div className="raised overflow-hidden rounded-lg">
        <button type="button" className="flex w-full items-center gap-2 px-2 py-1.5 text-left" onClick={() => {
          setPlay(on ? null : t.id);
          if (!on) store.see("tracks", t.id);
        }}>
          <span className="btn-3d grid size-7 shrink-0 place-items-center rounded-full">
            <Play className="size-3 fill-lime-2 text-lime-2" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{t.title}</div>
            <div className="truncate text-[10px] text-muted">
              {t.artist} · {t.platform} · {fmtCount(t.views ?? 0)} views
            </div>
          </div>
        </button>
        {on && t.embed ? (
          <iframe title={t.title} src={`${t.embed}${t.embed.includes("?") ? "&" : "?"}theme=0`} className="h-[80px] w-full border-0" allow="encrypted-media; autoplay" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-2 py-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists on this platform"
          className="min-h-9 flex-1 rounded-lg border border-line bg-panel px-3 text-xs outline-none"
        />
        <button type="button" className="btn-3d shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid gap-3 md:grid-cols-2">
          <section>
            <h3 className="mb-1.5 text-[10px] font-bold tracking-wide text-lime-2 uppercase">Artists on this platform</h3>
            <div className="space-y-1">
              {mine.length === 0 ? <p className="text-[11px] text-muted">No artist match.</p> : null}
              {mine.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">Digital platforms</h3>
            <p className="mb-1.5 text-[10px] text-muted">Fetched from Spotify and similar. Not hosted here.</p>
            <div className="space-y-1">
              {digital.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function VideoPane() {
  const [sec, setSec] = useState<(typeof VIDEO_SECTIONS)[number]>("Movies");
  const [play, setPlay] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(12);
  const [views, setViews] = useState<Record<string, number>>({});
  const list = useMemo(() => {
    const raw = [...(VIDEO_CATALOG[sec] ?? [])];
    for (let i = raw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    return raw;
  }, [sec, tick]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-1">
        {VIDEO_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSec(s);
              setPlay(null);
              setShown(12);
            }}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${sec === s ? "btn-3d font-semibold" : "text-muted"}`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className="btn-3d ml-auto shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold"
          onClick={() => {
            setPlay(null);
            setTick((n) => n + 1);
            setShown(12);
          }}
        >
          Refresh
        </button>
      </div>
      {play ? (
        <iframe title="video" src={`https://www.youtube.com/embed/${play}?rel=0`} className="h-40 w-full shrink-0 border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {list.slice(0, shown).map((v) => (
            <button
              key={v.id}
              type="button"
              className="raised overflow-hidden rounded-lg text-left"
              onClick={() => {
                setPlay(v.id);
                setViews((m) => ({ ...m, [v.id]: (m[v.id] ?? 0) + 1 }));
              }}
            >
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" className="h-24 w-full object-cover" />
              <div className="flex items-center gap-1 p-1.5">
                <Play className="size-3 shrink-0 text-lime-2" />
                <span className="line-clamp-2 text-[10px] font-semibold">{v.title}</span>
              </div>
              <div className="px-1.5 pb-1.5 text-[9px] text-muted">{fmtCount(views[v.id] ?? 0)} views</div>
            </button>
          ))}
        </div>
        {shown < list.length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 6)}>
            Load more
          </button>
        ) : null}
        <p className="mt-2 px-1 text-[10px] text-muted">YouTube CDN only. This site does not host or stream video files.</p>
      </div>
    </div>
  );
}

function HomeTab({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase ${on ? "btn-3d text-fg" : "border border-white/10 text-muted"}`}>
      {label}
    </button>
  );
}

function ArticleRead({ post, store }: { post: import("@/lib/qonvo-data").Post; store: ReturnType<typeof useQonvo> }) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    store.see("posts", post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);
  const roots = post.comments.filter((c) => !c.parentTs);
  const kids = (ts: number) => post.comments.filter((c) => c.parentTs === ts);
  const mins = Math.max(1, Math.round(post.body.split(/\s+/).length / 180));
  const saved = store.savedPosts.includes(post.id);
  const likes = store.likes[post.id] ?? 0;
  const shares = store.shares[post.id] ?? 0;
  const url = typeof window !== "undefined" ? `${window.location.origin}/?feed=${encodeURIComponent(post.id)}` : "";
  const shareText = `${post.title} — NaijaForum`;
  function share(kind: "wa" | "x" | "fb" | "tg" | "copy" | "native") {
    store.sharePost(post.id);
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(shareText);
    if (kind === "wa") window.open(`https://wa.me/?text=${t}%20${u}`, "_blank", "noopener,noreferrer");
    if (kind === "x") window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, "_blank", "noopener,noreferrer");
    if (kind === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
    if (kind === "tg") window.open(`https://t.me/share/url?url=${u}&text=${t}`, "_blank", "noopener,noreferrer");
    if (kind === "copy") {
      void navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
    if (kind === "native" && navigator.share) void navigator.share({ title: post.title, text: shareText, url });
  }
  return (
    <article className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <button type="button" className="text-[11px] text-muted" onClick={() => store.setOpenPost(null)}>
          ← Feeds
        </button>
        <div className="raised mt-3 overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            {post.image ? <img src={post.image} alt="" className="h-44 w-full shrink-0 rounded-xl object-cover sm:h-48 sm:w-60" /> : null}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2 uppercase">{post.category || "General"}</div>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight">{post.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className="font-semibold" style={{ color: handleColor(post.author) }}>
                  {post.author}
                </span>
                <span>· {timeLabel(post.ts)}</span>
                <span>· {mins} min read</span>
                {post.tags ? <span>· {post.tags}</span> : null}
              </div>
              {post.excerpt ? <p className="mt-3 text-sm italic text-muted">{post.excerpt}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-white/5 bg-black/30 sm:grid-cols-6">
            {[
              { icon: Eye, n: post.views ?? 0, label: "Views" },
              { icon: MessageSquare, n: post.comments.length, label: "Comments" },
              { icon: Heart, n: likes, label: "Likes" },
              { icon: Bookmark, n: saved ? 1 : 0, label: saved ? "Saved" : "Save" },
              { icon: Share2, n: shares, label: "Shares" },
              { icon: Hash, n: mins, label: "Min" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 bg-panel py-2.5">
                <s.icon className="size-3.5 text-lime-2" />
                <span className="text-[11px] font-bold">{fmtCount(s.n)}</span>
                <span className="text-[9px] tracking-wide text-muted uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn-3d inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold" onClick={() => store.likePost(post.id)}>
            <Heart className="size-3 fill-lime-2 text-lime-2" /> Like
          </button>
          <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${saved ? "btn-3d" : "border-line text-muted"}`} onClick={() => store.savePostMark(post.id)}>
            <Bookmark className="size-3" /> {saved ? "Saved" : "Save"}
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("wa")}>
            WA
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("x")}>
            X
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("fb")}>
            Facebook
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("tg")}>
            Telegram
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("copy")}>
            <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("native")}>
            <Share2 className="size-3 text-lime-2" /> Share
          </button>
        </div>
        <div className="mt-5 space-y-3 text-[15px] leading-7 text-fg/90">
          {post.body.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        {post.link ? (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-lime-2">
            <Link2 className="size-3" /> Source
          </a>
        ) : null}
        <div className="mt-8 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{post.comments.length} comments</div>
            <span className="text-[10px] text-muted">Reply to keep the convo going</span>
          </div>
          {roots.map((c) => (
            <div key={c.ts} className="mt-3 rounded-xl border border-white/5 bg-panel-3/60 p-3 text-sm">
              <div className="text-[11px] font-semibold" style={{ color: handleColor(c.author) }}>
                {c.author} <span className="font-normal text-muted">{timeLabel(c.ts)}</span>
              </div>
              <p className="mt-1 leading-6">{c.body}</p>
              <button type="button" className="mt-1 text-[10px] text-lime-2" onClick={() => setReplyTo(c.ts)}>
                Reply
              </button>
              {kids(c.ts).map((r) => (
                <div key={r.ts} className="mt-2 ml-4 border-l border-lime-2/40 pl-3">
                  <div className="text-[11px] font-semibold" style={{ color: handleColor(r.author) }}>
                    {r.author} <span className="font-normal text-muted">{timeLabel(r.ts)}</span>
                  </div>
                  <p className="mt-1 leading-6">{r.body}</p>
                </div>
              ))}
            </div>
          ))}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              store.commentPost(post.id, note, replyTo ?? undefined);
              setNote("");
              setReplyTo(null);
            }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={store.authed ? (replyTo ? "Reply to comment…" : "Write a comment") : "Sign in to comment"}
              className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-sm"
            />
            <button type="submit" className="btn-3d rounded-lg px-3 text-xs font-semibold">
              {replyTo ? "Reply" : "Comment"}
            </button>
          </form>
          {replyTo ? (
            <button type="button" className="mt-1 text-[10px] text-muted" onClick={() => setReplyTo(null)}>
              Cancel reply
            </button>
          ) : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim()) return;
              store.flagPost(post.id, reason);
              setReason("");
            }}
          >
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Report this post" className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-xs" />
            <button type="submit" className="text-xs text-danger">
              Report
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function FeedPane({ store }: { store: ReturnType<typeof useQonvo> }) {
  const [cat, setCat] = useState("All");
  const [shown, setShown] = useState(12);
  const open = store.posts.find((p) => p.id === store.openPost);
  const live = store.posts.filter((p) => p.status !== "draft" && (cat === "All" || p.category === cat));
  if (open) {
    return <ArticleRead post={open} store={store} />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/5 px-2 py-1.5">
        {["All", ...POST_CATS].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              setShown(12);
            }}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${cat === c ? "btn-3d font-semibold" : "text-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {live.slice(0, shown).map((p) => (
            <button key={p.id} type="button" className="raised overflow-hidden rounded-lg text-left" onClick={() => store.setOpenPost(p.id)}>
              {p.image ? <img src={p.image} alt="" className="h-28 w-full object-cover" /> : <div className="h-28 bg-panel-3" />}
              <div className="p-2">
                <div className="text-[9px] font-bold tracking-wide text-lime-2 uppercase">{p.category || "General"}</div>
                <div className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug">{p.title}</div>
                <p className="mt-1 line-clamp-2 text-[10px] text-muted">{p.excerpt || p.body}</p>
                <div className="mt-1 truncate text-[9px]">
                  <span style={{ color: handleColor(p.author) }}>{p.author}</span>
                  <span className="text-muted"> · {timeLabel(p.ts)} · {fmtCount(p.views ?? 0)} views</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {shown < live.length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 6)}>
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [shown, setShown] = useState(12);
  const live = ads.filter((a) => a.status === "approved");
  const mine = ads.filter((a) => a.status !== "approved");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs text-muted">Approved ads · 5 formats</span>
        <button type="button" className="btn-3d rounded-md px-3 py-1 text-[11px] font-semibold" onClick={onCreate}>
          Place ad
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {live.slice(0, shown).map((a) => {
            const yt = a.video ? youtubeId(a.video) || a.video : undefined;
            const inner = (
              <div className="raised overflow-hidden rounded-lg text-left">
                {a.kind === "video" || a.kind === "video-text" ? (
                  yt ? (
                    <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="h-28 w-full object-cover" />
                  ) : (
                    <div className="grid h-28 place-items-center bg-panel-3 text-[10px] text-muted">Video</div>
                  )
                ) : a.image ? (
                  <img src={a.image} alt="" className="h-28 w-full object-cover" />
                ) : (
                  <div className="grid h-28 place-items-center bg-panel-3 px-2 text-center text-[11px] font-semibold">{a.name}</div>
                )}
                <div className="p-2">
                  <div className="text-[9px] font-bold tracking-wide text-lime-2 uppercase">{a.kind || "image-text"}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs font-semibold">{a.name}</div>
                  {a.kind === "image-text" || a.kind === "video-text" || a.kind === "text" ? (
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted">{a.note}</p>
                  ) : null}
                  <div className="mt-1 text-[9px] text-muted">{fmtCount(a.views ?? 0)} views</div>
                </div>
              </div>
            );
            return a.link ? (
              <a
                key={a.id}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onView(a.id)}
              >
                {inner}
              </a>
            ) : (
              <button key={a.id} type="button" onClick={() => onView(a.id)}>
                {inner}
              </button>
            );
          })}
        </div>
        {live.length === 0 ? <p className="p-2 text-xs text-muted">No live ads yet. Place one after crypto payment.</p> : null}
        {shown < live.length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 6)}>
            Load more
          </button>
        ) : null}
        {mine.length ? <div className="mt-3 text-[10px] font-bold tracking-wide text-muted uppercase">Your queue</div> : null}
        {mine.map((a) => (
          <div key={a.id} className="mt-1 rounded-md border border-line px-2 py-1.5 text-[11px] text-muted">
            {a.name} · {a.status} · {a.kind} · {(a.coin || "").toUpperCase()} {a.amount || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function HotCard({ room, active, onOpen }: { room: Room; active: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(room.id)}
      className={`inline-flex w-[132px] shrink-0 flex-col rounded-[10px] border p-2.5 text-left ${
        active ? "raised" : "border border-white/10 bg-panel-3"
      }`}
    >
      <span className="text-xs font-bold">{room.name}</span>
      <span className="mt-1 text-[10px] text-muted">{fmt(room.online)} online</span>
    </button>
  );
}
