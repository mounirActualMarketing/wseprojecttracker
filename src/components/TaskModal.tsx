"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./bits";
import { actions, can, newId, useStore } from "@/lib/store";
import { shiftISO, todayISO } from "@/lib/dates";
import { PHASES, PRIORITIES, STATUSES, statusOf, tagStyle, type Task } from "@/lib/types";
import { useUI } from "./ui-context";

type Draft = Omit<Task, "id">;

const blank = (): Draft => {
  const today = todayISO();
  return {
    title: "",
    notes: "",
    system: "program",
    status: "todo",
    phase: "discovery",
    priority: "medium",
    team: null,
    assignees: [],
    start: today,
    due: shiftISO(today, 7),
    dependsOn: [],
    tags: [],
    checklist: [],
  };
};

export function TaskModal() {
  const { modal, closeModal } = useUI();
  if (!modal.open) return null;
  // key remounts the form so its state starts fresh for each task
  return <TaskDrawer key={modal.taskId ?? "new"} taskId={modal.taskId} defaults={modal.defaults} onClose={closeModal} />;
}

function TaskDrawer({ taskId, defaults, onClose }: { taskId: string | null; defaults?: Partial<Task>; onClose: () => void }) {
  const { tasks, systems, users, teams, me } = useStore();
  const readOnly = !can(me, "member");
  const existing = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const [form, setForm] = useState<Draft>(() => {
    if (existing) {
      const { id: _id, ...rest } = existing;
      void _id;
      return rest;
    }
    const b = { ...blank(), system: systems[0]?.id ?? "", team: me?.team ?? null, ...defaults };
    if (b.due < b.start) b.start = b.due;
    return b;
  });
  const [newItem, setNewItem] = useState("");
  const [newTag, setNewTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const people = users.filter((u) => u.active || form.assignees.includes(u.id));
  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));
  const others = tasks.filter((t) => t.id !== taskId);
  const valid = !readOnly && form.title.trim().length > 0 && form.start <= form.due && !!form.system;
  const doneCount = form.checklist.filter((c) => c.done).length;

  const save = () => {
    if (!valid) return;
    const clean = { ...form, title: form.title.trim() };
    if (existing) actions.update(existing.id, clean);
    else actions.add(clean);
    onClose();
  };

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    set("checklist", [...form.checklist, { id: newId(), text, done: false }]);
    setNewItem("");
  };
  const addTag = () => {
    const t = newTag.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setNewTag("");
  };

  const field =
    "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-base text-ink md:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
  const row = "grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3";
  const lbl = "text-xs font-medium text-muted";
  const st = statusOf(form.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0f172a]/30" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Edit task" : "New task"}
        className="flex h-full w-full max-w-[600px] flex-col bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <div className="flex items-center gap-2">
            <select
              disabled={readOnly}
              value={form.status}
              onChange={(e) => set("status", e.target.value as Task["status"])}
              className="rounded-md border-0 px-2 py-1 text-xs font-semibold uppercase tracking-wide outline-none"
              style={{ background: st.color, color: "#fff" }}
              aria-label="Status"
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-ink">
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => set("status", form.status === "done" ? "todo" : "done")}
              className={`rounded-md border px-2 py-1 text-xs font-medium ${form.status === "done" ? "border-[#10B981] bg-[#E6F8F1] text-[#047857]" : "border-line text-muted hover:border-line-strong hover:text-ink"}`}
            >
              ✓ {form.status === "done" ? "Completed" : "Mark complete"}
            </button>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form
          id="task-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5"
        >
          <fieldset disabled={readOnly} className="min-w-0 space-y-6">
          {readOnly ? <p className="rounded-lg bg-subtle px-3 py-2 text-xs text-muted">Your account is view only.</p> : null}
          <input
            autoFocus={!existing}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Task name"
            aria-label="Task name"
            className="w-full rounded-lg border border-transparent px-1 py-1 text-xl font-semibold text-ink outline-none placeholder:text-faint hover:border-line focus:border-brand"
          />

          <div className="space-y-2.5">
            <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3">
              <span className={`${lbl} pt-1.5`}>Assignees</span>
              <div className="flex flex-wrap gap-1.5">
                {people.length === 0 ? <span className="pt-1 text-xs text-faint">Invite people on the Team page first.</span> : null}
                {people.map((u) => {
                  const on = form.assignees.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => set("assignees", on ? form.assignees.filter((x) => x !== u.id) : [...form.assignees, u.id])}
                      className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs ${on ? "border-brand bg-brand-soft text-ink" : "border-line text-muted hover:border-line-strong"}`}
                      aria-pressed={on}
                    >
                      <Avatar name={u.name} size={20} />
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={row}>
              <label className={lbl} htmlFor="team">Team</label>
              <select id="team" className={field} value={form.team ?? ""} onChange={(e) => set("team", e.target.value || null)}>
                <option value="">No team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className={row}>
              <span className={lbl}>Dates</span>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input aria-label="Start date" type="date" className={`${field} min-w-[140px] flex-1`} value={form.start} onChange={(e) => e.target.value && set("start", e.target.value)} />
                <span className="text-faint">→</span>
                <input aria-label="Due date" type="date" className={`${field} min-w-[140px] flex-1`} value={form.due} onChange={(e) => e.target.value && set("due", e.target.value)} />
              </div>
            </div>
            {form.start > form.due ? <p className="pl-[122px] text-xs text-[#D93F45]">Due date is before the start date.</p> : null}
            <div className={row}>
              <span className={lbl}>Priority</span>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => set("priority", p.id)}
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${form.priority === p.id ? "border-brand bg-brand-soft text-ink" : "border-line text-muted hover:border-line-strong"}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={row}>
              <label className={lbl} htmlFor="system">System</label>
              <select id="system" className={field} value={form.system} onChange={(e) => set("system", e.target.value as Task["system"])}>
                {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className={row}>
              <label className={lbl} htmlFor="phase">Phase</label>
              <select id="phase" className={field} value={form.phase} onChange={(e) => set("phase", e.target.value as Task["phase"])}>
                {PHASES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className={row}>
              <span className={lbl}>Tags</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {form.tags.map((t) => {
                  const s = tagStyle(t);
                  return (
                    <span key={t} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium" style={{ background: s.bg, color: s.fg }}>
                      {t}
                      <button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", form.tags.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">
                        ×
                      </button>
                    </span>
                  );
                })}
                <input
                  list="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="Add tag"
                  className="w-28 rounded-md border border-dashed border-line px-2 py-0.5 text-xs outline-none focus:border-brand"
                />
                <datalist id="tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
            </div>
          </div>

          <section>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="notes">Description</label>
            <textarea
              id="notes"
              rows={3}
              className={field}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Add more detail"
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Checklist</h3>
              {form.checklist.length ? (
                <span className="text-xs tabular-nums text-muted">
                  {doneCount}/{form.checklist.length}
                </span>
              ) : null}
            </div>
            {form.checklist.length ? (
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-[#10B981] transition-all" style={{ width: `${(doneCount / form.checklist.length) * 100}%` }} />
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {form.checklist.map((c) => (
                <li key={c.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-subtle">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#7B68EE]"
                    checked={c.done}
                    onChange={() => set("checklist", form.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                    aria-label={c.text}
                  />
                  <span className={`flex-1 text-sm ${c.done ? "text-faint line-through" : "text-ink"}`}>{c.text}</span>
                  <button
                    type="button"
                    onClick={() => set("checklist", form.checklist.filter((x) => x.id !== c.id))}
                    className="text-xs text-faint opacity-0 hover:text-[#D93F45] group-hover:opacity-100"
                    aria-label={`Remove ${c.text}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add checklist item"
                className={field}
              />
              <button type="button" onClick={addItem} className="rounded-lg border border-line px-3 text-sm text-muted hover:bg-subtle hover:text-ink">
                Add
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink">Waiting on</h3>
            {others.length === 0 ? (
              <p className="text-sm text-faint">No other tasks yet.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-line p-1">
                {others.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-subtle">
                    <input
                      type="checkbox"
                      className="accent-[#7B68EE]"
                      checked={form.dependsOn.includes(o.id)}
                      onChange={(e) =>
                        set("dependsOn", e.target.checked ? [...form.dependsOn, o.id] : form.dependsOn.filter((d) => d !== o.id))
                      }
                    />
                    <span className="truncate">{o.title}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
          </fieldset>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3">
          <div>
            {existing && !readOnly ? (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Delete this task?</span>
                  <button type="button" onClick={() => { actions.remove(existing.id); onClose(); }} className="rounded-lg bg-[#E5484D] px-3 py-1.5 text-white">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-muted hover:text-ink">Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-[#D93F45] hover:underline">
                  Delete task
                </button>
              )
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-subtle">
              Cancel
            </button>
            <button type="submit" form="task-form" disabled={!valid} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
              {existing ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
