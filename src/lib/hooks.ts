"use client";

import useSWR, { type SWRConfiguration } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Nicht angemeldet");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Fehler ${res.status}`);
  }
  return res.json();
};

export function usePoll<T = unknown>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
    ...config,
  });
}

export { fetcher };
