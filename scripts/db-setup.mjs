// Creates the tasks table and loads the starting plan when the table is empty.
// Safe to re-run: it never deletes or overwrites existing tasks.
// Usage: npm run db:setup   (reads DATABASE_URL from .env.local)
import { neon } from "@neondatabase/serverless";
import { INSERT_SQL, insertParams, SCHEMA_SQL } from "../src/lib/db.ts";
import { starterTasks } from "../src/lib/seed.ts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
await sql.query(SCHEMA_SQL);

const [{ count }] = await sql.query("SELECT count(*)::int AS count FROM tasks");
if (count > 0) {
  console.log(`tasks table ready, ${count} tasks already there. Starting plan not loaded.`);
} else {
  const tasks = starterTasks();
  await sql.transaction(tasks.map((t, i) => sql.query(INSERT_SQL, insertParams(t, i + 1))));
  console.log(`tasks table created and ${tasks.length} starting tasks loaded.`);
}
