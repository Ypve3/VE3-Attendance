import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, regularizationsTable, attendanceTable, employeesTable } from "@/db";
import { requireAdmin, logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Only admins can review requests" }, { status: 403 });

  const id = parseInt(params.id, 10);
  const parsed = z.object({ decision: z.enum(["approved", "rejected"]) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });

  const [request] = await db.select().from(regularizationsTable).where(eq(regularizationsTable.id, id));
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });

  const [updated] = await db
    .update(regularizationsTable)
    .set({ status: parsed.data.decision, reviewedById: admin.id, reviewedByName: admin.name })
    .where(eq(regularizationsTable.id, id))
    .returning();

  // Approval creates the attendance record for that day
  if (parsed.data.decision === "approved") {
    await db.insert(attendanceTable).values({
      employeeId: request.employeeId,
      status: "Present",
      method: "regularized",
      date: request.date,
      checkInTime: new Date(`${request.date}T09:00:00`),
    });
  }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, request.employeeId));
  await logAudit(
    { id: admin.id, name: admin.name },
    `regularization.${parsed.data.decision}`,
    `${emp?.name ?? "?"} for ${request.date}`
  );

  return NextResponse.json({ ...updated, employeeName: emp?.name ?? "", createdAt: updated.createdAt.toISOString() });
}
