"use client";

import { useState } from "react";
import { isOverdue, Loading } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { addDays, diffDays, startOfWeek, toDate, todayISO, toISO } from "@/lib/dates";
import { actions, systemOf } from "@/lib/store";
import { statusOf, type Task } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { openEdit, openNew } = useUI();
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [showSpans, setShowSpans] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
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
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  // phone view: the tapped day, else today when it is in this month, else the 1st
  const selected = picked?.startsWith(monthKey) ? picked : today.startsWith(monthKey) ? today : `${monthKey}-01`;
  const upcoming = tasks
    .filter((t) => t.due.startsWith(monthKey) && t.due > selected && t.status !== "done")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8);
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
        <label className="ml-auto hidden items-center gap-2 text-sm text-muted md:flex">
          <input type="checkbox" className="accent-[#7B68EE]" checked={showSpans} onChange={(e) => setShowSpans(e.target.checked)} />
          Show work in progress
        </label>
      </div>

      {/* phones: compact month with dots, tasks for the tapped day below */}
      <div className="md:hidden">
        <div className="rounded-xl border border-line bg-surface p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-faint">
            {WEEKDAYS.map((d) => <div key={d} className="py-1">{d.slice(0, 2)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const iso = toISO(d);
              const inMonth = d.getMonth() === m;
              const due = dueOn(iso);
              const on = iso === selected;
              return (
                <button
                  key={iso}
                  onClick={() => setPicked(iso)}
                  className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg ${on ? "bg-brand-soft" : ""}`}
                  aria-label={`${iso}, ${due.length} due`}
                  aria-pressed={on}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums ${
                      iso === today ? "bg-brand font-semibold text-white" : on ? "font-semibold text-brand-dark" : inMonth ? "text-ink" : "text-faint"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {due.slice(0, 3).map((t) => (
                      <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: t.status === "done" ? "#C0C6CF" : systemOf(t.system).color }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold text-ink">
          {toDate(selected).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        {dueOn(selected).length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {dueOn(selected).map((t) => {
              const st = statusOf(t.status);
              return (
                <li key={t.id}>
                  <button onClick={() => openEdit(t.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left" style={{ borderLeft: `3px solid ${systemOf(t.system).color}` }}>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] font-medium ${t.status === "done" ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
                      <span className="text-xs text-muted">{systemOf(t.system).short}</span>
                    </span>
                    <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface px-3 py-4 text-sm text-faint">Nothing due this day.</p>
        )}
        {upcoming.length ? (
          <>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-ink">Coming up this month</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setPicked(t.due)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted">{toDate(t.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: systemOf(t.system).color }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:block">
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
      <p className="hidden text-xs text-faint md:block">
        Tasks appear on their due date. Dots show tasks still in progress that day. Drag a task to another day to reschedule, double-click a day to add one.
      </p>
    </div>
  );
}
