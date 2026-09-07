import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
  }>`select id, title, body, excerpt, category, tags, link, image, slug, status, author, ts from nf_posts where status = 'publish' order by ts desc limit 80`;
  const comments = await sql<{
    post_id: string;
    author: string;
    body: string;
    ts: number | string;
  }>`select post_id, author, body, ts from nf_comments order by ts asc`;
  return posts.map((p) => ({
    ...p,
    ts: Number(p.ts),
    comments: comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({ author: c.author, body: c.body, ts: Number(c.ts) })),
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
    const author = (context.userId || "user").slice(0, 24);
    await sql`insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts)
      values (${id}, ${context.userId}, ${title}, ${body}, ${data.excerpt ?? body.slice(0, 140)}, ${data.category ?? "General"}, ${data.tags ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.slug ?? ""}, ${"publish"}, ${author}, ${ts})`;
    return { id };
  });

export const saveComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body || !data.postId) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const author = context.userId.slice(0, 24);
    await sql`insert into nf_comments (id, post_id, user_id, author, body, ts)
      values (${id}, ${data.postId}, ${context.userId}, ${author}, ${body}, ${ts})`;
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
  }>`select id, title, artist, url, platform, embed, cover, genre, album, note, tags, author, ts from nf_tracks order by ts desc limit 80`;
  return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
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
    ts: number | string;
  }>`select id, name, note, placement, status, amount, tx_hash, ts from nf_ads order by ts desc limit 80`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    note: r.note ?? "",
    placement: r.placement as "sidebar" | "hero" | "chat",
    status: r.status as "pending" | "paid" | "approved" | "rejected",
    amount: r.amount ?? undefined,
    txHash: r.tx_hash ?? undefined,
    ts: Number(r.ts),
  }));
});

export const saveAdRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; note: string; placement?: string; status?: string; amount?: string; txHash?: string }) => d)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    if (!name) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    await sql`insert into nf_ads (id, user_id, name, note, placement, status, amount, tx_hash, ts)
      values (${id}, ${context.userId}, ${name}, ${data.note}, ${data.placement ?? "sidebar"}, ${data.status ?? "pending"}, ${data.amount ?? ""}, ${data.txHash ?? ""}, ${ts})`;
    return { id };
  });

export const listMsgs = createServerFn({ method: "GET" })
  .validator((roomId: string) => roomId)
  .handler(async ({ data: roomId }) => {
    const sql = await getSql();
    const rows = await sql<{ n: string; t: string; ts: number | string }>`select n, t, ts from nf_msgs where room_id = ${roomId} order by ts asc limit 80`;
    return rows.map((r) => ({ n: r.n, t: r.t, ts: Number(r.ts), rx: {} as Record<string, number> }));
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
    const n = context.userId.slice(0, 24);
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
    const who = context.userId.slice(0, 24);
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
    const who = context.userId.slice(0, 24);
    const members = rows[0].members.split(",").filter(Boolean);
    if (!members.includes(who)) members.push(who);
    await sql`update nf_teams set members = ${members.join(",")} where id = ${id}`;
    return { id, members };
  });
