"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { actions, can, systemOf, useStore } from "@/lib/store";
import { ROLES, type System, type Task } from "@/lib/types";
import { Avatar } from "./bits";
import { BrandStrip, PartnerLockup } from "./brand";
import { Dialog, FormError, inputCls, labelCls, primaryBtn, secondaryBtn } from "./Dialog";
import { SystemDialog } from "./SystemDialog";
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
  { href: "/team", label: "Team", icon: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-4.9" },
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
  const { me, hydrated, error } = useStore();
  if (!hydrated || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <PartnerLockup height={40} />
          {hydrated && error ? (
            <>
              <p className="text-sm text-[#C2343A]">{error}</p>
              <button onClick={() => actions.reload()} className="text-sm font-medium text-brand hover:underline">Try again</button>
            </>
          ) : (
            <p className="text-sm text-faint">Loading the plan...</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <UIProvider>
      <div className="flex min-h-screen bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <MobileTopBar />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-5">
            <SyncError />
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
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
  const { tasks, systems, me } = useStore();
  const { filters, setFilters } = useUI();
  const [dialog, setDialog] = useState<null | { system?: System }>(null);
  const open = (id: string) => tasks.filter((t) => t.system === id && t.status !== "done").length;
  const canEdit = can(me, "member");

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <BrandStrip />
      <div className="border-b border-line px-4 pb-4 pt-5">
        <PartnerLockup height={34} />
        <div className="mt-3 text-sm font-semibold text-ink">Strategy System</div>
        <div className="text-xs text-muted">Growth Partnership · KSA</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-1 mt-3 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Systems</span>
          {canEdit ? (
            <button onClick={() => setDialog({})} className="rounded px-1.5 text-base leading-none text-faint hover:bg-subtle hover:text-brand" title="Add a system" aria-label="Add a system">
              +
            </button>
          ) : null}
        </div>
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
        {systems.map((s) => {
          const on = filters.system === s.id;
          return (
            <div key={s.id} className={`group flex items-center rounded-md ${on ? "bg-brand-soft" : "hover:bg-subtle"}`}>
              <button
                onClick={() => setFilters({ system: on ? "all" : s.id })}
                className={`flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left text-sm ${on ? "font-medium text-brand-dark" : "text-ink"}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
              </button>
              {canEdit ? (
                <button
                  onClick={() => setDialog({ system: s })}
                  className="hidden px-1.5 text-faint hover:text-brand group-hover:block"
                  title={`Edit ${s.name}`}
                  aria-label={`Edit ${s.name}`}
                >
                  <Icon d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" size={13} />
                </button>
              ) : null}
              <span className="w-7 pr-2 text-right text-xs tabular-nums text-faint group-hover:hidden">{open(s.id) || ""}</span>
            </div>
          );
        })}
        {canEdit ? (
          <button onClick={() => setDialog({})} className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-faint hover:bg-subtle hover:text-brand">
            + Add system
          </button>
        ) : null}
      </div>
      {can(me, "admin") ? <DataMenu /> : null}
      <AccountMenu />
      {dialog ? (
        <SystemDialog system={dialog.system} onClose={() => setDialog(null)} onCreated={(s) => setFilters({ system: s.id })} />
      ) : null}
    </aside>
  );
}

function TopBar() {
  const path = usePathname();
  const { filters, setFilters, openNew } = useUI();
  const { tasks, users, teams, me } = useStore();
  const tags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();
  const title = filters.system === "all" ? "All systems" : systemOf(filters.system).name;
  const select = "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none hover:border-line-strong focus:border-brand";
  const filtered = filters.query || filters.assignee || filters.team || filters.tag || filters.system !== "all";

  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-surface md:block">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 md:px-8">
        <div className="mr-auto min-w-0">
          <div className="text-xs text-muted">Wall Street English × Clicksalesmedia / Strategy System</div>
          <h1 className="flex items-center gap-2 truncate text-xl font-semibold text-ink">
            {filters.system !== "all" ? <span className="h-3 w-3 rounded" style={{ background: systemOf(filters.system).color }} /> : null}
            {path.startsWith("/team") ? "Team" : title}
          </h1>
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

      {path.startsWith("/team") ? null : (
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
          <select value={filters.assignee} onChange={(e) => setFilters({ assignee: e.target.value })} className={select} aria-label="Filter by assignee">
            <option value="">All assignees</option>
            {me ? <option value={me.id}>Assigned to me</option> : null}
            <option value="none">Unassigned</option>
            {users.filter((u) => u.active && u.id !== me?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={filters.team} onChange={(e) => setFilters({ team: e.target.value })} className={select} aria-label="Filter by team">
            <option value="">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.tag} onChange={(e) => setFilters({ tag: e.target.value })} className={select} aria-label="Filter by tag">
            <option value="">All tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {filtered ? (
            <button onClick={() => setFilters({ query: "", assignee: "", team: "", tag: "", system: "all" })} className="text-sm text-muted hover:text-ink">
              Clear filters
            </button>
          ) : null}
          {can(me, "member") ? (
            <button
              onClick={() => openNew(filters.system !== "all" ? { system: filters.system } : undefined)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
            >
              <span className="text-base leading-none">+</span> Add task
            </button>
          ) : (
            <span className="ml-auto rounded-md bg-subtle px-2 py-1 text-xs text-muted">View only</span>
          )}
        </div>
      )}
    </header>
  );
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { me, teams } = useStore();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  if (!me) return null;
  const team = teams.find((t) => t.id === me.team);
  const role = ROLES.find((r) => r.id === me.role)?.label;

  return (
    <div ref={ref} className={compact ? "relative" : "relative border-t border-line p-3"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={compact ? "rounded-full" : "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-subtle"}
        aria-label="Account"
      >
        <Avatar name={me.name} size={compact ? 30 : 28} />
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{me.name}</span>
            <span className="block truncate text-xs text-muted">
              {role}
              {team ? ` · ${team.name}` : ""}
            </span>
          </span>
        )}
      </button>
      {open ? (
        <div className={`absolute z-40 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-xl ${compact ? "right-0 top-full mt-2" : "bottom-full left-3 mb-2"}`}>
          <div className="truncate px-3 py-2 text-xs text-muted">{me.email}</div>
          <div className="my-1 border-t border-line" />
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-subtle" onClick={() => { setPwOpen(true); setOpen(false); }}>
            Change password
          </button>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-subtle" onClick={() => actions.logout()}>
            Sign out
          </button>
        </div>
      ) : null}
      {pwOpen ? <PasswordDialog onClose={() => setPwOpen(false)} /> : null}
    </div>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Change password" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-ink">Your password was changed.</p>
          <div className="flex justify-end">
            <button className={primaryBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await actions.changePassword(current, next);
              setDone(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not change the password");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label className={labelCls} htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="pw-next">New password (at least 10 characters)</label>
            <input id="pw-next" type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={primaryBtn} disabled={busy || !current || next.length < 10}>Change password</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Admin plan actions, shown in the sidebar dropdown on desktop and in the More sheet on phones. */
function DataActions({ onDone }: { onDone: () => void }) {
  const { tasks } = useStore();
  const [confirm, setConfirm] = useState<null | "clear" | "reset">(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wse-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    onDone();
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Task[];
      if (Array.isArray(data)) actions.importTasks(data);
    } catch {
      alert("That file is not a valid plan export.");
    }
  };

  const item = "w-full rounded-md px-3 py-2.5 text-left text-sm text-ink hover:bg-subtle md:py-2";

  return (
    <>
      {confirm ? (
        <div className="p-2 text-sm">
          <p className="mb-3 text-ink">
            {confirm === "clear" ? "Remove every task for everyone and start an empty plan?" : "Replace everyone\u2019s plan with the starting plan?"}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-[#E5484D] px-3 py-1.5 text-white"
              onClick={() => {
                if (confirm === "clear") actions.clearAll();
                else actions.resetPlan();
                setConfirm(null);
                onDone();
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
          onDone();
        }}
      />
    </>
  );
}

function DataMenu() {
  const { tasks } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative border-t border-line px-3 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted hover:bg-subtle hover:text-ink"
      >
        <span>{tasks.length} tasks · Data</span>
        <span className="text-faint">⋯</span>
      </button>
      {open ? (
        <div className="absolute bottom-full left-3 z-40 mb-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <DataActions onDone={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- phone chrome ---------------- */

const MOBILE_TABS = ["/", "/table", "/kanban", "/calendar"];
const MORE_ICON = "M5 12h.01M12 12h.01M19 12h.01";
const FILTER_ICON = "M4 6h16M7 12h10M10 18h4";

/** Bottom sheet for phones: slides up from the bottom edge. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // rendered on <body>: the phone top bar uses backdrop-blur, which would trap a fixed overlay inside it
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-[#0f172a]/30 md:hidden" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm font-medium text-brand">Done</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function activeFilterCount(f: { query: string; system: string; assignee: string; team: string; tag: string }) {
  return [f.query, f.system !== "all" ? f.system : "", f.assignee, f.team, f.tag].filter(Boolean).length;
}

function MobileTopBar() {
  const path = usePathname();
  const { filters } = useUI();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const view = VIEWS.find((v) => isActive(path, v.href));
  const onTeam = path.startsWith("/team");
  const title = onTeam ? "Team" : filters.system === "all" ? "All systems" : systemOf(filters.system).name;
  const count = activeFilterCount(filters);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur md:hidden">
      <BrandStrip />
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <PartnerLockup height={24} />
            <span className="ml-1 truncate">{onTeam ? "Workspace" : view?.label}</span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 truncate text-lg font-semibold leading-tight text-ink">
            {!onTeam && filters.system !== "all" ? <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ background: systemOf(filters.system).color }} /> : null}
            <span className="truncate">{title}</span>
          </h1>
        </div>
        {onTeam ? null : (
          <button
            onClick={() => setFiltersOpen(true)}
            className={`relative flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm ${count ? "border-brand bg-brand-soft text-brand-dark" : "border-line text-ink"}`}
            aria-label="Filters"
          >
            <Icon d={FILTER_ICON} />
            {count ? <span className="tabular-nums">{count}</span> : null}
          </button>
        )}
        <AccountMenu compact />
      </div>
      {filtersOpen ? <FilterSheet onClose={() => setFiltersOpen(false)} /> : null}
    </header>
  );
}

function FilterSheet({ onClose }: { onClose: () => void }) {
  const { filters, setFilters } = useUI();
  const { tasks, users, teams, systems, me } = useStore();
  const [addingSystem, setAddingSystem] = useState(false);
  const tags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();
  const field = "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-medium text-muted";

  return (
    <Sheet title="Filters" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={label} htmlFor="m-search">Search</label>
          <input id="m-search" value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} placeholder="Search tasks" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="m-system">System</label>
          <div className="flex gap-2">
            <select id="m-system" value={filters.system} onChange={(e) => setFilters({ system: e.target.value })} className={field}>
              <option value="all">All systems</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {can(me, "member") ? (
              <button onClick={() => setAddingSystem(true)} className="shrink-0 rounded-lg border border-line px-3 text-sm text-muted">
                + New
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="m-assignee">Assignee</label>
          <select id="m-assignee" value={filters.assignee} onChange={(e) => setFilters({ assignee: e.target.value })} className={field}>
            <option value="">All assignees</option>
            {me ? <option value={me.id}>Assigned to me</option> : null}
            <option value="none">Unassigned</option>
            {users.filter((u) => u.active && u.id !== me?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label} htmlFor="m-team">Team</label>
            <select id="m-team" value={filters.team} onChange={(e) => setFilters({ team: e.target.value })} className={field}>
              <option value="">All teams</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="m-tag">Tag</label>
            <select id="m-tag" value={filters.tag} onChange={(e) => setFilters({ tag: e.target.value })} className={field}>
              <option value="">All tags</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {activeFilterCount(filters) ? (
          <button onClick={() => setFilters({ query: "", assignee: "", team: "", tag: "", system: "all" })} className="w-full rounded-lg border border-line py-2.5 text-sm text-ink">
            Clear all filters
          </button>
        ) : null}
      </div>
      {addingSystem ? (
        <SystemDialog
          onClose={() => setAddingSystem(false)}
          onCreated={(s) => {
            setFilters({ system: s.id });
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}

function MobileNav() {
  const path = usePathname();
  const { me } = useStore();
  const { openNew, filters } = useUI();
  const [more, setMore] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [addingSystem, setAddingSystem] = useState(false);
  const { setFilters } = useUI();
  const tabs = VIEWS.filter((v) => MOBILE_TABS.includes(v.href));
  const moreViews = VIEWS.filter((v) => !MOBILE_TABS.includes(v.href));
  const moreActive = moreViews.some((v) => isActive(path, v.href));

  return (
    <>
      {can(me, "member") && !path.startsWith("/team") ? (
        <button
          onClick={() => openNew(filters.system !== "all" ? { system: filters.system } : undefined)}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl font-light leading-none text-white shadow-lg shadow-brand/30 active:scale-95 md:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
          aria-label="Add task"
        >
          +
        </button>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Views"
      >
        {tabs.map((v) => {
          const on = isActive(path, v.href);
          return (
            <Link key={v.href} href={v.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "font-semibold text-brand" : "text-muted"}`}>
              <Icon d={v.icon} size={20} />
              {v.label}
            </Link>
          );
        })}
        <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${moreActive ? "font-semibold text-brand" : "text-muted"}`}>
          <Icon d={MORE_ICON} size={20} />
          More
        </button>
      </nav>

      {more ? (
        <Sheet title="More" onClose={() => { setMore(false); setDataOpen(false); }}>
          <div className="grid grid-cols-2 gap-2">
            {moreViews.map((v) => {
              const on = isActive(path, v.href);
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  onClick={() => setMore(false)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm ${on ? "border-brand bg-brand-soft font-medium text-brand-dark" : "border-line text-ink"}`}
                >
                  <Icon d={v.icon} size={18} />
                  {v.label}
                </Link>
              );
            })}
          </div>
          {can(me, "member") ? (
            <button onClick={() => setAddingSystem(true)} className="mt-3 w-full rounded-xl border border-dashed border-line-strong py-3 text-sm text-muted">
              + Add a system
            </button>
          ) : null}
          {can(me, "admin") ? (
            <div className="mt-4">
              <button onClick={() => setDataOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl bg-subtle px-3 py-3 text-sm text-ink">
                Plan data (admin)
                <span className="text-faint">{dataOpen ? "▾" : "▸"}</span>
              </button>
              {dataOpen ? (
                <div className="mt-1">
                  <DataActions onDone={() => { setMore(false); setDataOpen(false); }} />
                </div>
              ) : null}
            </div>
          ) : null}
        </Sheet>
      ) : null}
      {addingSystem ? (
        <SystemDialog
          onClose={() => setAddingSystem(false)}
          onCreated={(s) => {
            setFilters({ system: s.id });
            setMore(false);
          }}
        />
      ) : null}
    </>
  );
}
