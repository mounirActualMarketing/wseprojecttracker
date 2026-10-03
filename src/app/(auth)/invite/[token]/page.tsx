"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError, inputCls, labelCls } from "@/components/Dialog";

// Invite and password-reset links: the person sets their own password and is signed in.
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<null | { name: string; email: string } | { error: string }>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/invite/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setInvite)
      .catch(() => setInvite({ error: "Could not check this link." }));
  }, [token]);

  if (!invite) return <p className="text-center text-sm text-faint">Checking your link...</p>;
  if ("error" in invite) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-lg font-semibold text-ink">Link not valid</h1>
        <p className="text-sm text-muted">{invite.error}</p>
        <Link href="/login" className="text-sm font-medium text-brand hover:underline">Go to sign in</Link>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Could not set the password");
          router.replace("/");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not set the password");
          setBusy(false);
        }
      }}
    >
      <div>
        <h1 className="text-lg font-semibold text-ink">Welcome, {invite.name.split(" ")[0]}</h1>
        <p className="mt-1 text-xs text-muted">Choose a password for {invite.email}.</p>
      </div>
      <div>
        <label className={labelCls} htmlFor="password">Password (at least 10 characters)</label>
        <input id="password" type="password" autoComplete="new-password" autoFocus className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="confirm">Repeat the password</label>
        <input id="confirm" type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {mismatch ? <p className="mt-1 text-xs text-[#D93F45]">The passwords do not match.</p> : null}
      </div>
      <FormError message={error} />
      <button type="submit" disabled={busy || password.length < 10 || password !== confirm} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
        {busy ? "Saving..." : "Set password and sign in"}
      </button>
    </form>
  );
}
