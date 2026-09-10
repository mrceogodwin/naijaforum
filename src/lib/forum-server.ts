import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function publicHandle(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  const h = rows[0]?.handle?.trim();
  if (h) return h.slice(0, 24);
  return userId.slice(0, 12);
}

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const posts = await sql<{
    id: string;
    title: string;
    body: string;
    excerpt: string | null;
    category: string | null;
    tags: string | null;
    link: string | null;
    image: string | null;
    slug: string | null;
    status: string;
    author: string;
    ts: number | string;
    views: number | string | null;
  }>`select id, title, body, excerpt, category, tags, link, image, slug, status, author, ts, views from nf_posts where status = 'publish' order by ts desc limit 80`;
  const comments = await sql<{
    post_id: string;
    author: string;
    body: string;
    ts: number | string;
    parent_ts: number | string | null;
  }>`select post_id, author, body, ts, parent_ts from nf_comments order by ts asc`;
  return posts.map((p) => ({
    ...p,
    ts: Number(p.ts),
    views: Number(p.views ?? 0),
    comments: comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({ author: c.author, body: c.body, ts: Number(c.ts), parentTs: c.parent_ts ? Number(c.parent_ts) : undefined })),
  }));
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; body: string; excerpt?: string; category?: string; tags?: string; link?: string; image?: string; slug?: string }) => d)
  .handler(async ({ context, data }) => {
    const title = data.title.trim();
    const body = data.body.trim();
    if (!title || !body) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts)
      values (${id}, ${context.userId}, ${title}, ${body}, ${data.excerpt ?? body.slice(0, 140)}, ${data.category ?? "General"}, ${data.tags ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.slug ?? ""}, ${"publish"}, ${author}, ${ts})`;
    return { id };
  });

export const saveComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; body: string; parentTs?: number }) => d)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body || !data.postId) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_comments (id, post_id, user_id, author, body, ts, parent_ts)
      values (${id}, ${data.postId}, ${context.userId}, ${author}, ${body}, ${ts}, ${data.parentTs ?? null})`;
    return { id };
  });

export const listTracks = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    title: string;
    artist: string;
    url: string;
    platform: string;
    embed: string | null;
    cover: string | null;
    genre: string | null;
    album: string | null;
    note: string | null;
    tags: string | null;
    author: string;
    ts: number | string;
    views: number | string | null;
  }>`select id, title, artist, url, platform, embed, cover, genre, album, note, tags, author, ts, views from nf_tracks order by ts desc limit 80`;
  return rows.map((r) => ({ ...r, ts: Number(r.ts), views: Number(r.views ?? 0) }));
});

export const saveTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; artist: string; url: string; platform: string; embed?: string; cover?: string; genre?: string; album?: string; note?: string; tags?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    await sql`insert into nf_tracks (id, user_id, title, artist, url, platform, embed, cover, genre, album, note, tags, author, ts)
      values (${id}, ${context.userId}, ${data.title}, ${data.artist}, ${data.url}, ${data.platform}, ${data.embed ?? ""}, ${data.cover ?? ""}, ${data.genre ?? ""}, ${data.album ?? ""}, ${data.note ?? ""}, ${data.tags ?? ""}, ${data.artist}, ${ts})`;
    return { id };
  });

export const listAds = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    name: string;
    note: string | null;
    placement: string;
    status: string;
    amount: string | null;
    tx_hash: string | null;
    coin: string | null;
    link: string | null;
    image: string | null;
    kind: string | null;
    video: string | null;
    views: number | string | null;
    ts: number | string;
  }>`select id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts from nf_ads order by ts desc limit 80`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    note: r.note ?? "",
    placement: (r.placement || "board") as CampaignPlacement,
    status: r.status as "pending" | "paid" | "approved" | "rejected",
    amount: r.amount ?? undefined,
    txHash: r.tx_hash ?? undefined,
    coin: r.coin ?? undefined,
    link: r.link ?? undefined,
    image: r.image ?? undefined,
    kind: (r.kind as Campaign["kind"]) || undefined,
    video: r.video ?? undefined,
    views: Number(r.views ?? 0),
    ts: Number(r.ts),
  }));
});

