import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

const RegisterFaceBody = z.object({
  descriptor: z.array(z.number()),
  photo: z.string().optional(), // base64 data-url thumbnail
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const parsed = RegisterFaceBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const [updated] = await db
    .update(employeesTable)
    .set({
      faceDescriptor: parsed.data.descriptor,
      photo: parsed.data.photo ?? null,
      consentAt: new Date(), // registration implies the consent checkbox was ticked client-side
    })
    .where(eq(employeesTable.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await logAudit({ id: user.id, name: user.name }, "employee.face_register", updated.name);
  return NextResponse.json({ ok: true });
}

/** Biometric data deletion: clears descriptor + photo + consent. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const [updated] = await db
    .update(employeesTable)
    .set({ faceDescriptor: null, photo: null, consentAt: null })
    .where(eq(employeesTable.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await logAudit({ id: user.id, name: user.name }, "employee.biometric_delete", updated.name);
  return new NextResponse(null, { status: 204 });
}
