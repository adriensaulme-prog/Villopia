import Link from "next/link";
import { traduire, type DictionaryKey, type Locale } from "@/lib/i18n/dictionaries";
import { CATEGORIES_RESSOURCE, type CoutDeveloppement, type StockRessources } from "@/lib/game/developpements";
import { LABEL_CATEGORIE, ONGLETS_PAYS, type OngletPays } from "./types";

const LABEL_ONGLET: Record<OngletPays, DictionaryKey> = {
  semaine: "pays.onglet.semaine",
  classement: "pays.onglet.classement",
  developpement: "pays.onglet.developpement",
  pays: "pays.onglet.pays",
  historique: "pays.onglet.historique",
};

/** Adresse d'un onglet de /pays, en gardant le pays consulté (l'onglet par défaut n'apparaît pas dans l'adresse). */
export function hrefOnglet(onglet: OngletPays, paysConsulte: string | null): string {
  const params = new URLSearchParams();
  if (paysConsulte) params.set("pays", paysConsulte);
  if (onglet !== "semaine") params.set("onglet", onglet);
  const q = params.toString();
  return q ? `/pays?${q}` : "/pays";
}

/** Barre d'onglets de /pays : de simples liens, la page se rend côté serveur (comme /classement). */
export function SousOnglets({
  locale,
  actif,
  paysConsulte,
}: {
  locale: Locale;
  actif: OngletPays;
  /** Code du pays consulté si ce n'est pas celui du joueur (sinon null). */
  paysConsulte: string | null;
}) {
  return (
    <nav className="sous-onglets" aria-label={traduire(locale, "pays.eyebrow")}>
      {ONGLETS_PAYS.map((o) => (
        <Link
          key={o}
          href={hrefOnglet(o, paysConsulte)}
          className="sous-onglet"
          aria-current={o === actif ? "page" : undefined}
        >
          {traduire(locale, LABEL_ONGLET[o])}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Coût d'un développement, une puce par catégorie réellement demandée. Avec un stock, chaque puce
 * dit si ce stock couvre la catégorie (verte) ou non (rouge, avec ce qui manque).
 */
export function PucesCout({
  locale,
  cout,
  stock,
}: {
  locale: Locale;
  cout: CoutDeveloppement;
  stock?: StockRessources | null;
}) {
  return (
    <span className="puces-cout">
      {CATEGORIES_RESSOURCE.filter((c) => cout[c] > 0).map((c) => {
        const couvert = stock ? (stock[c] ?? 0) >= cout[c] : null;
        return (
          <span
            key={c}
            className={`puce-cout${couvert === null ? "" : couvert ? " ok" : " manque"}`}
            title={
              stock && couvert === false
                ? `${traduire(locale, "pays.devVote.manque")} ${cout[c] - Math.max(0, stock[c] ?? 0)}`
                : undefined
            }
          >
            <b>{cout[c]}</b> {traduire(locale, LABEL_CATEGORIE[c])}
          </span>
        );
      })}
    </span>
  );
}
