import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/db";
import { requireAdmin, logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  return NextResponse.json(
    users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() }))
  );
}

const CreateUserBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateUserBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const [user] = await db
      .insert(usersTable)
      .values({ name: parsed.data.name, email: parsed.data.email.toLowerCase().trim(), passwordHash, role: parsed.data.role })
      .returning();
    await logAudit({ id: admin.id, name: admin.name }, "user.create", `${user.name} <${user.email}> (${user.role})`);
    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }
}
