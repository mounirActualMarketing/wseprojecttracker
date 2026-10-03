"use client";

import { useState } from "react";
import { Avatar, ChecklistBadge, DueLabel, isOverdue, Loading, PriorityFlag, SystemTag, TagList } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { todayISO } from "@/lib/dates";
import { actions } from "@/lib/store";
import { PRIORITIES, STATUSES, type Status, type Task } from "@/lib/types";

const prioRank = (t: Task) => PRIORITIES.findIndex((p) => p.id === t.priority);

export default function KanbanView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { openEdit, openNew } = useUI();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  if (!hydrated) return <Loading />;
  const today = todayISO();

  const drop = (status: Status) => {
    if (dragId) actions.update(dragId, { status });
    setDragId(null);
    setOver(null);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
      <div className="flex min-w-max gap-3">
        {STATUSES.map((col) => {
          const list = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => prioRank(b) - prioRank(a) || a.due.localeCompare(b.due));
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={() => drop(col.id)}
              className={`flex min-h-[65vh] w-[280px] flex-col rounded-xl transition ${over === col.id ? "bg-brand-soft ring-2 ring-brand/30" : "bg-[#F0F1F4]"}`}
            >
              <header className="flex items-center justify-between px-3 pb-2 pt-3">
                <span className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: col.color }}>
                    {col.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{list.length}</span>
                </span>
                <button
                  onClick={() => openNew({ status: col.id })}
                  className="rounded-md px-1.5 text-lg leading-none text-faint hover:bg-white hover:text-brand"
                  aria-label={`Add task to ${col.label}`}
                >
                  +
                </button>
              </header>
              <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {list.map((t) => {
                  const late = isOverdue(t, today);
                  return (
                    <article
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={() => openEdit(t.id)}
                      className={`cursor-grab rounded-lg border bg-surface p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:border-line-strong hover:shadow-md active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""} ${late ? "border-[#F5B5B7]" : "border-line"}`}
                    >
                      <div className="mb-1.5"><SystemTag id={t.system} compact /></div>
                      <div className={`text-sm font-medium leading-snug ${t.status === "done" ? "text-faint line-through" : "text-ink"}`}>{t.title}</div>
                      {t.tags.length ? <div className="mt-2"><TagList tags={t.tags} max={2} /></div> : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Avatar name={t.owner} size={20} />
                          <DueLabel task={t} today={today} />
                        </span>
                        <span className="flex items-center gap-2">
                          <ChecklistBadge task={t} />
                          <PriorityFlag id={t.priority} showLabel={false} />
                        </span>
                      </div>
                    </article>
                  );
                })}
                <button
                  onClick={() => openNew({ status: col.id })}
                  className="rounded-lg px-2 py-1.5 text-left text-xs text-faint hover:bg-white hover:text-brand"
                >
                  + Add task
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
