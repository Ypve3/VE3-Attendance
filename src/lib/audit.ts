import { db, auditLogsTable, usersTable } from "@/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function getRequester(req: NextRequest) {
  const id = Number(req.headers.get("x-user-id"));
  if (!id) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user ?? null;
}

export async function requireAdmin(req: NextRequest) {
  const user = await getRequester(req);
  return user?.role === "admin" ? user : null;
}

export async function logAudit(
  actor: { id: number; name: string } | null,
  action: string,
  details?: string
) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "system",
      action,
      details: details ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}
