import { useEffect, useMemo, useState } from "react";
import { COMMUNITIES, POST_CATS, REGIONS, ROOMS, TERMS, parseMusicUrl, roomName, safeHttpUrl, slugify, type MenuId, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { claimOps, listStaff, setStaffRole, staffMe } from "@/lib/staff-server";
import { authClient } from "@/lib/auth/client";

type Store = ReturnType<typeof useQonvo>;

export function QonvoScreen({
  id,
  store,
  onHome,
  onForum,
}: {
  id: MenuId;
  store: Store;
  onHome: (roomId?: string) => void;
  onForum?: () => void;
}) {
  let view: React.ReactNode = null;
  if (id === "forum") view = <Forum store={store} />;
  else if (id === "create") view = <Create store={store} onForum={onForum} />;
  else if (id === "community") view = <Communities onHome={onHome} />;
  else if (id === "search") view = <Search onHome={onHome} />;
  else if (id === "profile") view = <Profile store={store} />;
  else if (id === "bookmarks") view = <Bookmarks store={store} onHome={onHome} />;
  else if (id === "notifications") view = <Notes store={store} />;
  else if (id === "teams") view = <Teams store={store} />;
  else if (id === "badges") view = <Badges store={store} />;
  else if (id === "leaderboard") view = <Board store={store} />;
  else if (id === "ads") view = <Ads store={store} />;
  else if (id === "settings") view = <Settings store={store} />;
  else if (id === "help") view = <Help />;
  else if (id === "dashboard") view = <Dash store={store} onHome={onHome} onForum={onForum} />;
  else if (id === "trending") view = <Trending onHome={onHome} />;
  else if (id === "contact") view = <Contact store={store} />;
  else if (id === "admin") view = <Admin store={store} />;
  return <div className="h-full overflow-y-auto pb-20 md:pb-4">{view}</div>;
}

function Card({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="font-semibold">{title}</div>
      {body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{body}</p> : null}
      {children}
    </div>
  );
}

function Forum({ store }: { store: Store }) {
  const post = store.posts.find((p) => p.id === store.openPost);
  if (post) return <PostDetail post={post} store={store} />;
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Forum</h2>
      {store.posts.length === 0 ? <p className="text-sm text-muted">No posts yet. Create one from Menu.</p> : null}
      {store.posts.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => store.setOpenPost(p.id)}
          className="block w-full rounded-xl border border-line bg-panel p-3 text-left"
        >
          <div className="font-semibold">{p.title}</div>
          <div className="text-xs text-muted">
            {p.author} · {p.comments.length} comments
          </div>
        </button>
      ))}
    </div>
  );
}

function PostDetail({ post, store }: { post: Post; store: Store }) {
  const [body, setBody] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <button type="button" className="text-xs text-muted" onClick={() => store.setOpenPost(null)}>
        Back to forum
      </button>
      <Card title={post.title} body={post.body} />
      {post.image ? <img src={post.image} alt="" className="max-h-56 w-full rounded-xl object-cover" /> : null}
      {post.link ? (
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-2">
          {post.link}
        </a>
      ) : null}
      <p className="text-xs text-muted">
        {post.author} · {post.category} {post.tags ? `· ${post.tags}` : ""}
      </p>
      {post.comments.map((c) => (
        <Card key={c.ts} title={c.author} body={c.body} />
      ))}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Comment"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button
        type="button"
        className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
        onClick={() => {
          store.commentPost(post.id, body);
          setBody("");
        }}
      >
        Comment
      </button>
    </div>
  );
}

