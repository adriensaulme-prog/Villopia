import { traduire, type Locale } from "@/lib/i18n/dictionaries";
import { CATALOGUE_BATIMENTS, catalogueParSeuil } from "@/lib/game/monuments";
import { seuilEffectif } from "@/lib/game/classementPays";
import { EMOJI_ACTIVITE } from "@/components/JaugesActivites";
import { cleDe } from "@/lib/ville3d/emplacements";
import { placesMonuments } from "@/lib/ville3d/monumentsVille";
import { placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { BoutonVoirOu } from "./BoutonVoirOu";

/**
 * Catalogue des monuments et des mégaprojets (docs/A-INTEGRER.md §19, §25
 * et §41) : les 34 entrées dans l'ordre où elles se débloquent, chacune
 * débloquée ou verrouillée (avec son seuil), et pour chaque entrée débloquée
 * un bouton « Voir où il est » qui amène la caméra 3D dessus. Tout se
 * débloque tout seul selon le record d'influence : pas de choix, pas de
 * financement (le panneau « Mégaprojets du maire » n'existe plus).
 *
 * `cleVille` : la graine de la ville dessinée (son id), pour retrouver
 * l'emplacement exact — même fonction que celle du rendu 3D, donc jamais de
 * décalage. `paliersDebloques` : les identifiants de palier (0 à 33) de la
 * table `monuments` de cette ville.
 */
export function Monuments({
  locale,
  cleVille,
  paliersDebloques,
  influenceMax,
  reductionSeuil = 0,
}: {
  locale: Locale;
  cleVille: string;
  paliersDebloques: readonly number[];
  influenceMax: number;
  /** A-INTEGRER §47/§48 : part (0 à 1) retirée des seuils par le pays (Technologie n°1, Avance technologique). */
  reductionSeuil?: number;
}) {
  const cle = cleDe(cleVille);
  const debloques = new Set(paliersDebloques);
  // La place n'est calculée que pour ce qui est débloqué : les monuments sont sur une parcelle de
  // façade des premiers blocs (§33, §49 B), les mégaprojets à la bordure de la ville (§37).
  const placesMon = placesMonuments(
    cle,
    CATALOGUE_BATIMENTS.filter((e) => e.famille === "monument" && debloques.has(e.palier)).map((e) => e.palier)
  );
  const placesMega = placesMegaprojets(
    cle,
    CATALOGUE_BATIMENTS.filter((e) => e.famille === "megaprojet" && debloques.has(e.palier)).map((e) => e.palier)
  );
  const nf = new Intl.NumberFormat(locale);
  const ordre = catalogueParSeuil();
  const prochain = ordre.find((e) => !debloques.has(e.palier));
  return (
    <details className="note catalogue-monuments">
      <summary>
        <b>{traduire(locale, "monument.titre")}</b> · {ordre.filter((e) => debloques.has(e.palier)).length}/{ordre.length}
      </summary>
      <ul className="catalogue-liste">
        {ordre.map((entree) => {
          const nom =
            entree.famille === "monument"
              ? traduire(locale, `monument.type.${entree.type}` as never)
              : traduire(locale, `megaprojet.type.${entree.type}` as never);
          const emoji = entree.activite ? `${EMOJI_ACTIVITE[entree.activite]} ` : "";
          if (debloques.has(entree.palier)) {
            const place = (entree.famille === "monument" ? placesMon : placesMega).get(entree.palier);
            return (
              <li key={entree.palier} className="debloque">
                <span>
                  ✓ {emoji}
                  {nom}
                </span>
                {place ? (
                  <BoutonVoirOu
                    x={place.x}
                    z={place.z}
                    libelle={traduire(locale, "monument.voir")}
                    titre={`${traduire(locale, "monument.voir")} : ${nom}`}
                  />
                ) : null}
              </li>
            );
          }
          return (
            <li key={entree.palier} className="verrouille">
              <span>
                🔒 {emoji}
                {nom}
              </span>
              <span>
                {prochain?.palier === entree.palier ? `${nf.format(influenceMax)} / ` : ""}
                {nf.format(seuilEffectif(entree.seuil, reductionSeuil))} {traduire(locale, "monument.influence")}
                {reductionSeuil > 0 ? ` (${new Intl.NumberFormat(locale, { style: "percent" }).format(-reductionSeuil)})` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
