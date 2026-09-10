import { useEffect, useMemo, useState } from "react";
import { AD_COINS, AD_KINDS, COMMUNITIES, POST_CATS, REGIONS, ROOMS, TERMS, fmtCount, handleColor, parseMusicUrl, roomName, safeHttpUrl, slugify, timeLabel, youtubeId, type AdKind, type MenuId, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { claimOps, listMail, listReports, listStaff, saveWallet, setStaffRole, staffMe } from "@/lib/staff-server";
import { listWallets } from "@/lib/forum-server";
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
  else if (id === "search") view = <Search store={store} onHome={onHome} />;
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
  const live = store.posts.filter((p) => p.status !== "draft");
  return (
    <div className="mx-auto max-w-5xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Forum</h2>
      {live.length === 0 ? <p className="text-sm text-muted">No posts yet. Create one from Menu.</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {live.map((p) => (
          <button key={p.id} type="button" onClick={() => store.setOpenPost(p.id)} className="raised overflow-hidden rounded-lg text-left">
            {p.image ? <img src={p.image} alt="" className="h-28 w-full object-cover" /> : <div className="h-28 bg-panel-3" />}
            <div className="p-2">
              <div className="text-[9px] font-bold tracking-wide text-lime-2 uppercase">{p.category || "General"}</div>
              <div className="mt-0.5 line-clamp-2 text-xs font-semibold">{p.title}</div>
              <p className="mt-1 line-clamp-2 text-[10px] text-muted">{p.excerpt || p.body}</p>
              <div className="mt-1 text-[9px]">
                <span style={{ color: handleColor(p.author) }}>{p.author}</span>
                <span className="text-muted"> · {timeLabel(p.ts)} · {fmtCount(p.views ?? 0)} views</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PostDetail({ post, store }: { post: Post; store: Store }) {
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <button type="button" className="text-xs text-muted" onClick={() => store.setOpenPost(null)}>
        Back to forum
      </button>
      <Card title={post.title} body={post.body} />
      {post.image ? <img src={post.image} alt="" className="max-h-40 w-40 rounded-xl object-cover" /> : null}
      {post.link ? (
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-2">
          {post.link}
        </a>
      ) : null}
      <p className="text-xs text-muted">
        <span style={{ color: handleColor(post.author) }}>{post.author}</span> · {post.category} · {timeLabel(post.ts)}
        {post.tags ? ` · ${post.tags}` : ""}
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
      <div className="raised space-y-2 rounded-xl p-3">
        <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Report</div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this post should be reviewed" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <button
          type="button"
          className="text-xs text-danger"
          onClick={() => {
            if (!reason.trim()) return;
            store.flagPost(post.id, reason);
            setReason("");
          }}
        >
          Send report
        </button>
      </div>
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

function Search({ store, onHome }: { store: Store; onHome: (roomId?: string) => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const rooms = useMemo(
    () =>
      ROOMS.filter(
        (r) => !s || r.name.toLowerCase().includes(s) || r.region.toLowerCase().includes(s),
      ),
    [s],
  );
  const posts = s ? store.posts.filter((p) => `${p.title} ${p.body} ${p.author} ${p.category}`.toLowerCase().includes(s)) : [];
  const tracks = s ? store.tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(s)) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Search</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rooms, posts, artists"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      {s ? (
        <>
          <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Feeds</div>
          {posts.length === 0 ? <p className="text-sm text-muted">No posts match.</p> : null}
          {posts.map((p) => (
            <button key={p.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left" onClick={() => store.setOpenPost(p.id)}>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-muted">{p.author} · {p.category}</div>
            </button>
          ))}
          <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Music</div>
          {tracks.length === 0 ? <p className="text-sm text-muted">No tracks match.</p> : null}
          {tracks.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-panel p-3 text-sm">
              {t.title} <span className="text-muted">· {t.artist}</span>
            </div>
          ))}
        </>
      ) : null}
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Rooms</div>
      {rooms.map((r) => (
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
  const [bio, setBio] = useState(store.bio);
  const [city, setCity] = useState(store.city);
  useEffect(() => {
    setName(store.handle);
    setBio(store.bio);
    setCity(store.city);
  }, [store.bio, store.city, store.handle]);
  const mine = store.posts.filter((p) => p.author === store.handle);
  const songs = store.tracks.filter((t) => t.author === store.handle || t.artist === store.handle);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Profile</h2>
      <Card title={store.handle || "Sign in"} body={`${mine.length} posts · ${store.pins.length} bookmarks · ${songs.length} tracks`} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Public username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Bio" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <button type="button" className="btn-3d rounded-lg px-3 py-2 text-sm" onClick={() => store.rename(name, { bio, city })}>
        Save profile
      </button>
      {mine.map((p) => (
        <button key={p.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left" onClick={() => store.setOpenPost(p.id)}>
          <div className="font-semibold">{p.title}</div>
          <div className="text-xs text-muted">{p.category}</div>
        </button>
      ))}
    </div>
  );
}

function Bookmarks({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const saved = store.posts.filter((p) => store.savedPosts.includes(p.id));
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Bookmarks</h2>
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Saved posts</div>
      {saved.length === 0 ? <p className="text-sm text-muted">Save a feed post from the article view.</p> : null}
      {saved.map((p) => (
        <button key={p.id} type="button" className="raised flex w-full gap-3 overflow-hidden rounded-xl text-left" onClick={() => { store.setOpenPost(p.id); onHome(); }}>
          {p.image ? <img src={p.image} alt="" className="h-16 w-20 object-cover" /> : <div className="h-16 w-20 bg-panel-3" />}
          <div className="min-w-0 py-2 pr-2">
            <div className="truncate text-sm font-semibold">{p.title}</div>
            <div className="text-[10px] text-muted">{p.author} · {fmtCount(p.views ?? 0)} views</div>
          </div>
        </button>
      ))}
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Rooms</div>
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
      {rows.length === 0 ? <p className="text-sm text-muted">Chat on the server to appear here.</p> : null}
      {rows.map(([name, n], i) => (
        <Card key={name} title={`${i + 1}. ${name}`} body={`${n} messages`} />
      ))}
    </div>
  );
}

function Ads({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [kind, setKind] = useState<AdKind>("image-text");
  const [coin, setCoin] = useState("usdt");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);
  useEffect(() => {
    void listWallets()
      .then(setWallets)
      .catch(() => setWallets([]));
  }, []);
  const payTo = wallets.find((w) => w.coin === coin)?.address;
  return (
    <div className="mx-auto max-w-2xl space-y-3 overflow-y-auto p-5">
      <h2 className="text-xl font-bold">Place an ad</h2>
      <p className="text-sm text-muted">
        Sign in. Pick a format. Send crypto. Paste the tx. Super admin approves, then it shows on Advert.
      </p>
      <div className="flex flex-wrap gap-1">
        {AD_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full px-2 py-1 text-[11px] ${kind === k.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand / campaign name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Destination URL (https://…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {kind === "image" || kind === "image-text" ? (
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      {kind === "video" || kind === "video-text" ? (
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="YouTube URL or id (not hosted here)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      {kind !== "image" && kind !== "video" ? (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Short copy" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Pay with</div>
      <div className="flex flex-wrap gap-1">
        {AD_COINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCoin(c.id)}
            className={`rounded-full px-2 py-1 text-[11px] ${coin === c.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}
          >
            {c.ticker}
          </button>
        ))}
      </div>
      <div className="raised rounded-xl p-3 text-xs">
        <div className="text-muted">Send {AD_COINS.find((c) => c.id === coin)?.label} to</div>
        <div className="mt-1 break-all font-mono text-[11px]">{payTo || "Wallet not set yet — staff must paste addresses on /ops."}</div>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount sent (e.g. 40 USDT)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Transaction hash / payment ID after you pay" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the Terms. I paid from my own wallet. Staff may reject a bad or missing hash.</span>
      </label>
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          if (!agree) {
            setErr("Accept the Terms.");
            return;
          }
          if (!name.trim() || !txHash.trim()) {
            setErr("Name and payment tx are required.");
            return;
          }
          store.saveAd(name, note, {
            placement: "board",
            txHash,
            amount,
            coin,
            link: safeHttpUrl(link),
            image: kind.includes("image") ? safeHttpUrl(image) : undefined,
            video: kind.includes("video") ? youtubeId(video) || safeHttpUrl(video) : undefined,
            kind,
            status: "paid",
          });
          setName("");
          setNote("");
          setLink("");
          setImage("");
          setVideo("");
          setTxHash("");
          setAmount("");
          setErr("");
        }}
      >
        Submit for approval
      </button>
      {store.campaigns.map((c) => (
        <Card key={c.id} title={c.name} body={`${c.status} · ${(c.coin || "").toUpperCase()} ${c.amount || ""}${c.txHash ? `\ntx ${c.txHash}` : ""}`} />
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
  const [mail, setMail] = useState<{ id: string; author: string; body: string; ts: number }[]>([]);
  const [reports, setReports] = useState<{ id: string; post_id: string; author: string; reason: string; ts: number }[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});

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
    void listMail()
      .then(setMail)
      .catch(() => setMail([]));
    void listReports()
      .then(setReports)
      .catch(() => setReports([]));
    void listWallets()
      .then((rows) => setWallets(Object.fromEntries(rows.map((w) => [w.coin, w.address]))))
      .catch(() => undefined);
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
                  {c.status} · {(c.coin || "").toUpperCase()} {c.amount || ""} · {c.placement}
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
      <div className="md:col-span-2 space-y-2">
        <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Inbox</div>
        {mail.length === 0 ? <p className="text-sm text-muted">No contact mail.</p> : null}
        {mail.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs font-semibold">{m.author}</div>
            <p className="mt-1 text-sm">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Reports</div>
        {reports.length === 0 ? <p className="text-sm text-muted">No flags.</p> : null}
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold">{r.author}</div>
              <p className="text-sm">{r.reason}</p>
              <div className="text-[10px] text-muted">post {r.post_id}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-danger" onClick={() => store.hidePost(r.post_id)}>
              Hide post
            </button>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Feeds moderation</div>
        {store.posts.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.title}</div>
              <div className="text-xs text-muted">{p.author}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-danger" onClick={() => store.hidePost(p.id)}>
              Hide
            </button>
          </div>
        ))}
      </div>
      {role === "super" || role === "admin" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Pay-to wallets</div>
          <p className="text-xs text-muted">Users send BTC / SOL / USDC / ETH here. Paste your real addresses.</p>
          {AD_COINS.map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="w-14 shrink-0 pt-2 text-[10px] font-bold text-muted">{c.ticker}</span>
              <input
                value={wallets[c.id] ?? ""}
                onChange={(e) => setWallets((w) => ({ ...w, [c.id]: e.target.value }))}
                placeholder={`${c.label} address`}
                className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                className="rounded border border-line px-2 text-xs"
                onClick={() => void saveWallet({ data: { coin: c.id, address: wallets[c.id] ?? "" } })}
              >
                Save
              </button>
            </div>
          ))}
        </div>
      ) : null}
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
      <Card title="Accounts" body="Username + password only. No email on the form. Posts show your username." />
      <Card title="Chat" body="Signed-in messages save to the server for that room. Purge clears chat only." />
      <Card title="Feeds & music" body="Create post or Add track after you sign in. Music is a URL to Spotify / Apple / SoundCloud — we do not host files." />
      <Card title="Ads" body="Submit from Advertise. Staff approve on /ops after you pay off-platform." />
      <Card title="Staff" body="/ops is not in the public menu. First signed-in owner claims super admin once." />
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
      <p className="text-sm text-muted">Goes to staff inbox. Sign in first. Do not send passwords.</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Message"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          if (!body.trim()) return;
          store.sendContact(body);
          setBody("");
          setSent(true);
        }}
      >
        Send to staff
      </button>
      {sent ? <p className="text-sm text-lime-2">Sent. Staff see it on /ops.</p> : null}
    </div>
  );
}
