import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bookmark,
  Hash,
  HelpCircle,
  Home,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  PlusSquare,
  Radio,
  Search,
  Send,
  Settings,
  Trophy,
  User,
  Users,
  UsersRound,
  Shield,
  X,
} from "lucide-react";
import { MENU, REGIONS, ROOMS, roomName, type Campaign, type MenuId, type Room } from "@/lib/qonvo-data";
import { useQonvo } from "@/lib/use-qonvo";
import { QonvoScreen } from "@/components/qonvo-screens";
import { QonvoMark } from "@/components/qonvo-mark";

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
  { label: "More", ids: ["leaderboard", "ads", "contact", "admin", "settings", "help"] },
];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
}


export function QonvoApp() {
  const store = useQonvo();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [draft, setDraft] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<MenuId>("home");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "feeds" | "advert">("chat");
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

  useEffect(() => {
    const end = Date.now() + 18 * 3600 * 1000;
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      s %= 3600;
      setPurge(`${h}:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function goHome(roomId?: string) {
    if (roomId) store.openRoom(roomId);
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
            <button type="button" className="btn-3d rounded-md px-2 py-1 text-xs font-semibold" onClick={() => setJoinOpen(true)}>
              {store.handle || "Join"}
            </button>
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
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-3 py-1.5">
            <HomeTab label="Chat" on={homeTab === "chat"} onClick={() => setHomeTab("chat")} />
            <HomeTab label="Feeds" on={homeTab === "feeds"} onClick={() => setHomeTab("feeds")} />
            <HomeTab label="Advert" on={homeTab === "advert"} onClick={() => setHomeTab("advert")} />
            {homeTab === "feeds" ? (
              <button type="button" className="btn-3d ml-auto rounded-md px-3 py-1 text-[11px] font-semibold" onClick={() => setScreen("create")}>
                New post
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
              ) : homeTab === "advert" ? (
                <AdvertPane
                  ads={store.campaigns}
                  onCreate={() => setScreen("ads")}
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
                    <div className="text-xs font-bold text-fg">{m.n}</div>
                    <div className="text-sm">{m.t}</div>
                    <div className="mt-1 flex gap-3">
                      <button type="button" className="text-[11px] text-muted" onClick={() => store.react(m.ts, "up")}>
                        + {m.rx?.up ?? 0}
                      </button>
                      <button type="button" className="text-[11px] text-muted" onClick={() => store.react(m.ts, "fire")}>
                        fire {m.rx?.fire ?? 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="flex shrink-0 gap-2 border-t border-white/5 bg-panel p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                onSubmit={(e) => {
                  e.preventDefault();
                  store.send(draft);
                  setDraft("");
                  inputRef.current?.focus();
                }}
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message"
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
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">Purge</div>
                <div className="text-base font-extrabold text-danger">{purge}</div>
              </div>
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
              setHomeTab("feeds");
            }}
          />
        </div>
      )}

      <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-line bg-panel md:hidden">
        <Tab icon={<MessageSquare className="size-4" />} label="Chat" on={screen === "home"} onClick={() => setScreen("home")} />
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
              <h2 className="text-lg font-bold">Join free</h2>
              <button type="button" onClick={() => setJoinOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Handle"
              className="mb-3 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-line bg-panel-3 py-2 text-sm font-bold"
                onClick={() => {
                  if (joinName.trim()) store.rename(joinName);
                  setJoinOpen(false);
                }}
              >
                Enter
              </button>
              <button type="button" className="flex-1 rounded-lg bg-panel-2 py-2 text-sm" onClick={() => setJoinOpen(false)}>
                Skip
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

function HomeTab({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-md px-4 py-1.5 text-[11px] font-bold tracking-wide uppercase ${on ? "btn-3d text-fg" : "border border-white/10 text-muted"}`}>
      {label}
    </button>
  );
}

function FeedPane({ store }: { store: ReturnType<typeof useQonvo> }) {
  const open = store.posts.find((p) => p.id === store.openPost);
  if (open) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <button type="button" className="mb-2 text-xs text-muted" onClick={() => store.setOpenPost(null)}>
          Back to feeds
        </button>
        <div className="raised rounded-xl p-3">
          {open.image ? <img src={open.image} alt="" className="mb-2 max-h-48 w-full rounded-lg object-cover" /> : null}
          <div className="text-sm font-semibold">{open.title}</div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{open.body}</p>
          {open.link ? (
            <a href={open.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-lime-2">
              {open.link}
            </a>
          ) : null}
          <div className="mt-2 text-[10px] text-muted">
            {open.author} · {open.category} · {open.tags}
          </div>
        </div>
        {open.comments.map((c) => (
          <div key={c.ts} className="mt-2 rounded-xl border border-line p-3 text-sm">
            <div className="text-xs font-semibold">{c.author}</div>
            {c.body}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/5 px-3 py-2 text-xs text-muted">Landing feed · posts you publish land here</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {store.posts.filter((p) => p.status !== "draft").length === 0 ? <p className="text-sm text-muted">No posts yet. Hit New post.</p> : null}
        {store.posts
          .filter((p) => p.status !== "draft")
          .map((p) => (
          <button key={p.id} type="button" className="raised w-full rounded-xl p-3 text-left" onClick={() => store.setOpenPost(p.id)}>
            {p.image ? <img src={p.image} alt="" className="mb-2 max-h-32 w-full rounded-lg object-cover" /> : null}
            <div className="text-sm font-semibold">{p.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted">{p.excerpt || p.body}</div>
            <div className="mt-2 text-[10px] text-muted">
              {p.author} · {p.category || "General"} · {p.comments.length} comments
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvertPane({ ads, onCreate }: { ads: Campaign[]; onCreate: () => void }) {
  const live = ads.filter((a) => a.status === "approved");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs text-muted">Placement board</span>
        <button type="button" className="btn-3d rounded-md px-3 py-1 text-[11px] font-semibold" onClick={onCreate}>
          Submit ad
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {["hero", "sidebar", "chat"].map((slot) => (
          <div key={slot} className="raised rounded-xl p-3">
            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{slot} placement</div>
            {live.filter((a) => a.placement === slot).length === 0 ? (
              <p className="mt-1 text-xs text-muted">Open slot</p>
            ) : (
              live
                .filter((a) => a.placement === slot)
                .map((a) => (
                  <div key={a.id} className="mt-1 text-sm">
                    {a.name}
                  </div>
                ))
            )}
          </div>
        ))}
        {ads
          .filter((a) => a.status !== "approved")
          .map((a) => (
            <div key={a.id} className="rounded-xl border border-line p-3 text-xs text-muted">
              {a.name} · {a.status}
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
