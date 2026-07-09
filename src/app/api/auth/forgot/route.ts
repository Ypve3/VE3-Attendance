import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db, usersTable, passwordResetsTable } from "@/db";
import { notifyWebhook } from "@/lib/webhook";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const generic = { message: "If that account exists, a reset link has been generated." };
  if (!email) return NextResponse.json(generic);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase().trim()));
  if (!user) return NextResponse.json(generic);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.insert(passwordResetsTable).values({ userId: user.id, token, expiresAt });

  const base = req.nextUrl.origin;
  const resetUrl = `${base}/reset-password?token=${token}`;

  // No SMTP configured in this build: surface link via server log + optional webhook.
  console.log(`[password-reset] Reset link for ${user.email}: ${resetUrl}`);
  await notifyWebhook(`🔑 Password reset requested for ${user.email}: ${resetUrl}`);

  return NextResponse.json(generic);
}
