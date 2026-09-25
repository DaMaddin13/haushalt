"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/aufgaben", label: "Aufgaben" },
  { href: "/budget", label: "Budget" },
  { href: "/einkauf", label: "Einkauf" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-sm font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span
                  className={`h-1 w-8 rounded-full ${active ? "bg-accent" : "bg-transparent"}`}
                  aria-hidden
                />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
