require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    "DROP TABLE IF EXISTS regularizations, audit_logs, password_resets, exports, visitors, attendance, employees, departments, settings, users CASCADE"
  );
  console.log("Dropped old tables");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
