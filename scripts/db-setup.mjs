// Creates or upgrades the database: tasks, teams, systems, users and sessions.
// Loads the default teams, systems and the starting plan only into empty tables.
// Safe to re-run: it never deletes or overwrites existing rows.
// Usage: npm run db:setup   (reads DATABASE_URL from .env.local)
import { neon } from "@neondatabase/serverless";
import { INSERT_SQL, insertParams, SCHEMA } from "../src/lib/db.ts";
import { starterTasks } from "../src/lib/seed.ts";
import { DEFAULT_SYSTEMS, DEFAULT_TEAMS } from "../src/lib/types.ts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
for (const statement of SCHEMA) await sql.query(statement);

const count = async (table) => (await sql.query(`SELECT count(*)::int AS n FROM ${table}`))[0].n;

if ((await count("teams")) === 0) {
  await sql.transaction(
    DEFAULT_TEAMS.map((t, i) => sql.query("INSERT INTO teams (id, name, color, sort) VALUES ($1, $2, $3, $4)", [t.id, t.name, t.color, i + 1])),
  );
  console.log(`teams: ${DEFAULT_TEAMS.length} default teams loaded`);
} else console.log(`teams: ${await count("teams")} already there`);

if ((await count("systems")) === 0) {
  await sql.transaction(
    DEFAULT_SYSTEMS.map((s, i) =>
      sql.query("INSERT INTO systems (id, name, short, color, sort) VALUES ($1, $2, $3, $4, $5)", [s.id, s.name, s.short, s.color, i + 1]),
    ),
  );
  console.log(`systems: ${DEFAULT_SYSTEMS.length} default systems loaded`);
} else console.log(`systems: ${await count("systems")} already there`);

if ((await count("tasks")) === 0) {
  const tasks = starterTasks();
  await sql.transaction(tasks.map((t, i) => sql.query(INSERT_SQL, insertParams(t, i + 1))));
  console.log(`tasks: ${tasks.length} starting tasks loaded`);
} else console.log(`tasks: ${await count("tasks")} already there`);

console.log(`users: ${await count("users")} (create the first admin at /setup)`);
