"use client";

import { diffDays, fmtShort, toDate } from "@/lib/dates";
import { systemOf, teamOf, userOf } from "@/lib/store";
import {
  priorityOf,
  statusOf,
  tagStyle,
  type Priority,
  type Status,
  type SystemId,
  type Task,
} from "@/lib/types";

export function SystemTag({ id, compact = false }: { id: SystemId; compact?: boolean }) {
  const s = systemOf(id);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
      <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: s.color }} />
      {compact ? s.short : s.name}
    </span>
  );
}

export function StatusPill({ id, size = "sm" }: { id: Status; size?: "sm" | "xs" }) {
  const s = statusOf(id);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium ${size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function PriorityFlag({ id, showLabel = true }: { id: Priority; showLabel?: boolean }) {
  const p = priorityOf(id);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted" title={`${p.label} priority`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M2.5 1.5v9" stroke={p.color} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M3 2h6.5l-1.6 2.2L9.5 6.5H3z" fill={p.color} />
      </svg>
      {showLabel ? p.label : null}
    </span>
  );
}

export function TagList({ tags, max = 3 }: { tags: string[]; max?: number }) {
  if (!tags.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => {
        const s = tagStyle(t);
        return (
          <span key={t} className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: s.bg, color: s.fg }}>
            {t}
          </span>
        );
      })}
      {tags.length > max ? <span className="text-[10px] text-faint">+{tags.length - max}</span> : null}
    </span>
  );
}

const AVATAR_COLORS = ["#7B68EE", "#4573D2", "#2E9E6B", "#E0559B", "#E8743B", "#1A9E99", "#D9485F", "#64748B"];

export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const words = name.replace(/[+&]/g, " ").split(/\s+/).filter(Boolean);
  const initials = words.length === 1 ? words[0].slice(0, 3).toUpperCase() : words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}

/** Overlapping avatars for a task's assignees; falls back to the responsible team's name. */
export function Assignees({ task, size = 22, max = 3 }: { task: Task; size?: number; max?: number }) {
  const people = task.assignees.map((id) => userOf(id)).filter((u): u is NonNullable<typeof u> => !!u);
  if (!people.length) {
    const team = teamOf(task.team);
    return team ? (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: team.color }} title={`${team.name} (no one assigned yet)`}>
        {team.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
      </span>
    ) : (
      <span className="inline-flex items-center justify-center rounded-full border border-dashed border-line-strong text-faint" style={{ width: size, height: size, fontSize: size * 0.5 }} title="Unassigned">
        +
      </span>
    );
  }
  return (
    <span className="inline-flex items-center" title={people.map((p) => p.name).join(", ")}>
      {people.slice(0, max).map((p, i) => (
        <span key={p.id} className="rounded-full ring-2 ring-white" style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <Avatar name={p.name} size={size} />
        </span>
      ))}
      {people.length > max ? <span className="ml-1 text-[10px] text-muted">+{people.length - max}</span> : null}
    </span>
  );
}

export function ChecklistBadge({ task }: { task: Task }) {
  const n = task.checklist.length;
  if (!n) return null;
  const d = task.checklist.filter((c) => c.done).length;
  const complete = d === n;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] tabular-nums ${complete ? "bg-[#E6F8F1] text-[#047857]" : "bg-subtle text-muted"}`}
      title="Checklist"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <rect x="1" y="1" width="10" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3.5 6.2l1.7 1.6L8.6 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {d}/{n}
    </span>
  );
}

export function isOverdue(t: Task, today: string) {
  return t.status !== "done" && t.due < today;
}

export function DueLabel({ task, today }: { task: Task; today: string }) {
  const overdue = isOverdue(task, today);
  const left = diffDays(toDate(today), toDate(task.due));
  const soon = task.status !== "done" && left >= 0 && left <= 2;
  return (
    <span className={`whitespace-nowrap text-xs ${overdue ? "font-medium text-[#D93F45]" : soon ? "font-medium text-[#B76E00]" : "text-muted"}`}>
      {task.status !== "done" && left === 0 ? "Today" : task.status !== "done" && left === 1 ? "Tomorrow" : fmtShort(task.due)}
    </span>
  );
}

export function Empty({ onAdd, children }: { onAdd?: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface py-16 text-center">
      <p className="text-sm text-muted">{children ?? "No tasks match. Clear the filters or add one."}</p>
      {onAdd ? (
        <button onClick={onAdd} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
          Add task
        </button>
      ) : null}
    </div>
  );
}

export function Loading() {
  return <div className="py-20 text-center text-sm text-faint">Loading plan...</div>;
}

export const card = "rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
