import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, employeesTable, departmentsTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

function generateSixDigitPin(): string {
  // Always 6 digits, zero-padded (e.g. "004821")
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: employeesTable.id,
      name: employeesTable.name,
      departmentId: employeesTable.departmentId,
      departmentName: departmentsTable.name,
      faceDescriptor: employeesTable.faceDescriptor,
      photo: employeesTable.photo,
      pinHash: employeesTable.pinHash,
      consentAt: employeesTable.consentAt,
      createdAt: employeesTable.createdAt,
    })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .orderBy(employeesTable.name);

  return NextResponse.json(
    rows.map((e) => ({
      id: e.id,
      name: e.name,
      departmentId: e.departmentId,
      departmentName: e.departmentName ?? null,
      hasFace: e.faceDescriptor != null,
      hasPin: e.pinHash != null,
      photo: e.photo ?? null,
      consentAt: e.consentAt ? e.consentAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
    }))
  );
}

const CreateEmployeeBody = z.object({
  name: z.string().min(1),
  departmentId: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateEmployeeBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  // Auto-generate a 6-digit PIN so the employee has a working fallback
  // check-in method from day one, without an extra manual step.
  const generatedPin = generateSixDigitPin();
  const pinHash = await bcrypt.hash(generatedPin, 10);

  const [employee] = await db
    .insert(employeesTable)
    .values({ name: parsed.data.name.trim(), departmentId: parsed.data.departmentId ?? null, pinHash })
    .returning();

  await logAudit({ id: user.id, name: user.name }, "employee.create", employee.name);

  return NextResponse.json(
    {
      id: employee.id,
      name: employee.name,
      departmentId: employee.departmentId,
      departmentName: null,
      hasFace: false,
      hasPin: true,
      photo: null,
      consentAt: null,
      createdAt: employee.createdAt.toISOString(),
      generatedPin, // shown once to the admin; never stored or returned again
    },
    { status: 201 }
  );
}
