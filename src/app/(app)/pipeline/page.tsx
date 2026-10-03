"use client";

import { useState } from "react";
import { card, Empty, isOverdue, Loading } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { todayISO } from "@/lib/dates";
import { actions, useStore } from "@/lib/store";
import { PHASES, statusOf, type Phase, type SystemId } from "@/lib/types";

export default function PipelineView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { systems } = useStore();
  const { openEdit, openNew, filters } = useUI();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  if (!hydrated) return <Loading />;
  const today = todayISO();

  // every system gets a row so tasks can be dragged into a new one
  const rows = systems.filter((s) => filters.system === "all" || s.id === filters.system);
  const total = Math.max(1, tasks.length);

  const drop = (system: SystemId, phase: Phase) => {
    if (dragId) actions.update(dragId, { system, phase });
    setDragId(null);
    setOver(null);
  };

  return (
    <div className="space-y-5">
      {/* phase strip */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PHASES.map((p, i) => {
          const list = tasks.filter((t) => t.phase === p.id);
          const done = list.filter((t) => t.status === "done").length;
          return (
            <div key={p.id} className={`${card} relative overflow-hidden p-4`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-brand" style={{ opacity: 0.25 + i * 0.18 }} />
              <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Step {i + 1}</div>
              <div className="font-semibold text-ink">{p.label}</div>
              <div className="text-xs text-muted">{p.hint}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-ink">{list.length}</span>
                <span className="text-xs text-muted">{done} done</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(list.length / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      {rows.length === 0 ? (
        <Empty onAdd={() => openNew()} />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: "220px repeat(5, minmax(0, 1fr))" }}>
            <div className="sticky left-0 z-10 border-b border-line bg-[#FAFAFB] px-4 py-2.5 text-xs font-medium text-muted">System</div>
            {PHASES.map((p) => (
              <div key={p.id} className="border-b border-l border-line bg-[#FAFAFB] px-3 py-2.5 text-xs font-medium text-muted">
                {p.label}
              </div>
            ))}
            {rows.map((s) => (
              <div key={s.id} className="contents">
                <div className="sticky left-0 z-10 flex items-start gap-2.5 border-b border-line bg-surface px-4 py-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                  <div>
                    <div className="text-sm font-medium text-ink">{s.name}</div>
                    <div className="text-xs text-muted">
                      {tasks.filter((t) => t.system === s.id && t.status === "done").length}/{tasks.filter((t) => t.system === s.id).length} done
                    </div>
                  </div>
                </div>
                {PHASES.map((p) => {
                  const key = `${s.id}:${p.id}`;
                  const cell = tasks.filter((t) => t.system === s.id && t.phase === p.id);
                  return (
                    <div
                      key={key}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOver(key);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
                      }}
                      onDrop={() => drop(s.id, p.id)}
                      onDoubleClick={() => openNew({ system: s.id, phase: p.id })}
                      className={`min-h-[76px] space-y-1.5 border-b border-l border-line p-2 transition ${over === key ? "bg-brand-soft" : ""}`}
                      title="Double-click to add a task here"
                    >
                      {cell.map((t) => {
                        const st = statusOf(t.status);
                        return (
                          <button
                            key={t.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", t.id);
                              setDragId(t.id);
                            }}
                            onDragEnd={() => {
                              setDragId(null);
                              setOver(null);
                            }}
                            onClick={() => openEdit(t.id)}
                            className={`block w-full cursor-grab rounded-md border bg-surface px-2.5 py-1.5 text-left text-xs leading-snug shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-line-strong hover:shadow ${dragId === t.id ? "opacity-40" : ""} ${isOverdue(t, today) ? "border-[#F5B5B7]" : "border-line"}`}
                            style={{ borderLeft: `3px solid ${st.color}` }}
                          >
                            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: st.fg }}>
                              {st.label}
                            </span>
                            <span className={t.status === "done" ? "text-faint line-through" : "text-ink"}>{t.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-faint">Drag a task to another cell to change its system or phase. Double-click a cell to add a task there.</p>
    </div>
  );
}
