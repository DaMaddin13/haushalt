"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Passwort ungültig.");
        return;
      }
      router.push("/aufgaben");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-accent">Willkommen</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Haushalt</h1>
        <p className="mt-2 text-muted">Gemeinsam Aufgaben, Budget und Einkauf im Blick.</p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 shadow-sm">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Passwort</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Haushalt-Passwort"
            required
            autoFocus
          />
        </label>
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Prüfe…" : "Einloggen"}
        </button>
      </form>
    </main>
  );
}
