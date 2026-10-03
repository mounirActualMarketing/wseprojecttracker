"use client";

import { useSyncExternalStore } from "react";
import { starterTasks } from "./seed";
import type { Task } from "./types";

// Client-side task store shared by every view, backed by the Neon database through /api/tasks.
// Changes apply to the screen immediately, then save to the server; on failure the plan is reloaded
// from the server and an error is shown. The plan is refreshed on focus and every 20 seconds.

interface State {
  tasks: Task[];
  hydrated: boolean;
  error: string | null;
}

const SERVER_STATE: State = { tasks: [], hydrated: false, error: null };
const REFRESH_MS = 20_000;

let state: State = SERVER_STATE;
let started = false;
let pending = 0; // saves in flight; background refreshes wait for them
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function refresh() {
  try {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load the plan (${res.status})`);
    const tasks = (await res.json()) as Task[];
    if (pending === 0) set({ tasks, hydrated: true, error: null });
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
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** Apply a change locally right away, then send it to the server. */
async function save(next: Task[], request: () => Promise<Response>) {
  set({ tasks: next, error: null });
  pending++;
  try {
    const res = await request();
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  } catch (e) {
    set({ error: `${e instanceof Error ? e.message : "Save failed"}. The plan was reloaded from the server.` });
    pending--;
    await refresh();
    return;
  }
  pending--;
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

export const actions = {
  add(task: Omit<Task, "id">): string {
    const id = newId();
    const full = { ...task, id };
    save([...state.tasks, full], () => fetch("/api/tasks", json("POST", full)));
    return id;
  },
  update(id: string, patch: Partial<Task>) {
    save(
      state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      () => fetch(`/api/tasks/${encodeURIComponent(id)}`, json("PATCH", patch)),
    );
  },
  remove(id: string) {
    save(
      state.tasks
        .filter((t) => t.id !== id)
        .map((t) => (t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t)),
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
    save(tasks, () => fetch("/api/tasks", json("PUT", tasks)));
  },
  resetPlan() {
    actions.replaceAll(starterTasks());
  },
  clearAll() {
    actions.replaceAll([]);
  },
  importTasks(tasks: Partial<Task>[]) {
    actions.replaceAll(tasks.map((t) => ({ notes: "", dependsOn: [], tags: [], checklist: [], ...t }) as Task));
  },
  dismissError() {
    set({ error: null });
  },
  reload: refresh,
};
