"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header({
  title,
  onRefresh,
  refreshing,
}: {
  title: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Haushalt</p>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={onRefresh}
              aria-label="Aktualisieren"
              title="Aktualisieren"
            >
              <span className={refreshing ? "inline-block animate-spin" : ""}>↻</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={logout}
            disabled={loggingOut}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
