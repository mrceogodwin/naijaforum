import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

type StaffRole = "mod" | "admin" | "super";

async function staffOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string; role: string; handle: string | null }>`select user_id, role, handle from nf_staff where user_id = ${userId} limit 1`;
  return rows[0] ?? null;
}

export const staffMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const count = await sql<{ n: string | number }>`select count(*) as n from nf_staff`;
    const mine = await staffOf(context.userId);
    return { role: mine?.role ?? null, empty: Number(count[0]?.n ?? 0) === 0, userId: context.userId };
  });

export const claimOps = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const count = await sql<{ n: string | number }>`select count(*) as n from nf_staff`;
    if (Number(count[0]?.n ?? 0) > 0) return { ok: false as const, reason: "Staff already claimed" };
    await sql`insert into nf_staff (user_id, role, handle, ts) values (${context.userId}, ${"super"}, ${context.userId}, ${Date.now()})`;
    return { ok: true as const, role: "super" as const };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    return sql<{ user_id: string; role: string; handle: string | null; ts: number | string }>`select user_id, role, handle, ts from nf_staff order by ts asc`;
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; role: StaffRole; handle?: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super" && me?.role !== "admin") throw new Error("Forbidden");
    const sql = await getSql();
    const existing = await staffOf(data.userId);
    if (existing) {
      await sql`update nf_staff set role = ${data.role}, handle = ${data.handle ?? existing.handle} where user_id = ${data.userId}`;
    } else {
      await sql`insert into nf_staff (user_id, role, handle, ts) values (${data.userId}, ${data.role}, ${data.handle ?? data.userId}, ${Date.now()})`;
    }
    return { ok: true };
  });

export const setAdStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "pending" | "paid" | "approved" | "rejected" }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_ads set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const hidePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_posts set status = ${"hidden"} where id = ${id}`;
    return { ok: true };
  });

export const listMail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    const rows = await sql<{ id: string; author: string; body: string; ts: number | string }>`select id, author, body, ts from nf_mail order by ts desc limit 50`;
    return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    const rows = await sql<{ id: string; post_id: string; author: string; reason: string; ts: number | string }>`select id, post_id, author, reason, ts from nf_reports order by ts desc limit 50`;
    return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  });

export const saveWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { coin: string; address: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super" && me?.role !== "admin") throw new Error("Forbidden");
    const address = data.address.trim();
    const coin = data.coin.trim().toLowerCase();
    if (!coin) return null;
    const sql = await getSql();
    const existing = await sql<{ coin: string }>`select coin from nf_wallets where coin = ${coin} limit 1`;
    if (existing[0]) await sql`update nf_wallets set address = ${address}, ts = ${Date.now()} where coin = ${coin}`;
    else await sql`insert into nf_wallets (coin, address, ts) values (${coin}, ${address}, ${Date.now()})`;
    return { ok: true };
  });
