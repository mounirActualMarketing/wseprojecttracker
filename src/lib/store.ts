"use client";

import { useSyncExternalStore } from "react";
import { starterTasks } from "./seed";
import type { Task } from "./types";

// Single client-side task store shared by every view, persisted to localStorage.
// Swap this module for an API/database later; the views only use the hook + actions.

const KEY = "wse-strategy-system:v2";

interface State {
  tasks: Task[];
  hydrated: boolean;
}

const SERVER_STATE: State = { tasks: [], hydrated: false };

let state: State | null = null;
const listeners = new Set<() => void>();

// Bump when starter tasks are added, and list them so saved plans pick them up once.
const SEED_VERSION = 2;
const SEED_ADDITIONS: Record<number, string[]> = { 2: ["r00"] };

const normalize = (t: Partial<Task>): Task =>
  ({ notes: "", dependsOn: [], tags: [], checklist: [], ...t }) as Task;

function load(): State {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { tasks: Partial<Task>[]; seed?: number };
      let tasks = (parsed.tasks ?? []).map(normalize);
      const from = parsed.seed ?? 1;
      if (from < SEED_VERSION) {
        const ids = new Set(tasks.map((t) => t.id));
        const added = Object.entries(SEED_ADDITIONS)
          .filter(([v]) => Number(v) > from)
          .flatMap(([, list]) => list);
        const missing = starterTasks().filter((t) => added.includes(t.id) && !ids.has(t.id));
        tasks = [...missing, ...tasks];
        // persist quietly: load() runs during render, so listeners must not fire here
        window.localStorage.setItem(KEY, JSON.stringify({ tasks, seed: SEED_VERSION }));
      }
      state = { tasks, hydrated: true };
      return state;
    }
  } catch {
    // storage blocked or corrupt: fall back to the starting plan
  }
  state = { tasks: starterTasks(), hydrated: true };
  return state;
}

function commit(tasks: Task[]) {
  state = { tasks, hydrated: true };
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ tasks, seed: SEED_VERSION }));
  } catch {
    // ignore quota / privacy mode errors
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, load, () => SERVER_STATE);
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

export const actions = {
  add(task: Omit<Task, "id">): string {
    const id = newId();
    commit([...load().tasks, { ...task, id }]);
    return id;
  },
  update(id: string, patch: Partial<Task>) {
    commit(load().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  },
  remove(id: string) {
    commit(
      load()
        .tasks.filter((t) => t.id !== id)
        .map((t) => (t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t)),
    );
  },
  toggleCheck(taskId: string, itemId: string) {
    const t = load().tasks.find((x) => x.id === taskId);
    if (t) actions.update(taskId, { checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) });
  },
  addDependency(taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) return;
    const byId = new Map(load().tasks.map((t) => [t.id, t]));
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
    const t = load().tasks.find((x) => x.id === taskId);
    if (t) actions.update(taskId, { dependsOn: t.dependsOn.filter((d) => d !== dependsOnId) });
  },
  resetPlan() {
    commit(starterTasks());
  },
  clearAll() {
    commit([]);
  },
  importTasks(tasks: Partial<Task>[]) {
    commit(tasks.map(normalize));
  },
};