function Create({ store, onForum }: { store: Store; onForum?: () => void }) {
  const [kind, setKind] = useState<"post" | "music">("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [preview, setPreview] = useState("");

  function onUrl(v: string) {
    setLink(v);
    const parsed = parseMusicUrl(v);
    setPreview(parsed ? `${parsed.platform}${parsed.embed ? " · embed ready" : " · link only"}` : "");
  }

  async function onFile(file: File | undefined) {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Images only.");
      return;
    }
    if (file.size > 2_000_000) {
      setErr("Keep the image under 2MB.");
      return;
    }
    const data = await compressImage(file);
    setImage(data);
  }

  function submit(status: "draft" | "publish") {
    setErr("");
    if (!agree) {
      setErr("Accept the Terms to publish.");
      return;
    }
    const url = safeHttpUrl(link);
    if (link.trim() && !url) {
      setErr("Link must be http or https.");
      return;
    }
    store.publishPost({
      title,
      body,
      excerpt,
      category,
      tags,
      link: url,
      image,
      slug: slugify(title),
      status,
    });
    setTitle("");
    setBody("");
    setExcerpt("");
    setTags("");
    setLink("");
    setImage("");
    if (status === "publish") onForum?.();
  }

  function submitMusic() {
    setErr("");
    if (!agree) {
      setErr("Accept the Terms to list music.");
      return;
    }
    if (!parseMusicUrl(link)) {
      setErr("Paste a Spotify, Apple Music, SoundCloud, Audiomack or Deezer track URL. YouTube video is for VIDEOS.");
      return;
    }
    if (!title.trim() || !artist.trim()) {
      setErr("Title and artist are required.");
      return;
    }
    store.publishTrack({
      title,
      artist,
      url: link,
      cover: image,
      genre,
      album,
      note: body,
      tags,
    });
    setTitle("");
    setArtist("");
    setAlbum("");
    setBody("");
    setTags("");
    setLink("");
    setImage("");
    setPreview("");
    onForum?.();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Create</h2>
      <div className="flex gap-2">
        <button type="button" className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase ${kind === "post" ? "btn-3d" : "border border-line text-muted"}`} onClick={() => setKind("post")}>
          Post
        </button>
        <button type="button" className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase ${kind === "music" ? "btn-3d" : "border border-line text-muted"}`} onClick={() => setKind("music")}>
          Music
        </button>
      </div>
      {kind === "music" ? (
        <>
          <p className="text-sm text-muted">Audio platforms only: Spotify, Apple Music, SoundCloud, Audiomack, Deezer. YouTube clips belong in VIDEOS.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album / EP (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={link} onChange={(e) => onUrl(e.target.value)} placeholder="https://open.spotify.com/track/…" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          {preview ? <p className="text-xs text-lime-2">{preview}</p> : null}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Notes / credits" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <div className="raised rounded-xl p-3">
            <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Cover image only (optional)</div>
            <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the Terms. This URL is mine to share. Audio is not hosted here.</span>
          </label>
          <button type="button" className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold" onClick={submitMusic}>
            List on MUSIC
          </button>
        </>
      ) : (
        <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Post content" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Excerpt / summary" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
          {POST_CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma)" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      </div>
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Safe URL — https://…"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <div className="raised rounded-xl p-3">
        <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Featured image</div>
        <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
        {image ? <img src={image} alt="" className="mt-2 max-h-40 rounded-lg object-cover" /> : null}
      </div>
      <p className="text-[11px] text-muted">Slug: {title ? slugify(title) : "—"} · Author set on publish</p>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the Terms & Conditions and I am responsible for this post.</span>
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold" onClick={() => submit("publish")}>
          Publish to feeds
        </button>
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => submit("draft")}>
          Save draft
        </button>
      </div>
        </>
      )}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

function Communities({ onHome }: { onHome: (roomId?: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Communities</h2>
      {COMMUNITIES.map((c) => {
        const rooms = ROOMS.filter((r) => r.region === c.region);
        return (
          <Card key={c.id} title={c.name} body={`${rooms.length} rooms`}>
            <div className="mt-2 flex flex-wrap gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-xs"
                  onClick={() => onHome(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Search({ onHome }: { onHome: (roomId?: string) => void }) {
  const [q, setQ] = useState("");
  const hits = useMemo(
    () =>
      ROOMS.filter(
        (r) =>
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          r.region.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Search</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rooms or regions"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      {hits.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm"
        >
          {r.name}
          <span className="block text-xs text-muted">{r.region}</span>
        </button>
      ))}
    </div>
  );
}

function Profile({ store }: { store: Store }) {
  const [name, setName] = useState(store.handle);
  useEffect(() => setName(store.handle), [store.handle]);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Profile</h2>
      <Card title={store.handle || "Guest"} body={`${store.posts.filter((p) => p.author === store.handle).length} posts · ${store.pins.length} bookmarks`} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New handle"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button type="button" className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm" onClick={() => store.rename(name)}>
        Save handle
      </button>
    </div>
  );
}

function Bookmarks({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Bookmarks</h2>
      {store.pins.length === 0 ? <p className="text-sm text-muted">Bookmark a room from Home.</p> : null}
      {store.pins.map((id) => (
        <div key={id} className="flex items-center justify-between rounded-xl border border-line bg-panel p-3">
          <button type="button" className="text-left text-sm font-semibold" onClick={() => onHome(id)}>
            {roomName(id)}
          </button>
          <button type="button" className="text-xs text-muted" onClick={() => store.unpin(id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function Notes({ store }: { store: Store }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Notifications</h2>
      {store.notes.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : null}
      {store.notes.map((n) => (
        <Card key={n.id} title={n.text} body={new Date(n.ts).toLocaleString()} />
      ))}
    </div>
  );
}

function Teams({ store }: { store: Store }) {
  const [name, setName] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Teams</h2>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
          onClick={() => {
            store.createTeam(name);
            setName("");
          }}
        >
          Create
        </button>
      </div>
      {store.teams.map((t) => (
        <Card key={t.id} title={t.name} body={`${t.members.length} members · ${t.members.join(", ")}`}>
          <button type="button" className="mt-2 text-xs text-fg" onClick={() => store.joinTeam(t.id)}>
            Join
          </button>
        </Card>
      ))}
    </div>
  );
}

function Badges({ store }: { store: Store }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Badges</h2>
      {store.badges.map((b) => (
        <Card key={b.id} title={b.label} body={b.on ? "Unlocked" : "Locked — do the action to earn it"} />
      ))}
    </div>
  );
}

function Board({ store }: { store: Store }) {
  const rows = Object.entries(store.scores).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Leaderboard</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">Send messages to appear here.</p> : null}
      {rows.map(([name, n], i) => (
        <Card key={name} title={`${i + 1}. ${name}`} body={`${n} messages on this device`} />
      ))}
    </div>
  );
}

function Ads({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [placement, setPlacement] = useState<"sidebar" | "hero" | "chat">("sidebar");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 overflow-y-auto p-5">
      <h2 className="text-xl font-bold">Advertise</h2>
      <p className="text-sm text-muted">Submit a placement. After you pay, paste the transaction hash. Admin reviews it.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Copy / destination URL" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <select
        value={placement}
        onChange={(e) => setPlacement(e.target.value as typeof placement)}
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      >
        <option value="sidebar">Sidebar</option>
        <option value="hero">Hero strip</option>
        <option value="chat">Above chat</option>
      </select>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (e.g. 50 USDT)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Crypto tx hash after payment" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the Terms. This ad is lawful and I accept review or rejection.</span>
      </label>
      <button
        type="button"
        className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
        onClick={() => {
          if (!agree) {
            setErr("Accept the Terms to submit an ad.");
            return;
          }
          store.saveAd(name, note, { placement, txHash, amount, status: txHash.trim() ? "paid" : "pending" });
          setName("");
          setNote("");
          setTxHash("");
          setAmount("");
        }}
      >
        Submit for review
      </button>
      {store.campaigns.map((c) => (
        <Card key={c.id} title={c.name} body={`${c.status} · ${c.placement}${c.amount ? ` · ${c.amount}` : ""}${c.note ? `\n${c.note}` : ""}`} />
      ))}
    </div>
  );
}

function Admin({ store }: { store: Store }) {
  const [role, setRole] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [userId, setUserId] = useState("");
  const [staff, setStaff] = useState<{ user_id: string; role: string; handle: string | null }[]>([]);
  const [grantId, setGrantId] = useState("");
  const [grantRole, setGrantRole] = useState<"mod" | "admin" | "super">("mod");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void staffMe()
      .then((s) => {
        setRole(s.role);
        setEmpty(s.empty);
        setUserId(s.userId);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (!role) return;
    void listStaff()
      .then((rows) => setStaff(rows))
      .catch(() => setStaff([]));
  }, [role]);

  if (!role && !empty) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Staff console</h2>
        <p className="text-sm text-muted">This account is not staff. Sign in on /login with a staff account.</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Claim ops</h2>
        <p className="text-sm text-muted">No staff yet. The first signed-in owner becomes super admin. Do this once.</p>
        <button
          type="button"
          className="btn-3d w-full rounded-lg py-2 text-sm font-semibold"
          onClick={() => {
            void claimOps().then((r) => {
              if (r.ok) setRole("super");
              else setMsg(r.reason);
            });
          }}
        >
          Claim super admin
        </button>
        {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-3 overflow-y-auto p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-bold">Super admin</h2>
        <p className="text-xs text-muted">
          Role {role} · id {userId}
        </p>
      </div>
      <Card title="Queue" body={`${store.campaigns.filter((c) => c.status === "pending" || c.status === "paid").length} waiting`} />
      <Card title="Live ads" body={`${store.campaigns.filter((c) => c.status === "approved").length} approved`} />
      <div className="md:col-span-2 space-y-2">
        {store.campaigns.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted">
                  {c.status} · {c.placement}
                  {c.amount ? ` · ${c.amount}` : ""}
                </div>
                {c.note ? <p className="mt-1 text-sm">{c.note}</p> : null}
                {c.txHash ? <p className="mt-1 break-all text-[11px] text-muted">tx {c.txHash}</p> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { status: "paid" })}>
                  Mark paid
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { status: "approved" })}>
                  Approve
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs text-danger" onClick={() => store.patchAd(c.id, { status: "rejected" })}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {role === "super" || role === "admin" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Grant role</div>
          <input value={grantId} onChange={(e) => setGrantId(e.target.value)} placeholder="User id from their session" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <select value={grantRole} onChange={(e) => setGrantRole(e.target.value as typeof grantRole)} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="mod">mod</option>
            <option value="admin">admin</option>
            <option value="super">super</option>
          </select>
          <button
            type="button"
            className="btn-3d rounded-lg px-3 py-2 text-sm"
            onClick={() => {
              if (!grantId.trim()) return;
              void setStaffRole({ data: { userId: grantId.trim(), role: grantRole } }).then(() => listStaff().then(setStaff));
            }}
          >
            Save role
          </button>
          {staff.map((s) => (
            <div key={s.user_id} className="text-xs text-muted">
              {s.handle || s.user_id} · {s.role}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Settings({ store }: { store: Store }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function change() {
    setErr("");
    setMsg("");
    if (next.trim().length < 8) {
      setErr("New password needs 8+ characters.");
      return;
    }
    const r = await authClient.changePassword({ currentPassword: current, newPassword: next });
    if (r.error) setErr(r.error.message ?? "Could not change password.");
    else {
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Settings</h2>
      <Card title="Public username" body={store.handle || "Sign in to set one"} />
      <Card title="Change password" body="You must know the current password. Forgot-password email is not on yet.">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-lime-2">{msg}</p> : null}
        <button type="button" className="btn-3d mt-2 rounded-lg px-3 py-2 text-sm" onClick={() => void change()}>
          Update password
        </button>
      </Card>
      <Card title="This device" body="Signed-in pins and teams save on the server. Clear only wipes extras cached here.">
        <button type="button" className="mt-2 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger" onClick={store.reset}>
          Clear local extras
        </button>
      </Card>
    </div>
  );
}

function Help() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Help & Terms</h2>
      <Card title="Rooms" body="Home is live chat. Messages stay on this device until a server is connected." />
      <Card title="Forum" body="Create post publishes a thread. Open it to comment." />
      <div className="raised whitespace-pre-wrap rounded-xl p-3 text-xs text-muted">{TERMS}</div>
    </div>
  );
}

function Dash({ store, onHome, onForum }: { store: Store; onHome: (id?: string) => void; onForum?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <Card title={store.handle || "Guest"} body={`${store.posts.length} posts · ${store.pins.length} rooms saved · ${store.notes.length} events`} />
      <Card title="Your rooms">
        <div className="mt-2 flex flex-wrap gap-2">
          {(store.pins.length ? store.pins : ["global"]).map((id) => (
            <button key={id} type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => onHome(id)}>
              {roomName(id)}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Your posts">
        {store.posts.filter((p) => !store.handle || p.author === store.handle).length === 0 ? (
          <p className="mt-1 text-sm text-muted">None yet.</p>
        ) : (
          store.posts
            .filter((p) => !store.handle || p.author === store.handle)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className="mt-2 block w-full text-left text-sm"
                onClick={() => {
                  store.setOpenPost(p.id);
                  onForum?.();
                }}
              >
                {p.title}
              </button>
            ))
        )}
      </Card>
    </div>
  );
}

function Trending({ onHome }: { onHome: (id?: string) => void }) {
  const top = [...ROOMS].sort((a, b) => b.online - a.online).slice(0, 12);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Trending</h2>
      {top.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-panel p-3 text-left"
        >
          <span>
            <span className="block font-semibold">{r.name}</span>
            <span className="text-xs text-muted">{r.region}</span>
          </span>
          <span className="text-xs text-muted">{r.online.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

function Contact({ store }: { store: Store }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Contact</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Message"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button
        type="button"
        className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
        onClick={() => {
          if (!body.trim()) return;
          store.saveAd("Contact", body.trim());
          setBody("");
          setSent(true);
        }}
      >
        Send note
      </button>
      {sent ? <p className="text-sm text-muted">Saved on this device.</p> : null}
    </div>
  );
}
