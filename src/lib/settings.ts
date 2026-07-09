import { db, settingsTable } from "@/db";
import { eq } from "drizzle-orm";

export async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

/** Returns "Late" if checkInTime is after the configured cutoff (HH:MM, server-local), else "Present". */
export async function statusForCheckIn(checkInTime: Date): Promise<"Present" | "Late"> {
  const cutoff = await getSetting("late_cutoff", "09:30");
  const [h, m] = cutoff.split(":").map(Number);
  const cutoffMinutes = h * 60 + (m || 0);
  const actualMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  return actualMinutes > cutoffMinutes ? "Late" : "Present";
}
