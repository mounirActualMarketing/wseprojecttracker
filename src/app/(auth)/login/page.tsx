"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FormError, inputCls, labelCls } from "@/components/Dialog";

/** Only same-site paths are allowed after sign-in. */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d: { needed: boolean }) => setSetupNeeded(d.needed))
      .catch(() => {});
  }, []);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Could not sign in");
          window.location.href = nextPath();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not sign in");
          setBusy(false);
        }
      }}
    >
      <h1 className="text-lg font-semibold text-ink">Sign in</h1>
      {setupNeeded ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          No accounts yet. <Link href="/setup" className="font-medium underline">Create the first admin</Link>.
        </p>
      ) : null}
      <div>
        <label className={labelCls} htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" autoFocus className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={busy || !email || !password} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-xs text-muted">Forgot your password? Ask an admin for a reset link.</p>
    </form>
  );
}