type CampaignPlacement = "sidebar" | "hero" | "chat" | "board";
type Campaign = { kind?: "image" | "video" | "image-text" | "video-text" | "text" };

export const saveAdRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; note: string; placement?: string; status?: string; amount?: string; txHash?: string; coin?: string; link?: string; image?: string; kind?: string; video?: string }) => d)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    if (!name) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    await sql`insert into nf_ads (id, user_id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts)
      values (${id}, ${context.userId}, ${name}, ${data.note}, ${data.placement ?? "board"}, ${data.status ?? "pending"}, ${data.amount ?? ""}, ${data.txHash ?? ""}, ${data.coin ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.kind ?? "image-text"}, ${data.video ?? ""}, ${0}, ${ts})`;
    return { id };
  });

export const listWallets = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ coin: string; address: string }>`select coin, address from nf_wallets`;
  return rows;
});

export const listMsgs = createServerFn({ method: "GET" })
  .validator((roomId: string) => roomId)
  .handler(async ({ data: roomId }) => {
    const sql = await getSql();
    const rows = await sql<{ n: string; t: string; ts: number | string }>`select n, t, ts from nf_msgs where room_id = ${roomId} order by ts asc limit 80`;
    const rx = await sql<{ ts: number | string; kind: string; n: number | string }>`select ts, kind, n from nf_rx where room_id = ${roomId}`;
    return rows.map((r) => {
      const bag: Record<string, number> = {};
      rx.filter((x) => Number(x.ts) === Number(r.ts)).forEach((x) => {
        bag[x.kind] = Number(x.n);
      });
      return { n: r.n, t: r.t, ts: Number(r.ts), rx: bag };
    });
  });

export const saveMsg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; text: string }) => d)
  .handler(async ({ context, data }) => {
    const text = data.text.trim();
    if (!text) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const n = await publicHandle(context.userId);
    await sql`insert into nf_msgs (id, user_id, room_id, n, t, ts) values (${id}, ${context.userId}, ${data.roomId}, ${n}, ${text}, ${ts})`;
    return { id, n, ts };
  });

export const purgeMsgs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((roomId: string) => roomId)
  .handler(async ({ data: roomId }) => {
    const sql = await getSql();
    await sql`delete from nf_msgs where room_id = ${roomId}`;
  });

export const listPins = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ room_id: string }>`select room_id from nf_pins where user_id = ${context.userId} order by ts desc`;
    return rows.map((r) => r.room_id);
  });

export const savePin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; on: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.on) {
      await sql`insert into nf_pins (user_id, room_id, ts) values (${context.userId}, ${data.roomId}, ${Date.now()})
        on conflict (user_id, room_id) do nothing`;
    } else {
      await sql`delete from nf_pins where user_id = ${context.userId} and room_id = ${data.roomId}`;
    }
  });

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; members: string }>`select id, name, members from nf_teams order by ts desc limit 40`;
  return rows.map((r) => ({ id: r.id, name: r.name, members: r.members.split(",").filter(Boolean) }));
});

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string }) => d)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    if (!name) return null;
    const sql = await getSql();
    const id = nid();
    const who = await publicHandle(context.userId);
    await sql`insert into nf_teams (id, user_id, name, members, ts) values (${id}, ${context.userId}, ${name}, ${who}, ${Date.now()})`;
    return { id, name, members: [who] };
  });

