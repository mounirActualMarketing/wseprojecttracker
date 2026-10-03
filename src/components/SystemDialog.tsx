"use client";

import { useState } from "react";
import { actions, can, useStore } from "@/lib/store";
import { PALETTE, type System } from "@/lib/types";
import { ColorPicker, Dialog, FormError, inputCls, labelCls, primaryBtn, secondaryBtn } from "./Dialog";

/** Add a system, or edit / delete an existing one. */
export function SystemDialog({ system, onClose, onCreated }: { system?: System; onClose: () => void; onCreated?: (s: System) => void }) {
  const { systems, tasks, me } = useStore();
  const [name, setName] = useState(system?.name ?? "");
  const [short, setShort] = useState(system?.short ?? "");
  const [color, setColor] = useState(system?.color ?? PALETTE[systems.length % PALETTE.length]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const others = systems.filter((s) => s.id !== system?.id);
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const taskCount = system ? tasks.filter((t) => t.system === system.id).length : 0;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const data = { name: name.trim(), short: short.trim() || name.trim().slice(0, 30), color };
      if (system) await actions.updateSystem(system.id, data);
      else onCreated?.(await actions.addSystem(data));
    });

  return (
    <Dialog title={system ? "Edit system" : "Add a system"} onClose={onClose}>
      {deleting && system ? (
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Delete <b>{system.name}</b>?{" "}
            {taskCount ? `Its ${taskCount} task${taskCount === 1 ? "" : "s"} will move to another system.` : "It has no tasks."}
          </p>
          {taskCount ? (
            <div>
              <label className={labelCls} htmlFor="move-to">Move tasks to</label>
              <select id="move-to" className={inputCls} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {others.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ) : null}
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <button className={secondaryBtn} onClick={() => setDeleting(false)}>Cancel</button>
            <button
              disabled={busy || (taskCount > 0 && !moveTo)}
              onClick={() => run(() => actions.deleteSystem(system.id, taskCount ? moveTo : undefined))}
              className="rounded-lg bg-[#E5484D] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Delete system
            </button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save();
          }}
        >
          <div>
            <label className={labelCls} htmlFor="sys-name">Name</label>
            <input id="sys-name" autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: AI Email Marketing" />
          </div>
          <div>
            <label className={labelCls} htmlFor="sys-short">Short name (cards and filters)</label>
            <input id="sys-short" className={inputCls} value={short} onChange={(e) => setShort(e.target.value)} placeholder={name.slice(0, 30) || "Email"} />
          </div>
          <div>
            <span className={labelCls}>Colour</span>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <FormError message={error} />
          <div className="flex items-center justify-between gap-2 pt-1">
            {system && can(me, "admin") && others.length ? (
              <button type="button" onClick={() => setDeleting(true)} className="text-sm text-[#D93F45] hover:underline">
                Delete system
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
              <button type="submit" className={primaryBtn} disabled={busy || !name.trim()}>
                {system ? "Save" : "Add system"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
