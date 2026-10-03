"use client";

import { useEffect } from "react";
import { PALETTE } from "@/lib/types";

/** Small centred dialog used for systems, teams, invites and passwords. */
export function Dialog({ title, onClose, children, width = "max-w-md" }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/30 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} rounded-xl bg-surface shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-subtle hover:text-ink" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
export const labelCls = "mb-1 block text-xs font-medium text-muted";
export const primaryBtn = "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40";
export const secondaryBtn = "rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-subtle";

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-md transition ${value === c ? "ring-2 ring-offset-2" : "hover:scale-110"}`}
          style={{ background: c, ["--tw-ring-color" as string]: c }}
          aria-label={`Colour ${c}`}
          aria-pressed={value === c}
        />
      ))}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#C2343A]">{message}</p> : null;
}
