"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { SystemId, Task } from "@/lib/types";

interface Filters {
  query: string;
  system: SystemId | "all";
  owner: string; // "" = all
  tag: string; // "" = all
}

interface ModalState {
  open: boolean;
  taskId: string | null;
  defaults?: Partial<Task>;
}

interface UI {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  modal: ModalState;
  openNew: (defaults?: Partial<Task>) => void;
  openEdit: (id: string) => void;
  closeModal: () => void;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [filters, setF] = useState<Filters>({ query: "", system: "all", owner: "", tag: "" });
  const [modal, setModal] = useState<ModalState>({ open: false, taskId: null });

  const setFilters = useCallback((f: Partial<Filters>) => setF((p) => ({ ...p, ...f })), []);
  const openNew = useCallback((defaults?: Partial<Task>) => setModal({ open: true, taskId: null, defaults }), []);
  const openEdit = useCallback((id: string) => setModal({ open: true, taskId: id }), []);
  const closeModal = useCallback(() => setModal({ open: false, taskId: null }), []);

  const value = useMemo(
    () => ({ filters, setFilters, modal, openNew, openEdit, closeModal }),
    [filters, setFilters, modal, openNew, openEdit, closeModal],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUI must be used inside UIProvider");
  return v;
}

/** Tasks after the global search / system / owner / tag filters. */
export function useFilteredTasks() {
  const { tasks, hydrated } = useStore();
  const { filters } = useUI();
  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (filters.system === "all" || t.system === filters.system) &&
        (!filters.owner || t.owner === filters.owner) &&
        (!filters.tag || t.tags.includes(filters.tag)) &&
        (!q ||
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.owner.toLowerCase().includes(q) ||
          t.checklist.some((c) => c.text.toLowerCase().includes(q))),
    );
  }, [tasks, filters]);
  return { tasks: filtered, all: tasks, hydrated };
}
