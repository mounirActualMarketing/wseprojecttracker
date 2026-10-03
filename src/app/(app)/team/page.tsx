"use client";

import { useState } from "react";
import { Avatar, card, isOverdue } from "@/components/bits";
import { ColorPicker, Dialog, FormError, inputCls, labelCls, primaryBtn, secondaryBtn } from "@/components/Dialog";
import { useUI } from "@/components/ui-context";
import { todayISO } from "@/lib/dates";
import { actions, can, inviteUrl, useStore } from "@/lib/store";
import { PALETTE, ROLES, type Role, type Team, type User } from "@/lib/types";
import { useRouter } from "next/navigation";

type DialogState =
  | null
  | { kind: "invite" }
  | { kind: "link"; user: User; token: string; reset: boolean }
  | { kind: "team"; team?: Team };

export default function TeamPage() {
  const { users, teams, tasks, me } = useStore();
  const { setFilters } = useUI();
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = can(me, "admin");
  const today = todayISO();

  const load = (u: User) => {
    const open = tasks.filter((t) => t.assignees.includes(u.id) && t.status !== "done");
    return { open: open.length, overdue: open.filter((t) => isOverdue(t, today)).length };
  };
  const maxOpen = Math.max(1, ...users.map((u) => load(u).open));

  const groups: { team: Team | null; members: User[] }[] = [
    ...teams.map((t) => ({ team: t, members: users.filter((u) => u.team === t.id) })),
    { team: null, members: users.filter((u) => !u.team || !teams.some((t) => t.id === u.team)) },
  ].filter((g) => g.team || g.members.length);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const showTasks = (u: User) => {
    setFilters({ assignee: u.id, system: "all", team: "", tag: "", query: "" });
    router.push("/table");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {(() => {
            const n = users.filter((u) => u.active).length;
            return `${n} ${n === 1 ? "person" : "people"} in ${teams.length} ${teams.length === 1 ? "team" : "teams"}.`;
          })()} {isAdmin ? "Invite people with a link you send them yourself." : null}
        </p>
        {isAdmin ? (
          <div className="flex w-full gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            <button className={secondaryBtn} onClick={() => setDialog({ kind: "team" })}>Add team</button>
            <button className={primaryBtn} onClick={() => setDialog({ kind: "invite" })}>+ Invite member</button>
          </div>
        ) : null}
      </div>
      <FormError message={error} />

      {groups.map((g) => (
        <section key={g.team?.id ?? "none"} className={`${card} overflow-hidden`}>
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded" style={{ background: g.team?.color ?? "#C0C6CF" }} />
              <h2 className="text-sm font-semibold text-ink">{g.team?.name ?? "No team"}</h2>
              <span className="text-xs text-muted">{g.members.length} {g.members.length === 1 ? "person" : "people"}</span>
            </div>
            {isAdmin && g.team ? (
              <button onClick={() => setDialog({ kind: "team", team: g.team! })} className="text-xs text-muted hover:text-brand">Edit team</button>
            ) : null}
          </header>
          {g.members.length === 0 ? (
            <p className="px-5 py-4 text-sm text-faint">No one in this team yet.</p>
          ) : (
            <>
            {/* phones: one card per person */}
            <ul className="divide-y divide-line md:hidden">
              {g.members.map((u) => {
                const w = load(u);
                const self = u.id === me?.id;
                const sel = "w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm outline-none focus:border-brand";
                return (
                  <li key={u.id} className={`space-y-3 px-4 py-3.5 ${u.active ? "" : "opacity-50"}`}>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                          {u.name}
                          {self ? <span className="rounded bg-brand-soft px-1.5 text-[10px] font-semibold text-brand-dark">You</span> : null}
                          {!u.active ? <span className="rounded bg-subtle px-1.5 text-[10px] text-muted">Deactivated</span> : u.pending ? <span className="rounded bg-[#FEF4E2] px-1.5 text-[10px] font-medium text-[#9A5800]">Invite pending</span> : null}
                        </div>
                        <div className="truncate text-xs text-muted">{u.email}</div>
                      </div>
                      <button onClick={() => showTasks(u)} className="shrink-0 text-right">
                        <div className="text-lg font-semibold leading-none tabular-nums text-ink">{w.open}</div>
                        <div className={`text-[10px] ${w.overdue ? "font-medium text-[#D93F45]" : "text-muted"}`}>{w.overdue ? `${w.overdue} overdue` : "open"}</div>
                      </button>
                    </div>
                    {isAdmin ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <select className={sel} value={u.role} onChange={(e) => act(() => actions.updateUser(u.id, { role: e.target.value as Role }))} aria-label={`Role for ${u.name}`}>
                            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </select>
                          <select className={sel} value={u.team ?? ""} onChange={(e) => act(() => actions.updateUser(u.id, { team: e.target.value || null }))} aria-label={`Team for ${u.name}`}>
                            <option value="">No team</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        {self ? null : (
                          <div className="flex gap-2">
                            {u.active ? (
                              <>
                                <button
                                  className="flex-1 rounded-lg border border-line py-2 text-xs font-medium text-brand"
                                  onClick={() => act(async () => setDialog({ kind: "link", user: u, token: await actions.newInviteLink(u.id), reset: !u.pending }))}
                                >
                                  {u.pending ? "Invite link" : "Reset password link"}
                                </button>
                                <button className="rounded-lg border border-line px-3 py-2 text-xs text-muted" onClick={() => act(() => actions.updateUser(u.id, { active: false }))}>
                                  Deactivate
                                </button>
                              </>
                            ) : (
                              <button className="flex-1 rounded-lg border border-line py-2 text-xs font-medium text-brand" onClick={() => act(() => actions.updateUser(u.id, { active: true }))}>
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted">
                        {ROLES.find((r) => r.id === u.role)?.label} · {teams.find((t) => t.id === u.team)?.name ?? "No team"}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-[#FAFAFB] text-left text-xs text-muted">
                    <th className="px-5 py-2 font-medium">Person</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="w-48 px-3 py-2 font-medium">Workload</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {g.members.map((u) => {
                    const w = load(u);
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id} className={`border-t border-line ${u.active ? "" : "opacity-50"}`}>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 font-medium text-ink">
                                {u.name}
                                {self ? <span className="rounded bg-brand-soft px-1.5 text-[10px] font-semibold text-brand-dark">You</span> : null}
                                {!u.active ? <span className="rounded bg-subtle px-1.5 text-[10px] text-muted">Deactivated</span> : u.pending ? <span className="rounded bg-[#FEF4E2] px-1.5 text-[10px] font-medium text-[#9A5800]">Invite pending</span> : null}
                              </div>
                              <div className="truncate text-xs text-muted">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {isAdmin ? (
                            <select
                              className="rounded-md border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                              value={u.role}
                              onChange={(e) => act(() => actions.updateUser(u.id, { role: e.target.value as Role }))}
                              aria-label={`Role for ${u.name}`}
                            >
                              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-muted">{ROLES.find((r) => r.id === u.role)?.label}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isAdmin ? (
                            <select
                              className="rounded-md border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                              value={u.team ?? ""}
                              onChange={(e) => act(() => actions.updateUser(u.id, { team: e.target.value || null }))}
                              aria-label={`Team for ${u.name}`}
                            >
                              <option value="">No team</option>
                              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-muted">{teams.find((t) => t.id === u.team)?.name ?? "No team"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => showTasks(u)} className="block w-full text-left" title="Show their tasks">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-ink">{w.open} open</span>
                              {w.overdue ? <span className="font-medium text-[#D93F45]">{w.overdue} overdue</span> : null}
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                              <div className="h-full rounded-full bg-brand" style={{ width: `${(w.open / maxOpen) * 100}%` }} />
                            </div>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          {isAdmin && !self ? (
                            <span className="flex justify-end gap-3 text-xs">
                              {u.active ? (
                                <>
                                  <button
                                    className="text-brand hover:underline"
                                    onClick={() => act(async () => setDialog({ kind: "link", user: u, token: await actions.newInviteLink(u.id), reset: !u.pending }))}
                                  >
                                    {u.pending ? "Invite link" : "Reset password link"}
                                  </button>
                                  <button className="text-muted hover:text-[#D93F45]" onClick={() => act(() => actions.updateUser(u.id, { active: false }))}>
                                    Deactivate
                                  </button>
                                </>
                              ) : (
                                <button className="text-brand hover:underline" onClick={() => act(() => actions.updateUser(u.id, { active: true }))}>
                                  Reactivate
                                </button>
                              )}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      ))}

      <section className={`${card} p-5`}>
        <h2 className="mb-3 text-sm font-semibold text-ink">Roles</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r.id} className="rounded-lg bg-subtle px-3 py-2.5">
              <div className="text-sm font-medium text-ink">{r.label}</div>
              <div className="text-xs text-muted">{r.hint}</div>
            </li>
          ))}
        </ul>
      </section>

      {dialog?.kind === "invite" ? (
        <InviteDialog onClose={() => setDialog(null)} onCreated={(user, token) => setDialog({ kind: "link", user, token, reset: false })} />
      ) : null}
      {dialog?.kind === "link" ? <LinkDialog {...dialog} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "team" ? <TeamDialog team={dialog.team} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function InviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User, token: string) => void }) {
  const { teams, users } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [team, setTeam] = useState(teams[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog title="Invite a member" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const token = await actions.invite({ name: name.trim(), email: email.trim(), role, team: team || null });
            const user = { id: "", name: name.trim(), email: email.trim(), role, team: team || null, active: true, pending: true };
            onCreated(users.find((u) => u.email === email.trim().toLowerCase()) ?? user, token);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not invite");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className={labelCls} htmlFor="inv-name">Full name</label>
          <input id="inv-name" autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="inv-email">Email</label>
          <input id="inv-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="inv-role">Role</label>
            <select id="inv-role" className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-team">Team</label>
            <select id="inv-team" className={inputCls} value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">No team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted">{ROLES.find((r) => r.id === role)?.hint}.</p>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={busy || !name.trim() || !email.includes("@")}>Create invite link</button>
        </div>
      </form>
    </Dialog>
  );
}

function LinkDialog({ user, token, reset, onClose }: { user: User; token: string; reset: boolean; onClose: () => void }) {
  const url = inviteUrl(token);
  const [copied, setCopied] = useState(false);
  return (
    <Dialog title={reset ? "Password reset link" : "Invite link"} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink">
          Send this link to <b>{user.name}</b> ({user.email}) on WhatsApp or email. It works once and expires in 7 days.
          {reset ? " Their current password keeps working until they use it." : " They choose their own password when they open it."}
        </p>
        <div className="flex gap-2">
          <input readOnly className={`${inputCls} font-mono text-xs`} value={url} onFocus={(e) => e.target.select()} aria-label="Link" />
          <button
            className={primaryBtn}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted">This is the only time the link is shown. You can create a new one from the Team page.</p>
        <div className="flex justify-end">
          <button className={secondaryBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </Dialog>
  );
}

function TeamDialog({ team, onClose }: { team?: Team; onClose: () => void }) {
  const { teams } = useStore();
  const [name, setName] = useState(team?.name ?? "");
  const [color, setColor] = useState(team?.color ?? PALETTE[(teams.length + 2) % PALETTE.length]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };
  return (
    <Dialog title={team ? "Edit team" : "Add team"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) run(() => (team ? actions.updateTeam(team.id, { name: name.trim(), color }) : actions.addTeam({ name: name.trim(), color })));
        }}
      >
        <div>
          <label className={labelCls} htmlFor="team-name">Team name</label>
          <input id="team-name" autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: WSE B2B sales" />
        </div>
        <div>
          <span className={labelCls}>Colour</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <FormError message={error} />
        <div className="flex items-center justify-between gap-2">
          {team ? (
            confirm ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted">Members and tasks keep working with no team.</span>
                <button type="button" className="font-medium text-[#D93F45]" onClick={() => run(() => actions.deleteTeam(team.id))}>Delete</button>
              </span>
            ) : (
              <button type="button" className="text-sm text-[#D93F45] hover:underline" onClick={() => setConfirm(true)}>Delete team</button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={primaryBtn} disabled={!name.trim()}>{team ? "Save" : "Add team"}</button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
