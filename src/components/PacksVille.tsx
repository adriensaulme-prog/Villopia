"use client";

import Link from "next/link";
import { traduire, type Locale } from "@/lib/i18n/dictionaries";
import { fichePack, type PackJoueur } from "@/lib/game/themes";
import { useChoixTheme } from "./ChoixTheme";
import { PastillesPalette } from "./PastillesPalette";

/**
 * Section « Thèmes de la ville » de Ma ville (docs/A-INTEGRER.md §30, surface 1) :
 * un rappel et une gestion rapide, pas le catalogue. Repliée par défaut, comme les
 * autres catalogues du panneau (Mégaprojets, Technologies, Monuments) : elle ne
 * prend pas la place du reste de Ma ville. Elle montre les packs que le joueur
 * POSSÈDE, celui qui est appliqué, et change de thème sans quitter la page. Les
 * packs qu'il ne possède pas, leurs aperçus et l'achat sont dans la Boutique.
 */
export function PacksVille({
  locale,
  villeId,
  themeApplique,
  packs,
}: {
  locale: Locale;
  villeId: string;
  themeApplique: string;
  packs: PackJoueur[];
}) {
  const { applique, erreur, enCours, appliquer } = useChoixTheme(villeId, themeApplique);
  const possedes = packs.filter((p) => p.possede);
  // Le thème appliqué est toujours affiché, même si le droit de l'utiliser a disparu depuis.
  const affiches = packs.filter((p) => p.possede || p.id === applique);
  const ficheApplique = fichePack(applique);
  const nomApplique = ficheApplique ? traduire(locale, `theme.${ficheApplique.id}`) : applique;

  return (
    <details className="note catalogue-monuments packs-ville">
      <summary>
        <b>{traduire(locale, "packs.titre")}</b> · {nomApplique}
      </summary>
      <p className="note packs-explication">{traduire(locale, "packs.explication")}</p>
      <ul className="catalogue-liste packs-liste-compacte">
        {affiches.map((pack) => {
          const fiche = fichePack(pack.id);
          if (!fiche) return null;
          const nom = traduire(locale, `theme.${pack.id}`);
          const estApplique = pack.id === applique;
          return (
            <li key={pack.id} className={estApplique ? "debloque" : undefined}>
              <span className="pack-nom">
                <PastillesPalette palette={fiche.palette} />
                {nom}
              </span>
              {estApplique ? (
                <span className="badge good">{traduire(locale, "packs.applique")}</span>
              ) : (
                <button
                  type="button"
                  className="btn small"
                  disabled={enCours}
                  aria-label={`${traduire(locale, "theme.appliquer")} : ${nom}`}
                  onClick={() => appliquer(pack.id)}
                >
                  {traduire(locale, "theme.appliquer")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {erreur ? (
        <p className="note pack-erreur" role="alert">
          {traduire(locale, "packs.erreur")}
        </p>
      ) : null}
      <p className="note">
        {possedes.length}/{packs.length} {traduire(locale, "packs.possedes")} ·{" "}
        <Link href="/boutique" style={{ color: "var(--focus)" }}>
          {traduire(locale, "packs.voirBoutique")} →
        </Link>
      </p>
    </details>
  );
}
