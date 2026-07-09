import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, passwordResetsTable } from "@/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password || String(password).length < 6) {
    return NextResponse.json({ error: "Token and a password of at least 6 characters are required" }, { status: 400 });
  }

  const [reset] = await db
    .select()
    .from(passwordResetsTable)
    .where(and(eq(passwordResetsTable.token, token), isNull(passwordResetsTable.usedAt), gt(passwordResetsTable.expiresAt, new Date())));

  if (!reset) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, reset.userId));
  await db.update(passwordResetsTable).set({ usedAt: new Date() }).where(eq(passwordResetsTable.id, reset.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, reset.userId));
  await logAudit(user ? { id: user.id, name: user.name } : null, "auth.password_reset");

  return NextResponse.json({ message: "Password updated. You can now sign in." });
}
