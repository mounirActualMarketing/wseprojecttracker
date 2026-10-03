"use client";

import Link from "next/link";
import { Avatar, card, ChecklistBadge, DueLabel, Empty, isOverdue, Loading, PriorityFlag, StatusPill, SystemTag } from "@/components/bits";
import { BRAND, BrandStrip, PartnerLockup } from "@/components/brand";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { diffDays, fmtLong, shiftISO, toDate, todayISO } from "@/lib/dates";
import { actions } from "@/lib/store";
import { STATUSES, SYSTEMS, TERM_END, TERM_START, type Task } from "@/lib/types";

const REQ = "Request to WSE";

export default function Overview() {
  const { tasks, hydrated } = useFilteredTasks();
  const { openNew, openEdit, setFilters } = useUI();
  if (!hydrated) return <Loading />;

  const today = todayISO();
  const done = tasks.filter((t) => t.status === "done").length;
  const open = tasks.length - done;
  const waitingOnWse = tasks.filter((t) => t.owner === "WSE" && t.status !== "done");
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const requests = tasks
    .filter((t) => t.tags.includes(REQ))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.due.localeCompare(b.due));
  const soon = tasks
    .filter((t) => t.status !== "done" && !t.tags.includes(REQ) && t.due <= shiftISO(today, 14))
    .sort((a, b) => a.due.localeCompare(b.due));

  const termDays = diffDays(toDate(TERM_START), toDate(TERM_END)) + 1;
  const elapsed = Math.min(termDays, Math.max(0, diffDays(toDate(TERM_START), toDate(today)) + 1));

  const kpis = [
    { label: "Open tasks", value: open, sub: `${tasks.length} in total`, color: "#4194F6" },
    { label: "Completed", value: `${pct}%`, sub: `${done} done`, color: "#10B981" },
    { label: "Waiting on WSE", value: waitingOnWse.length, sub: "requests not delivered yet", color: "#F59E0B" },
    { label: "Overdue", value: overdue.length, sub: "past due, not done", color: "#E5484D" },
  ];

  if (tasks.length === 0) {
    return <Empty onAdd={() => openNew()}>The plan is empty. Add the first task or reset to the starting plan from the Data menu.</Empty>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className={`${card} overflow-hidden`}>
        <BrandStrip />
        <div className="flex flex-wrap items-center justify-between gap-6 px-6 py-5">
          <div className="flex flex-wrap items-center gap-5">
            <PartnerLockup height={52} />
            <div className="hidden h-12 w-px bg-line lg:block" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND.wseRed }}>
                Growth Partnership
              </div>
              <div className="text-lg font-semibold" style={{ color: BRAND.wseNavy }}>
                Wall Street English Saudi Arabia
              </div>
              <div className="text-xs text-muted">AI systems and growth programme, run by Clicksalesmedia</div>
            </div>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted">
              <span>Initial term</span>
              <span>
                Day <b className="text-ink">{elapsed}</b> of {termDays}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full"
                style={{ width: `${(elapsed / termDays) * 100}%`, background: `linear-gradient(90deg, ${BRAND.wseNavy}, ${BRAND.wseRed})` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-faint">
              {fmtLong(TERM_START)} to {fmtLong(TERM_END)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} p-4`}>
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
              {k.label}
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-ink">{k.value}</div>
            <div className="text-xs text-faint">{k.sub}</div>
          </div>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink">What we need from Wall Street English</h2>
            <p className="text-xs text-muted">Click a row to open it, tick the box to mark it delivered.</p>
          </div>
          <button onClick={() => setFilters({ tag: REQ })} className="text-xs font-medium text-brand hover:underline">
            Show only these
          </button>
        </div>
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-sm text-faint">No open requests.</p>
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((t) => (
              <RequestRow key={t.id} t={t} today={today} onOpen={() => openEdit(t.id)} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className={`${card} p-5 lg:col-span-2`}>
          <h2 className="mb-3 text-sm font-semibold text-ink">Status</h2>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-subtle">
            {STATUSES.map((s) => {
              const n = tasks.filter((t) => t.status === s.id).length;
              return n ? <div key={s.id} title={`${s.label}: ${n}`} style={{ width: `${(n / tasks.length) * 100}%`, background: s.color }} /> : null;
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {STATUSES.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label} <span className="tabular-nums font-medium text-ink">{tasks.filter((t) => t.status === s.id).length}</span>
              </span>
            ))}
          </div>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-ink">Next 14 days</h2>
          {soon.length === 0 ? (
            <p className="text-sm text-faint">Nothing else due in the next two weeks.</p>
          ) : (
            <ul className="-mx-2">
              {soon.map((t) => (
                <li key={t.id}>
                  <button onClick={() => openEdit(t.id)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-subtle">
                    <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: SYSTEMS.find((s) => s.id === t.system)?.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                    <StatusPill id={t.status} />
                    <span className="w-16 text-right"><DueLabel task={t} today={today} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">By system</h2>
            <Link href="/pipeline" className="text-xs text-muted hover:text-brand">Pipeline</Link>
          </div>
          <div className="space-y-3.5">
            {SYSTEMS.map((s) => {
              const list = tasks.filter((t) => t.system === s.id);
              if (!list.length) return null;
              const d = list.filter((t) => t.status === "done").length;
              return (
                <button key={s.id} onClick={() => setFilters({ system: s.id })} className="block w-full text-left" title="Filter by this system">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <SystemTag id={s.id} compact />
                    <span className="text-xs tabular-nums text-muted">{d}/{list.length}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full" style={{ width: `${(d / list.length) * 100}%`, background: s.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function RequestRow({ t, today, onOpen }: { t: Task; today: string; onOpen: () => void }) {
  const done = t.status === "done";
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#FAFAFB]">
      <input
        type="checkbox"
        checked={done}
        onChange={() => actions.update(t.id, { status: done ? "todo" : "done" })}
        className="h-4 w-4 shrink-0 accent-[#10B981]"
        aria-label={`Mark ${t.title} ${done ? "not done" : "done"}`}
      />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-sm font-medium ${done ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <SystemTag id={t.system} compact />
          <ChecklistBadge task={t} />
        </span>
      </button>
      <span className="hidden sm:block"><PriorityFlag id={t.priority} /></span>
      <StatusPill id={t.status} />
      <span className="hidden w-16 text-right sm:block"><DueLabel task={t} today={today} /></span>
      <Avatar name={t.owner} />
    </li>
  );
}
