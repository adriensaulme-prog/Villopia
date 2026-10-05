import { traduire, type Locale } from "@/lib/i18n/dictionaries";
import { FAMILLES_BATIMENT, type EtatPack, type FichePack, type PackJoueur } from "@/lib/game/themes";
import { PastillesPalette } from "./PastillesPalette";

/** Une fiche de pack. Présentationnelle : l'état arrive tout calculé, les actions sont des rappels. */
export function CartePack({
  locale,
  pack,
  fiche,
  etat,
  enApercu,
  occupe,
  onApercu,
  onAppliquer,
}: {
  locale: Locale;
  pack: PackJoueur;
  fiche: FichePack;
  etat: EtatPack;
  enApercu: boolean;
  occupe: boolean;
  onApercu: () => void;
  onAppliquer: () => void;
}) {
  const nom = traduire(locale, `theme.${fiche.id}`);
  const couvreTout = FAMILLES_BATIMENT.every((f) => fiche.familles.includes(f));
  const modeles = fiche.familles.map((f) => traduire(locale, `boutique.famille.${f}`)).join(", ");

  return (
    <li className={`pack-carte${etat === "applique" ? " applique" : ""}${etat === "a_obtenir" ? " verrouille" : ""}`}>
      <div className="pack-tete">
        <PastillesPalette palette={fiche.palette} />
        <h3 className="h3">{nom}</h3>
        {etat === "applique" ? <span className="badge good">{traduire(locale, "boutique.applique")}</span> : null}
        {etat === "possede" ? <span className="badge">{traduire(locale, "boutique.possede")}</span> : null}
        <span className="badge">{traduire(locale, pack.gratuit ? "boutique.gratuit" : "boutique.payant")}</span>
      </div>
      <p className="note">{traduire(locale, `theme.${fiche.id}.description`)}</p>
      <p className="note">
        {traduire(locale, "boutique.modelesDedies")} {modeles}.{" "}
        {couvreTout ? null : traduire(locale, "boutique.resteClassique")}
      </p>
      <div className="row pack-actions">
        {etat !== "applique" ? (
          <button
            type="button"
            className="btn small"
            aria-pressed={enApercu}
            aria-label={`${traduire(locale, "boutique.apercu")} : ${nom}`}
            onClick={onApercu}
          >
            {traduire(locale, "boutique.apercu")}
          </button>
        ) : null}
        {etat === "possede" ? (
          <button
            type="button"
            className="btn small primary"
            disabled={occupe}
            aria-label={`${traduire(locale, "theme.appliquer")} : ${nom}`}
            onClick={onAppliquer}
          >
            {traduire(locale, "theme.appliquer")}
          </button>
        ) : null}
        {etat === "a_obtenir" ? (
          <>
            <button
              type="button"
              className="btn small"
              disabled
              aria-label={`${traduire(locale, "boutique.acheter")} : ${nom}`}
              aria-describedby={`achat-${fiche.id}`}
            >
              {traduire(locale, "boutique.acheter")}
            </button>
            <span id={`achat-${fiche.id}`} className="note">
              {traduire(locale, "boutique.achatBientot")}
            </span>
          </>
        ) : null}
      </div>
    </li>
  );
}
