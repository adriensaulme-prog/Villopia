"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/dictionaries";
import { traduire } from "@/lib/i18n/dictionaries";

/**
 * `secondaire` : onglet qui n'a pas sa place dans la barre du bas sur mobile (déjà pleine à
 * 5 onglets, docs/A-INTEGRER.md §30) — masqué là par `.tab-secondaire`, on y arrive depuis
 * la barre du haut. Sur ordinateur il est un onglet comme les autres, en dernier.
 */
const ONGLETS: { href: string; cle: "nav.maVille" | "nav.villes" | "nav.jumelages" | "nav.classement" | "nav.pays" | "nav.boutique"; secondaire?: boolean }[] = [
  { href: "/ville", cle: "nav.maVille" },
  { href: "/villes", cle: "nav.villes" },
  { href: "/jumelages", cle: "nav.jumelages" },
  { href: "/classement", cle: "nav.classement" },
  { href: "/pays", cle: "nav.pays" },
  { href: "/boutique", cle: "nav.boutique", secondaire: true },
];

export function NavTabs({ locale, className, tabClassName }: { locale: Locale; className: string; tabClassName: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label={traduire(locale, "nav.maVille")}>
      {ONGLETS.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={o.secondaire ? `${tabClassName} tab-secondaire` : tabClassName}
          aria-current={pathname === o.href ? "page" : undefined}
        >
          {traduire(locale, o.cle)}
        </Link>
      ))}
    </nav>
  );
}
