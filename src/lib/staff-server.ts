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
