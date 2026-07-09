import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase().trim()));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await logAudit({ id: user.id, name: user.name }, "auth.login");
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
