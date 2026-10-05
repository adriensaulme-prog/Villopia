"use client";

import { traduire, type Locale } from "@/lib/i18n/dictionaries";
import { etatPack, fichePack, type PackJoueur } from "@/lib/game/themes";
import { CartePack } from "./CartePack";
import { useChoixTheme } from "./ChoixTheme";

/**
 * Catalogue de la Boutique (docs/A-INTEGRER.md §30, surface 2) : TOUS les packs,
 * possédés ou non, avec leur aperçu et le point d'entrée de l'achat.
 *
 * Un pack est purement cosmétique (docs/BATIMENTS-ET-PACKS.md §4) : la fiche ne
 * parle que d'apparence — jamais d'habitants, d'influence ni de défense.
 *
 * - Aperçu : le pack est dessiné sur LA ville du joueur dans la scène 3D de fond,
 *   sans rien enregistrer. Autorisé pour un pack non possédé, c'est son but.
 * - Appliquer : seulement pour un pack possédé (le serveur le refuse sinon).
 * - Acheter : bouton désactivé avec sa raison écrite, tant que le paiement n'est
 *   pas branché (statut légal à régler d'abord, BATIMENTS-ET-PACKS §5). C'est le
 *   seul endroit à brancher le jour venu.
 */
export function CatalogueBoutique({
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
  const { applique, apercu, erreur, enCours, appliquer, apercevoir, terminerApercu } = useChoixTheme(
    villeId,
    themeApplique
  );

  return (
    <>
      {apercu ? (
        <div className="pack-apercu" role="status">
          <span>
            <b>{traduire(locale, `theme.${apercu}`)}</b> —{" "}
            {traduire(locale, "boutique.apercuEnCours")}
          </span>
          <button type="button" className="btn small" onClick={terminerApercu}>
            {traduire(locale, "boutique.terminerApercu")}
          </button>
        </div>
      ) : null}
      {erreur ? (
        <p className="note pack-erreur" role="alert">
          {traduire(locale, "packs.erreur")}
        </p>
      ) : null}
      <ul className="packs-liste">
        {packs.map((pack) => {
          const fiche = fichePack(pack.id);
          if (!fiche) return null;
          return (
            <CartePack
              key={pack.id}
              locale={locale}
              pack={pack}
              fiche={fiche}
              etat={etatPack(pack, applique)}
              enApercu={apercu === pack.id}
              occupe={enCours}
              onApercu={() => apercevoir(pack.id)}
              onAppliquer={() => appliquer(pack.id)}
            />
          );
        })}
      </ul>
    </>
  );
}
