"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError, inputCls, labelCls } from "@/components/Dialog";

// First admin account. Only works while there are no accounts, and needs the setup key (APP_PASSWORD).
export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<null | { needed: boolean; configured: boolean }>(null);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ needed: false, configured: false }));
  }, []);

  if (!status) return <p className="text-center text-sm text-faint">Checking...</p>;
  if (!status.needed) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-lg font-semibold text-ink">Setup is done</h1>
        <p className="text-sm text-muted">The first admin already exists.</p>
        <Link href="/login" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Go to sign in</Link>
      </div>
    );
  }
  if (!status.configured) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-ink">Setup is locked</h1>
        <p className="text-sm text-muted">Set the APP_PASSWORD environment variable on the server (it is the setup key), redeploy, then come back here.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/auth/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, name, email, password }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Setup failed");
          router.replace("/team");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Setup failed");
          setBusy(false);
        }
      }}
    >
      <div>
        <h1 className="text-lg font-semibold text-ink">Create the first admin</h1>
        <p className="mt-1 text-xs text-muted">This page works once. After that, admins invite everyone else from the Team page.</p>
      </div>
      <div>
        <label className={labelCls} htmlFor="key">Setup key (the APP_PASSWORD value)</label>
        <input id="key" type="password" autoComplete="off" className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="name">Your full name</label>
        <input id="name" autoComplete="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="password">Password (at least 10 characters)</label>
        <input id="password" type="password" autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={busy || !key || !name || !email || password.length < 10} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
        {busy ? "Creating..." : "Create admin account"}
      </button>
    </form>
  );
}
