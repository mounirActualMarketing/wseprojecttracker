"use client";

import { useMemo, useState } from "react";
import { Assignees, ChecklistBadge, DueLabel, Empty, Loading, PriorityFlag, SystemTag, TagList } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { fmtShort, todayISO } from "@/lib/dates";
import { actions, useStore, userOf } from "@/lib/store";
import { PHASES, PRIORITIES, STATUSES, statusOf, type Status, type Task } from "@/lib/types";

type SortKey = "title" | "assignee" | "due" | "priority" | "status" | "system" | "start";
type GroupBy = "status" | "system" | "none";

const rank: Record<string, string[]> = {
  status: STATUSES.map((s) => s.id),
  priority: PRIORITIES.map((p) => p.id),
};

const COLS: { key: SortKey; label: string; w: string }[] = [
  { key: "title", label: "Name", w: "min-w-[320px]" },
  { key: "assignee", label: "Assignees", w: "w-36" },
  { key: "start", label: "Start", w: "w-20" },
  { key: "due", label: "Due", w: "w-24" },
  { key: "priority", label: "Priority", w: "w-24" },
  { key: "status", label: "Status", w: "w-32" },
  { key: "system", label: "System", w: "w-40" },
];

export default function TableView() {
  const { tasks, hydrated } = useFilteredTasks();
  const { systems } = useStore();
  const { openEdit, openNew } = useUI();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "due", dir: 1 });
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    const val = (t: Task): number | string => {
      const k = sort.key;
      if (k === "system") return systems.findIndex((s) => s.id === t.system);
      if (k === "assignee") return (userOf(t.assignees[0] ?? "")?.name ?? "~").toLowerCase();
      if (k in rank) return rank[k].indexOf(t[k as "status" | "priority"]);
      return String(t[k as "title" | "due" | "start"]).toLowerCase();
    };
    return [...tasks].sort((a, b) => {
      const va = val(a), vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [tasks, sort, systems]);

  if (!hydrated) return <Loading />;
  const today = todayISO();

  const groups: { id: string; label: string; color: string; tasks: Task[]; defaults: Partial<Task> }[] =
    groupBy === "status"
      ? STATUSES.map((s) => ({ id: s.id, label: s.label, color: s.color, tasks: sorted.filter((t) => t.status === s.id), defaults: { status: s.id } }))
      : groupBy === "system"
        ? systems.map((s) => ({ id: s.id, label: s.name, color: s.color, tasks: sorted.filter((t) => t.system === s.id), defaults: { system: s.id } }))
        : [{ id: "all", label: "All tasks", color: "#7B68EE", tasks: sorted, defaults: {} }];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Group by</span>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {(["status", "system", "none"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-md px-3 py-1 capitalize ${groupBy === g ? "bg-brand-soft font-medium text-brand-dark" : "text-muted hover:text-ink"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <Empty onAdd={() => openNew()} />
      ) : (
        <>
        {/* phones: card list with the same groups */}
        <div className="space-y-4 md:hidden">
          {groups
            .filter((g) => g.tasks.length)
            .map((g) => (
              <section key={g.id}>
                <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} className="mb-2 flex items-center gap-2">
                  <span className={`text-faint transition ${collapsed[g.id] ? "" : "rotate-90"}`}>▸</span>
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: g.color }}>
                    {g.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{g.tasks.length}</span>
                </button>
                {collapsed[g.id] ? null : (
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                    {g.tasks.map((t) => (
                      <MobileRow key={t.id} t={t} today={today} onOpen={() => openEdit(t.id)} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:block">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-[#FAFAFB] text-left text-xs text-muted">
                <th className="w-10" />
                {COLS.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 font-medium ${c.w}`}>
                    <button
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}
                      className={`flex items-center gap-1 hover:text-ink ${sort.key === c.key ? "text-ink" : ""}`}
                    >
                      {c.label}
                      {sort.key === c.key ? <span className="text-brand">{sort.dir === 1 ? "↑" : "↓"}</span> : null}
                    </button>
                  </th>
                ))}
                <th className="w-28 px-3 py-2.5 font-medium">Phase</th>
              </tr>
            </thead>
            {groups
              .filter((g) => g.tasks.length || groupBy === "status")
              .map((g) => {
                const isCollapsed = collapsed[g.id];
                return (
                  <tbody key={g.id}>
                    <tr className="border-b border-line">
                      <td colSpan={COLS.length + 2} className="px-3 pb-2 pt-4">
                        <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} className="flex items-center gap-2">
                          <span className={`text-faint transition ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
                          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: g.color }}>
                            {g.label}
                          </span>
                          <span className="text-xs tabular-nums text-muted">{g.tasks.length}</span>
                        </button>
                      </td>
                    </tr>
                    {isCollapsed
                      ? null
                      : g.tasks.map((t) => (
                          <Row key={t.id} t={t} today={today} onOpen={() => openEdit(t.id)} />
                        ))}
                    {isCollapsed ? null : (
                      <tr className="border-b border-line">
                        <td />
                        <td colSpan={COLS.length + 1} className="px-3 py-1.5">
                          <button onClick={() => openNew(g.defaults)} className="text-xs text-faint hover:text-brand">
                            + Add task
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function MobileRow({ t, today, onOpen }: { t: Task; today: string; onOpen: () => void }) {
  const done = t.status === "done";
  return (
    <li className="flex gap-3 px-3 py-3 active:bg-subtle">
      <input
        type="checkbox"
        checked={done}
        onChange={() => actions.update(t.id, { status: done ? "todo" : "done" })}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[#10B981]"
        aria-label={`Mark ${t.title} ${done ? "not done" : "done"}`}
      />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={`block text-[15px] font-medium leading-snug ${done ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SystemTag id={t.system} compact />
          <DueLabel task={t} today={today} />
          <PriorityFlag id={t.priority} />
          <ChecklistBadge task={t} />
        </span>
        {t.tags.length ? <span className="mt-1.5 block"><TagList tags={t.tags} /></span> : null}
      </button>
      <span className="shrink-0 pt-0.5"><Assignees task={t} size={24} max={2} /></span>
    </li>
  );
}

function Row({ t, today, onOpen }: { t: Task; today: string; onOpen: () => void }) {
  const st = statusOf(t.status);
  const done = t.status === "done";
  return (
    <tr className="group border-b border-line hover:bg-[#FAFAFB]">
      <td className="pl-4">
        <input
          type="checkbox"
          checked={done}
          onChange={() => actions.update(t.id, { status: done ? "todo" : "done" })}
          className="h-4 w-4 accent-[#10B981]"
          aria-label={`Mark ${t.title} ${done ? "not done" : "done"}`}
        />
      </td>
      <td className="px-3 py-2">
        <button onClick={onOpen} className="flex flex-wrap items-center gap-2 text-left">
          <span className={`font-medium group-hover:text-brand-dark ${done ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
          <ChecklistBadge task={t} />
          <TagList tags={t.tags} />
        </button>
      </td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <Assignees task={t} />
          {t.assignees.length === 1 ? <span className="truncate text-xs text-muted">{userOf(t.assignees[0])?.name}</span> : null}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-muted">{fmtShort(t.start)}</td>
      <td className="px-3 py-2"><DueLabel task={t} today={today} /></td>
      <td className="px-3 py-2"><PriorityFlag id={t.priority} /></td>
      <td className="px-3 py-2">
        <select
          value={t.status}
          onChange={(e) => actions.update(t.id, { status: e.target.value as Status })}
          className="cursor-pointer rounded-md border-0 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white outline-none"
          style={{ background: st.color }}
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id} className="bg-white text-ink normal-case">
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2"><SystemTag id={t.system} compact /></td>
      <td className="px-3 py-2 text-xs text-muted">{PHASES.find((p) => p.id === t.phase)?.label}</td>
    </tr>
  );
}
