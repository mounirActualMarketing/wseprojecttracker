"use client";

import { useRef, useState } from "react";
import { Assignees, Empty, isOverdue, Loading } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { addDays, diffDays, fmtShort, shiftISO, startOfWeek, toDate, todayISO, toISO } from "@/lib/dates";
import { actions, useStore } from "@/lib/store";
import { useIsMobile } from "@/lib/useIsMobile";
import { statusOf, TERM_END, TERM_START, type Task } from "@/lib/types";

const ZOOMS = [
  { id: "day", label: "Days", w: 30 },
  { id: "week", label: "Weeks", w: 14 },
  { id: "quarter", label: "Quarter", w: 7 },
] as const;

const ROW_H = 40;

type Drag = { id: string; mode: "move" | "resize"; x0: number; delta: number; moved: boolean };

export default function PlannerView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { systems } = useStore();
  const { openEdit, openNew } = useUI();
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]["id"]>("week");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const isMobile = useIsMobile();
  // phones: narrower name column, and bars open on tap so swiping the timeline never moves a task
  const LEFT_W = isMobile ? 150 : 280;
  if (!hydrated) return <Loading />;

  const dayW = ZOOMS.find((z) => z.id === zoom)!.w;
  const today = todayISO();
  const minStart = tasks.reduce((m, t) => (t.start < m ? t.start : m), TERM_START);
  const maxDue = tasks.reduce((m, t) => (t.due > m ? t.due : m), TERM_END);
  const rangeStart = startOfWeek(toDate(minStart));
  const days = diffDays(rangeStart, toDate(maxDue)) + 8;
  const width = days * dayW;
  const x = (iso: string) => diffDays(rangeStart, toDate(iso)) * dayW;

  const groups = systems.map((s) => ({
    system: s,
    tasks: tasks.filter((t) => t.system === s.id).sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((g) => g.tasks.length);

  const months: { label: string; left: number; width: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(rangeStart, i);
    if (i === 0 || d.getDate() === 1) {
      months.push({ label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), left: i * dayW, width: 0 });
    }
  }
  months.forEach((m, i) => (m.width = (months[i + 1]?.left ?? width) - m.left));
  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, i) => addDays(rangeStart, i * 7));

  const start = (e: React.PointerEvent, t: Task, mode: Drag["mode"]) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const d = { id: t.id, mode, x0: e.clientX, delta: 0, moved: false };
    dragRef.current = d;
    setDrag(d);
  };
  const move = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = Math.round((e.clientX - d.x0) / dayW);
    const moved = d.moved || Math.abs(e.clientX - d.x0) > 3;
    if (delta !== d.delta || moved !== d.moved) {
      dragRef.current = { ...d, delta, moved };
      setDrag(dragRef.current);
    }
  };
  const end = (t: Task) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    if (!d.moved) return openEdit(t.id);
    if (d.delta === 0) return;
    if (d.mode === "move") actions.update(t.id, { start: shiftISO(t.start, d.delta), due: shiftISO(t.due, d.delta) });
    else {
      const due = shiftISO(t.due, d.delta);
      actions.update(t.id, { due: due < t.start ? t.start : due });
    }
  };

  const view = (t: Task) => {
    if (!drag || drag.id !== t.id) return { s: t.start, e: t.due };
    if (drag.mode === "move") return { s: shiftISO(t.start, drag.delta), e: shiftISO(t.due, drag.delta) };
    const e = shiftISO(t.due, drag.delta);
    return { s: t.start, e: e < t.start ? t.start : e };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {ZOOMS.map((z) => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              className={`rounded-md px-3 py-1 text-sm ${zoom === z.id ? "bg-brand-soft font-medium text-brand-dark" : "text-muted hover:text-ink"}`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">
          <span className="hidden md:inline">Drag a bar to reschedule, drag its right edge to change the due date, click to open. </span>
          <span className="md:hidden">Swipe to scroll the timeline, tap a bar to change its dates. </span>
          The shaded band is the initial term.
        </p>
      </div>

      {groups.length === 0 ? (
        <Empty onAdd={() => openNew()} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div style={{ width: LEFT_W + width }} className="relative select-none">
            <div className="sticky top-0 z-20 flex border-b border-line bg-[#FAFAFB]">
              <div style={{ width: LEFT_W }} className="sticky left-0 z-30 shrink-0 border-r border-line bg-[#FAFAFB] px-4 py-2 text-xs font-medium text-muted">
                Task
              </div>
              <div className="relative" style={{ width, height: 52 }}>
                {months.map((m) => (
                  <div key={m.left} className="absolute top-0 truncate border-l border-line px-2 pt-1.5 text-xs font-semibold text-ink" style={{ left: m.left, width: m.width }}>
                    {m.label}
                  </div>
                ))}
                {weeks.map((w) => (
                  <div key={toISO(w)} className="absolute bottom-0 border-l border-line px-1 pb-1 text-[10px] text-muted" style={{ left: diffDays(rangeStart, w) * dayW, width: 7 * dayW }}>
                    {dayW >= 14 ? fmtShort(toISO(w)) : w.getDate()}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0" style={{ left: LEFT_W, width }}>
                <div className="absolute inset-y-0 bg-brand/[0.04]" style={{ left: x(TERM_START), width: x(TERM_END) - x(TERM_START) + dayW }} />
                {weeks.map((w) => (
                  <div key={toISO(w)} className="absolute inset-y-0 border-l border-line/70" style={{ left: diffDays(rangeStart, w) * dayW }} />
                ))}
                {zoom === "day"
                  ? Array.from({ length: days }, (_, i) => addDays(rangeStart, i))
                      .filter((d) => d.getDay() === 5 || d.getDay() === 6)
                      .map((d) => <div key={toISO(d)} className="absolute inset-y-0 bg-[#F4F5F7]" style={{ left: diffDays(rangeStart, d) * dayW, width: dayW }} />)
                  : null}
                <div className="absolute inset-y-0 z-10 w-0.5 bg-[#E5484D]" style={{ left: x(today) + dayW / 2 }}>
                  <span className="absolute left-1 top-0 rounded bg-[#E5484D] px-1 text-[9px] font-semibold text-white">Today</span>
                </div>
              </div>

              {groups.map((g) => (
                <div key={g.system.id}>
                  <div className="flex border-b border-line bg-[#FAFAFB]">
                    <div style={{ width: LEFT_W }} className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-[#FAFAFB] px-4 py-1.5 text-xs font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.system.color }} />
                      <span className="truncate">{g.system.name}</span>
                      <span className="font-normal text-faint">{g.tasks.length}</span>
                    </div>
                    <div style={{ width }} />
                  </div>
                  {g.tasks.map((t) => {
                    const v = view(t);
                    const left = x(v.s);
                    const w = Math.max(dayW, x(v.e) - left + dayW);
                    const st = statusOf(t.status);
                    const late = isOverdue(t, today);
                    const done = t.status === "done";
                    return (
                      <div key={t.id} className="flex border-b border-line/70 hover:bg-[#FAFAFB]" style={{ height: ROW_H }}>
                        <button
                          onClick={() => openEdit(t.id)}
                          style={{ width: LEFT_W }}
                          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-surface px-4 text-left text-sm hover:text-brand-dark"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st.color }} title={st.label} />
                          <span className={`min-w-0 flex-1 truncate ${done ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
                          <span className="hidden md:inline-flex"><Assignees task={t} size={18} max={2} /></span>
                        </button>
                        <div className="relative" style={{ width }}>
                          <div
                            onPointerDown={isMobile ? undefined : (e) => start(e, t, "move")}
                            onPointerMove={isMobile ? undefined : move}
                            onPointerUp={isMobile ? undefined : () => end(t)}
                            onClick={isMobile ? () => openEdit(t.id) : undefined}
                            className={`absolute top-1/2 flex h-6 -translate-y-1/2 cursor-grab items-center overflow-hidden rounded-md text-[11px] font-medium text-white shadow-sm active:cursor-grabbing ${late ? "ring-2 ring-[#E5484D]/60" : ""} ${drag?.id === t.id ? "z-20 opacity-90 shadow-md" : ""}`}
                            style={{
                              left,
                              width: w,
                              background: g.system.color,
                              opacity: done ? 0.45 : undefined,
                              backgroundImage:
                                t.status === "backlog" || t.status === "waiting"
                                  ? "repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.22) 6px 12px)"
                                  : undefined,
                            }}
                            title={`${t.title}\n${fmtShort(v.s)} to ${fmtShort(v.e)} · ${st.label}`}
                          >
                            <span className="truncate px-2">{w > 60 ? t.title : ""}</span>
                            {isMobile ? null : (
                              <span onPointerDown={(e) => start(e, t, "resize")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/10 hover:bg-black/25" />
                            )}
                          </div>
                          {w <= 60 ? (
                            <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] text-muted" style={{ left: left + w + 6 }}>
                              {t.title}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
