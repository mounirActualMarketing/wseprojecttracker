import { requireUser } from "@/lib/auth";
import { db, fromRow, systemFromRow, teamFromRow, userFromRow } from "@/lib/db";

// Everything the app needs on load: who you are, the people, teams, systems and tasks.
export async function GET(request: Request) {
  const me = await requireUser(request);
  if (me instanceof Response) return me;
  const sql = db();
  const [users, teams, systems, tasks] = await Promise.all([
    sql.query("SELECT * FROM users ORDER BY active DESC, name"),
    sql.query("SELECT * FROM teams ORDER BY sort, created_at"),
    sql.query("SELECT * FROM systems ORDER BY sort, created_at"),
    sql.query("SELECT * FROM tasks ORDER BY sort, created_at"),
  ]);
  return Response.json({
    me,
    users: users.map((r) => userFromRow(r as Parameters<typeof userFromRow>[0])),
    teams: teams.map((r) => teamFromRow(r as Parameters<typeof teamFromRow>[0])),
    systems: systems.map((r) => systemFromRow(r as Parameters<typeof systemFromRow>[0])),
    tasks: tasks.map((r) => fromRow(r as Parameters<typeof fromRow>[0])),
  });
}
