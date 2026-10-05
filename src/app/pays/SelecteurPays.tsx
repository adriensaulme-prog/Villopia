"use client";

import { useRouter } from "next/navigation";
import { traduire, type Locale } from "@/lib/i18n/dictionaries";

export function SelecteurPays({
  locale,
  paysActuel,
  pays,
  onglet,
}: {
  locale: Locale;
  paysActuel: string;
  pays: { id: string; nom: string }[];
  /** Onglet affiché : on le garde en changeant de pays (l'onglet par défaut n'apparaît pas dans l'adresse). */
  onglet?: string;
}) {
  const router = useRouter();
  return (
    <select
      className="select"
      aria-label={traduire(locale, "pays.autrePays")}
      defaultValue={paysActuel}
      onChange={(e) => router.push(`/pays?pays=${e.target.value}${onglet && onglet !== "semaine" ? `&onglet=${onglet}` : ""}`)}
    >
      {pays.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nom}
        </option>
      ))}
    </select>
  );
}
