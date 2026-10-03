"use client";

import { useSyncExternalStore } from "react";
import { starterTasks } from "./seed";
import type { Role, System, Task, Team, User } from "./types";

// Client-side store shared by every view, backed by Neon through the API.
// /api/bootstrap loads the signed-in user, people, teams, systems and tasks. Changes apply on screen
// immediately, then save; on failure everything is reloaded from the server and an error is shown.
// The data refreshes on focus and every 20 seconds so teammates see each other's changes.

interface State {
  me: User | null;
  users: User[];
  teams: Team[];
  systems: System[];
  tasks: Task[];
  hydrated: boolean;
  error: string | null;
}

const EMPTY: State = { me: null, users: [], teams: [], systems: [], tasks: [], hydrated: false, error: null };
const REFRESH_MS = 20_000;

let state: State = EMPTY;
let started = false;
let pending = 0; // saves in flight; background refreshes wait for them
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function toLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.href = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}

async function refresh() {
  try {
    const res = await fetch("/api/bootstrap", { cache: "no-store" });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error(`Could not load the plan (${res.status})`);
    const data = (await res.json()) as Omit<State, "hydrated" | "error">;
    if (pending === 0) set({ ...data, hydrated: true, error: null });
  } catch (e) {
    set({ hydrated: true, error: e instanceof Error ? e.message : "Could not load the plan" });
  }
}

function start() {
  if (started) return;
  started = true;
  refresh();
  window.setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
  window.addEventListener("focus", () => refresh());
}

function subscribe(l: () => void) {
  listeners.add(l);
  start();
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

async function errorText(res: Response) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${res.status})`;
}

/** Apply a change locally right away, then send it to the server. */
async function save(patch: Partial<State>, request: () => Promise<Response>) {
  set({ ...patch, error: null });
  pending++;
  try {
    const res = await request();
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error(await errorText(res));
  } catch (e) {
    pending--;
    set({ error: `${e instanceof Error ? e.message : "Save failed"}. The plan was reloaded from the server.` });
    await refresh();
    return;
  }
  pending--;
}

/** For admin actions that need the server's answer (invite links, new ids). Throws the server's message. */
async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) toLogin();
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as T;
}

const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

/* ---------- lookups that read the current state (safe inside render of subscribed components) ---------- */

const UNKNOWN_SYSTEM: System = { id: "", name: "Unknown system", short: "Unknown", color: "#9CA3AF" };
export const systemOf = (id: string): System => state.systems.find((s) => s.id === id) ?? { ...UNKNOWN_SYSTEM, id };
export const userOf = (id: string) => state.users.find((u) => u.id === id);
export const teamOf = (id: string | null) => (id ? state.teams.find((t) => t.id === id) : undefined);

const RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2 };
export const can = (me: User | null, role: Role) => !!me && RANK[me.role] >= RANK[role];

/* ---------- actions ---------- */

export const actions = {
  add(task: Omit<Task, "id">): string {
    const id = newId();
    const full = { ...task, id };
    save({ tasks: [...state.tasks, full] }, () => fetch("/api/tasks", json("POST", full)));
    return id;
  },
  update(id: string, patch: Partial<Task>) {
    save(
      { tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) },
      () => fetch(`/api/tasks/${encodeURIComponent(id)}`, json("PATCH", patch)),
    );
  },
  remove(id: string) {
    save(
      {
        tasks: state.tasks
          .filter((t) => t.id !== id)
          .map((t) => (t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t)),
      },
      () => fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }),
    );
  },
  toggleCheck(taskId: string, itemId: string) {
    const t = state.tasks.find((x) => x.id === taskId);
    if (t) actions.update(taskId, { checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) });
  },
  addDependency(taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) return;
    const byId = new Map(state.tasks.map((t) => [t.id, t]));
    // refuse edges that would create a cycle
    const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
      if (from === target) return true;
      if (seen.has(from)) return false;
      seen.add(from);
      return (byId.get(from)?.dependsOn ?? []).some((d) => reaches(d, target, seen));
    };
    if (reaches(dependsOnId, taskId)) return;
    const t = byId.get(taskId);
    if (!t || t.dependsOn.includes(dependsOnId)) return;
    actions.update(taskId, { dependsOn: [...t.dependsOn, dependsOnId] });
  },
  removeDependency(taskId: string, dependsOnId: string) {
    const t = state.tasks.find((x) => x.id === taskId);
    if (t) actions.update(taskId, { dependsOn: t.dependsOn.filter((d) => d !== dependsOnId) });
  },
  replaceAll(tasks: Task[]) {
    save({ tasks }, () => fetch("/api/tasks", json("PUT", tasks)));
  },
  resetPlan() {
    actions.replaceAll(starterTasks());
  },
  clearAll() {
    actions.replaceAll([]);
  },
  importTasks(tasks: Partial<Task>[]) {
    actions.replaceAll(
      tasks.map((t) => ({ notes: "", dependsOn: [], tags: [], checklist: [], assignees: [], team: null, ...t }) as Task),
    );
  },

  /* systems */
  async addSystem(s: Omit<System, "id">) {
    const created = await call<System>("/api/systems", "POST", s);
    set({ systems: [...state.systems, created] });
    return created;
  },
  async updateSystem(id: string, patch: Partial<Omit<System, "id">>) {
    await call("/api/systems/" + encodeURIComponent(id), "PATCH", patch);
    set({ systems: state.systems.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },
  async deleteSystem(id: string, moveTo?: string) {
    const q = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : "";
    await call(`/api/systems/${encodeURIComponent(id)}${q}`, "DELETE");
    await refresh();
  },

  /* teams */
  async addTeam(t: Omit<Team, "id">) {
    const created = await call<Team>("/api/teams", "POST", t);
    set({ teams: [...state.teams, created] });
    return created;
  },
  async updateTeam(id: string, patch: Partial<Omit<Team, "id">>) {
    await call("/api/teams/" + encodeURIComponent(id), "PATCH", patch);
    set({ teams: state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  },
  async deleteTeam(id: string) {
    await call("/api/teams/" + encodeURIComponent(id), "DELETE");
    await refresh();
  },

  /* people */
  async invite(person: { name: string; email: string; role: Role; team: string | null }) {
    const res = await call<{ user: User; token: string }>("/api/users", "POST", person);
    set({ users: [...state.users, res.user] });
    return res.token;
  },
  async updateUser(id: string, patch: Partial<Pick<User, "name" | "role" | "team" | "active">>) {
    await call("/api/users/" + encodeURIComponent(id), "PATCH", patch);
    await refresh();
  },
  async newInviteLink(id: string) {
    return (await call<{ token: string }>(`/api/users/${encodeURIComponent(id)}/invite`, "POST")).token;
  },
  async changePassword(current: string, next: string) {
    await call("/api/auth/password", "POST", { current, next });
  },
  async logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // full reload on purpose: clears everything the previous session loaded into memory
    window.location.replace("/login");
  },

  dismissError() {
    set({ error: null });
  },
  reload: refresh,
};

export const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;
