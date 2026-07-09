import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function main() {
  const { db, usersTable, settingsTable, departmentsTable } = await import("./index");

  const passwordHash = await bcrypt.hash("Ve3@global", 10);
  await db
    .insert(usersTable)
    .values({ email: "preeti.garg@ve3.global", name: "Preeti Garg", passwordHash, role: "admin" })
    .onConflictDoNothing({ target: usersTable.email });

  await db.insert(settingsTable).values({ key: "late_cutoff", value: "09:30" }).onConflictDoNothing();

  for (const name of ["Engineering", "HR", "Sales", "Operations"]) {
    await db.insert(departmentsTable).values({ name }).onConflictDoNothing({ target: departmentsTable.name });
  }

  console.log("Seeded: admin user preeti.garg@ve3.global / Ve3@global (CHANGE THIS PASSWORD), late_cutoff=09:30, 4 departments");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
