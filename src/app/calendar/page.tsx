"use client";

import { useState } from "react";
import { isOverdue, Loading } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { addDays, diffDays, startOfWeek, toDate, todayISO, toISO } from "@/lib/dates";
import { actions } from "@/lib/store";
import { statusOf, systemOf, type Task } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { openEdit, openNew } = useUI();
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [showSpans, setShowSpans] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  if (!hydrated) return <Loading />;

  const today = todayISO();
  const now = toDate(today);
  const { y, m } = cursor ?? { y: now.getFullYear(), m: now.getMonth() };
  const first = new Date(y, m, 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthLabel = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const go = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const dueOn = (iso: string) => tasks.filter((t) => t.due === iso);
  const activeOn = (iso: string) => tasks.filter((t) => t.start <= iso && t.due > iso && t.status !== "done");

  const drop = (iso: string) => {
    const t = tasks.find((x) => x.id === dragId);
    if (t && t.due !== iso) {
      // move the task, keeping its duration
      const shift = diffDays(toDate(t.due), toDate(iso));
      actions.update(t.id, { due: iso, start: toISO(addDays(toDate(t.start), shift)) });
    }
    setDragId(null);
    setOver(null);
  };

  const chip = (t: Task) => {
    const sys = systemOf(t.system);
    const st = statusOf(t.status);
    const late = isOverdue(t, today);
    const done = t.status === "done";
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
        onClick={(e) => {
          e.stopPropagation();
          openEdit(t.id);
        }}
        title={`${t.title} · ${st.label}`}
        className={`flex w-full cursor-grab items-center gap-1.5 truncate rounded border bg-white px-1.5 py-1 text-left text-[11px] font-medium shadow-[0_1px_1px_rgba(16,24,40,0.05)] hover:shadow ${late ? "border-[#F5B5B7]" : "border-line"} ${done ? "text-faint line-through" : "text-ink"}`}
        style={{ borderLeft: `3px solid ${sys.color}` }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: st.color }} />
        <span className="truncate">{t.title}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(null)} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-subtle">
            Today
          </button>
          <button onClick={() => go(-1)} className="rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-subtle hover:text-ink" aria-label="Previous month">
            ‹
          </button>
          <button onClick={() => go(1)} className="rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-subtle hover:text-ink" aria-label="Next month">
            ›
          </button>
        </div>
        <h2 className="text-lg font-semibold text-ink">{monthLabel}</h2>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-[#7B68EE]" checked={showSpans} onChange={(e) => setShowSpans(e.target.checked)} />
          Show work in progress
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="grid min-w-[760px] grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-b border-line bg-[#FAFAFB] px-3 py-2 text-xs font-medium text-muted">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === m;
            const due = dueOn(iso);
            const active = showSpans ? activeOn(iso) : [];
            const isToday = iso === today;
            return (
              <div
                key={iso}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(iso);
                }}
                onDrop={() => drop(iso)}
                onDoubleClick={() => openNew({ due: iso, start: iso })}
                title="Double-click to add a task due this day"
                className={`min-h-[120px] border-b border-r border-line p-1.5 transition [&:nth-child(7n)]:border-r-0 ${inMonth ? "bg-surface" : "bg-[#FAFAFB]"} ${over === iso ? "!bg-brand-soft" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${isToday ? "bg-brand font-semibold text-white" : inMonth ? "text-ink" : "text-faint"}`}
                  >
                    {d.getDate()}
                  </span>
                  {active.length ? (
                    <span className="flex gap-0.5" title={active.map((t) => t.title).join("\n")}>
                      {active.slice(0, 6).map((t) => (
                        <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: systemOf(t.system).color, opacity: 0.55 }} />
                      ))}
                      {active.length > 6 ? <span className="text-[9px] text-faint">+{active.length - 6}</span> : null}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {due.slice(0, 4).map(chip)}
                  {due.length > 4 ? <div className="px-1 text-[10px] text-muted">+{due.length - 4} more</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-faint">
        Tasks appear on their due date. Dots show tasks still in progress that day. Drag a task to another day to reschedule, double-click a day to add one.
      </p>
    </div>
  );
}
