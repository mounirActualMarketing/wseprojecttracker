"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { actions, useStore } from "@/lib/store";
import { SYSTEMS, systemOf, type Task } from "@/lib/types";
import { BrandStrip, PartnerLockup } from "./brand";
import { TaskModal } from "./TaskModal";
import { UIProvider, useUI } from "./ui-context";

const VIEWS = [
  { href: "/", label: "Overview", icon: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { href: "/table", label: "Table", icon: "M3 5h18M3 12h18M3 19h18M8 5v14" },
  { href: "/pipeline", label: "Pipeline", icon: "M3 5h4v14H3zM10 5h4v10h-4zM17 5h4v6h-4z" },
  { href: "/kanban", label: "Kanban", icon: "M4 4h5v16H4zM10.5 4h5v11h-5zM17 4h3v7h-3z" },
  { href: "/flow", label: "Flowchart", icon: "M4 4h6v5H4zM14 15h6v5h-6zM7 9v4h10v2" },
  { href: "/planner", label: "Planner", icon: "M3 6h9M7 12h12M5 18h8" },
  { href: "/calendar", label: "Calendar", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
];

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <div className="flex min-h-screen bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 px-4 pb-10 pt-5 md:px-8">
            <SyncError />
            {children}
          </main>
        </div>
      </div>
      <TaskModal />
    </UIProvider>
  );
}

function SyncError() {
  const { error } = useStore();
  if (!error) return null;
  return (
    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#F5B5B7] bg-[#FDECEC] px-4 py-2.5 text-sm text-[#C2343A]">
      <span>{error}</span>
      <span className="flex shrink-0 gap-3">
        <button onClick={() => actions.reload()} className="font-medium hover:underline">Retry</button>
        <button onClick={() => actions.dismissError()} className="text-[#C2343A]/70 hover:text-[#C2343A]" aria-label="Dismiss">
          ✕
        </button>
      </span>
    </div>
  );
}

function Sidebar() {
  const { tasks } = useStore();
  const { filters, setFilters } = useUI();
  const open = (id: string) => tasks.filter((t) => t.system === id && t.status !== "done").length;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <BrandStrip />
      <div className="border-b border-line px-4 pb-4 pt-5">
        <PartnerLockup height={34} />
        <div className="mt-3 text-sm font-semibold text-ink">Strategy System</div>
        <div className="text-xs text-muted">Growth Partnership · KSA</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-1 mt-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Systems</div>
        <button
          onClick={() => setFilters({ system: "all" })}
          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${filters.system === "all" ? "bg-brand-soft font-medium text-brand-dark" : "text-ink hover:bg-subtle"}`}
        >
          <span className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-gradient-to-br from-[#7B68EE] to-[#4573D2]" />
            All systems
          </span>
          <span className="text-xs tabular-nums text-faint">{tasks.filter((t) => t.status !== "done").length}</span>
        </button>
        {SYSTEMS.map((s) => {
          const on = filters.system === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setFilters({ system: on ? "all" : s.id })}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${on ? "bg-brand-soft font-medium text-brand-dark" : "text-ink hover:bg-subtle"}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className="text-xs tabular-nums text-faint">{open(s.id) || ""}</span>
            </button>
          );
        })}
      </div>
      <DataMenu />
    </aside>
  );
}

function TopBar() {
  const path = usePathname();
  const { filters, setFilters, openNew } = useUI();
  const { tasks } = useStore();
  const owners = Array.from(new Set(tasks.map((t) => t.owner).filter(Boolean))).sort();
  const tags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();
  const title = filters.system === "all" ? "All systems" : systemOf(filters.system).name;
  const select = "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none hover:border-line-strong focus:border-brand";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <BrandStrip className="h-1 md:hidden" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 md:px-8">
        <div className="w-full md:hidden">
          <PartnerLockup height={26} />
        </div>
        <div className="mr-auto min-w-0">
          <div className="text-xs text-muted">Wall Street English × Clicksalesmedia / Strategy System</div>
          <h1 className="flex items-center gap-2 truncate text-xl font-semibold text-ink">
            {filters.system !== "all" ? <span className="h-3 w-3 rounded" style={{ background: systemOf(filters.system).color }} /> : null}
            {title}
          </h1>
        </div>
        <div className="md:hidden">
          <DataMenu compact />
        </div>
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto px-4 md:px-8" aria-label="Views">
        {VIEWS.map((v) => {
          const on = isActive(path, v.href);
          return (
            <Link
              key={v.href}
              href={v.href}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-2.5 pt-1 text-sm transition ${
                on ? "border-brand font-medium text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <span className={on ? "text-brand" : ""}>
                <Icon d={v.icon} />
              </span>
              {v.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface px-4 py-2.5 md:px-8">
        <div className="relative w-full sm:w-64">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder="Search tasks"
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-faint hover:border-line-strong focus:border-brand"
          />
        </div>
        <select value={filters.system} onChange={(e) => setFilters({ system: e.target.value as typeof filters.system })} className={`${select} md:hidden`} aria-label="Filter by system">
          <option value="all">All systems</option>
          {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}
        </select>
        <select value={filters.owner} onChange={(e) => setFilters({ owner: e.target.value })} className={select} aria-label="Filter by assignee">
          <option value="">All assignees</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.tag} onChange={(e) => setFilters({ tag: e.target.value })} className={select} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {filters.query || filters.owner || filters.tag || filters.system !== "all" ? (
          <button onClick={() => setFilters({ query: "", owner: "", tag: "", system: "all" })} className="text-sm text-muted hover:text-ink">
            Clear filters
          </button>
        ) : null}
        <button
          onClick={() => openNew(filters.system !== "all" ? { system: filters.system } : undefined)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
        >
          <span className="text-base leading-none">+</span> Add task
        </button>
      </div>
    </header>
  );
}

function DataMenu({ compact = false }: { compact?: boolean }) {
  const { tasks } = useStore();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "clear" | "reset">(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wse-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setOpen(false);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Task[];
      if (Array.isArray(data)) actions.importTasks(data);
    } catch {
      alert("That file is not a valid plan export.");
    }
  };

  const item = "w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-subtle";

  return (
    <div ref={boxRef} className={compact ? "relative" : "relative border-t border-line p-3"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? "rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink"
            : "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted hover:bg-subtle hover:text-ink"
        }
      >
        <span>{compact ? "Data" : `${tasks.length} tasks · Data`}</span>
        {compact ? null : <span className="text-faint">⋯</span>}
      </button>
      {open ? (
        <div className={`absolute z-40 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl ${compact ? "right-0 top-full mt-2" : "bottom-full left-3 mb-2"}`}>
          {confirm ? (
            <div className="p-2 text-sm">
              <p className="mb-3 text-ink">
                {confirm === "clear" ? "Remove every task for everyone and start an empty plan?" : "Replace everyone\u2019s plan with the starting plan?"}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-[#E5484D] px-3 py-1 text-white"
                  onClick={() => {
                    if (confirm === "clear") actions.clearAll();
                    else actions.resetPlan();
                    setConfirm(null);
                    setOpen(false);
                  }}
                >
                  Confirm
                </button>
                <button className="px-2 text-muted hover:text-ink" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className={item} onClick={exportJson}>Export JSON</button>
              <button className={item} onClick={() => fileRef.current?.click()}>Import JSON</button>
              <div className="my-1 border-t border-line" />
              <button className={item} onClick={() => setConfirm("reset")}>Reset to starting plan</button>
              <button className={`${item} text-[#D93F45]`} onClick={() => setConfirm("clear")}>Clear all tasks</button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