export const joinTeamRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ members: string }>`select members from nf_teams where id = ${id} limit 1`;
    if (!rows[0]) return null;
    const who = await publicHandle(context.userId);
    const members = rows[0].members.split(",").filter(Boolean);
    if (!members.includes(who)) members.push(who);
    await sql`update nf_teams set members = ${members.join(",")} where id = ${id}`;
    return { id, members };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ handle: string; bio: string | null; city: string | null }>`select handle, bio, city from nf_profiles where user_id = ${context.userId} limit 1`;
    return rows[0] ? { handle: rows[0].handle, bio: rows[0].bio ?? "", city: rows[0].city ?? "" } : { handle: "", bio: "", city: "" };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { handle: string; bio?: string; city?: string }) => d)
  .handler(async ({ context, data }) => {
    const handle = data.handle.trim().slice(0, 24);
    if (!handle) return null;
    const sql = await getSql();
    const existing = await sql<{ user_id: string }>`select user_id from nf_profiles where user_id = ${context.userId} limit 1`;
    if (existing[0]) {
      await sql`update nf_profiles set handle = ${handle}, bio = ${data.bio ?? ""}, city = ${data.city ?? ""}, ts = ${Date.now()} where user_id = ${context.userId}`;
    } else {
      await sql`insert into nf_profiles (user_id, handle, bio, city, ts) values (${context.userId}, ${handle}, ${data.bio ?? ""}, ${data.city ?? ""}, ${Date.now()})`;
    }
    return { handle };
  });

export const sendMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((body: string) => body)
  .handler(async ({ context, data: raw }) => {
    const body = raw.trim();
    if (!body) return null;
    const sql = await getSql();
    const id = nid();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_mail (id, user_id, author, body, ts) values (${id}, ${context.userId}, ${author}, ${body}, ${Date.now()})`;
    return { id };
  });

export const listScores = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ n: string; c: string | number }>`select n, count(*) as c from nf_msgs group by n order by count(*) desc limit 20`;
  return rows.map((r) => ({ name: r.n, n: Number(r.c) }));
});

export const saveRx = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; ts: number; kind: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const existing = await sql<{ n: number | string }>`select n from nf_rx where room_id = ${data.roomId} and ts = ${data.ts} and kind = ${data.kind} limit 1`;
    if (existing[0]) {
      await sql`update nf_rx set n = ${Number(existing[0].n) + 1} where room_id = ${data.roomId} and ts = ${data.ts} and kind = ${data.kind}`;
    } else {
      await sql`insert into nf_rx (room_id, ts, kind, n) values (${data.roomId}, ${data.ts}, ${data.kind}, ${1})`;
    }
  });

export const reportPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; reason: string }) => d)
  .handler(async ({ context, data }) => {
    const reason = data.reason.trim().slice(0, 280);
    if (!reason || !data.postId) return null;
    const sql = await getSql();
    const id = nid();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_reports (id, post_id, user_id, author, reason, ts) values (${id}, ${data.postId}, ${context.userId}, ${author}, ${reason}, ${Date.now()})`;
    return { id };
  });

export const listJoins = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ name: string; room: string | null; ts: number | string }>`select name, room, ts from nf_joins order by ts desc limit 20`;
  return rows.map((r) => ({ name: r.name, room: r.room ?? undefined, ts: Number(r.ts) }));
});

export const saveJoin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; room?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const name = data.name.trim().slice(0, 24);
    if (!name) return;
    const existing = await sql<{ name: string }>`select name from nf_joins where name = ${name} limit 1`;
    if (existing[0]) {
      await sql`update nf_joins set room = ${data.room ?? ""}, ts = ${Date.now()} where name = ${name}`;
    } else {
      await sql`insert into nf_joins (name, room, ts) values (${name}, ${data.room ?? ""}, ${Date.now()})`;
    }
  });

export const bumpView = createServerFn({ method: "POST" })
  .validator((d: { table: "posts" | "ads" | "tracks"; id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.table === "posts") await sql`update nf_posts set views = coalesce(views, 0) + 1 where id = ${data.id}`;
    else if (data.table === "ads") await sql`update nf_ads set views = coalesce(views, 0) + 1 where id = ${data.id}`;
    else await sql`update nf_tracks set views = coalesce(views, 0) + 1 where id = ${data.id}`;
  });

