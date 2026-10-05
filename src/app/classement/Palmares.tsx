import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { traduire } from "@/lib/i18n";
import type { DictionaryKey, Locale } from "@/lib/i18n/dictionaries";
import { ordinal } from "@/lib/game/ordinal";
import { depuisPourPeriode, type Periode } from "@/lib/game/periodePalmares";

const TAILLE_AFFICHEE = 50;

type Vue = "mondial" | "national" | "regional";

export interface ParamsPalmares {
  classement?: string;
  periode?: string;
  echelle?: string;
}
type TypeClassement =
  | "croissance"
  | "pertes"
  | "influence"
  | "visites"
  | "attaques"
  | "generosite"
  | "jumelages";

const TYPES: TypeClassement[] = [
  "croissance",
  "pertes",
  "influence",
  "visites",
  "attaques",
  "generosite",
  "jumelages",
];
const PERIODES: Periode[] = ["jour", "semaine", "mois", "toujours"];

type LigneVille = { ville_id: string; nom: string; valeur: number; rang: number };
type LigneJoueur = { joueur_id: string; pseudo: string; valeur: number; rang: number };
type LigneJumelage = {
  jumelage_id: string;
  ville_a_id: string;
  ville_a_nom: string;
  ville_b_id: string;
  ville_b_nom: string;
  valeur: number;
  rang: number;
};

const UNITE: Record<TypeClassement, DictionaryKey> = {
  croissance: "palmares.uniteHabitantsGagnes",
  pertes: "palmares.uniteHabitantsPerdus",
  influence: "palmares.uniteInfluence",
  visites: "palmares.uniteVisitesRecues",
  attaques: "palmares.uniteAttaques",
  generosite: "palmares.uniteVisitesDonnees",
  jumelages: "palmares.uniteJumelage",
};

const LABEL_TYPE: Record<TypeClassement, DictionaryKey> = {
  croissance: "palmares.croissance",
  pertes: "palmares.pertes",
  influence: "palmares.influence",
  visites: "palmares.visites",
  attaques: "palmares.attaques",
  generosite: "palmares.generosite",
  jumelages: "palmares.jumelages",
};

const LABEL_PERIODE: Record<Periode, DictionaryKey> = {
  jour: "palmares.periode.jour",
  semaine: "palmares.periode.semaine",
  mois: "palmares.periode.mois",
  toujours: "palmares.periode.toujours",
};

const LABEL_ECHELLE: Record<Vue, DictionaryKey> = {
  mondial: "classement.mondial",
  national: "classement.national",
  regional: "classement.regional",
};

/**
 * Section « Palmarès » de la page Classement (docs/A-INTEGRER.md §35, demande
 * d'Adrien du 05/10/2026 : « retirer l'onglet historique et ajouter l'historique
 * des classements dans l'onglet classement »). Les 7 classements par période
 * (jour / semaine / mois / toujours) de l'ancienne page /palmares, calcul
 * inchangé : seule la coquille de navigation a changé. S'affiche à l'intérieur
 * du panneau de /classement (?section=palmares).
 */
export async function SectionPalmares({
  locale,
  supabase,
  userId,
  maVilleId,
  countryId,
  regionId,
  params,
}: {
  locale: Locale;
  supabase: SupabaseClient;
  userId: string;
  maVilleId: string;
  countryId: string;
  regionId: string;
  params: ParamsPalmares;
}) {
  const classement: TypeClassement = (TYPES as string[]).includes(params.classement ?? "")
    ? (params.classement as TypeClassement)
    : "croissance";
  const periode: Periode = (PERIODES as string[]).includes(params.periode ?? "")
    ? (params.periode as Periode)
    : "semaine";
  const echelle: Vue = params.echelle === "national" || params.echelle === "regional" ? params.echelle : "mondial";

  const p_depuis = depuisPourPeriode(periode);
  const p_country_id = echelle === "national" || echelle === "regional" ? countryId : null;
  const p_region_id = echelle === "regional" ? regionId : null;

  const { data: lignesBrutes, error: erreurPalmares } = await supabase.rpc(`palmares_${classement}`, {
    p_depuis,
    p_country_id,
    p_region_id,
  });
  if (erreurPalmares) console.error("Chargement du palmarès a échoué :", erreurPalmares.message);

  const lienVers = (c: TypeClassement, p: Periode, e: Vue) =>
    `/classement?section=palmares&classement=${c}&periode=${p}&echelle=${e}`;
  const actif = { borderColor: "var(--accent)", boxShadow: "inset 0 0 0 1px var(--accent)" };

  return (
    <>
      <div className="row" role="tablist" aria-label={traduire(locale, "palmares.titre")}>
        {TYPES.map((t) => (
          <Link
            key={t}
            href={lienVers(t, periode, echelle)}
            className="btn small"
            style={classement === t ? actif : undefined}
            aria-current={classement === t ? "page" : undefined}
          >
            {traduire(locale, LABEL_TYPE[t])}
          </Link>
        ))}
      </div>

      <div className="row" role="tablist" aria-label={traduire(locale, "palmares.periode.jour")}>
        {PERIODES.map((p) => (
          <Link
            key={p}
            href={lienVers(classement, p, echelle)}
            className="btn small"
            style={periode === p ? actif : undefined}
            aria-current={periode === p ? "page" : undefined}
          >
            {traduire(locale, LABEL_PERIODE[p])}
          </Link>
        ))}
      </div>

      <div className="row" role="tablist" aria-label={traduire(locale, "classement.mondial")}>
        {(["mondial", "national", "regional"] as Vue[]).map((e) => (
          <Link
            key={e}
            href={lienVers(classement, periode, e)}
            className="btn small"
            style={echelle === e ? actif : undefined}
            aria-current={echelle === e ? "page" : undefined}
          >
            {traduire(locale, LABEL_ECHELLE[e])}
          </Link>
        ))}
      </div>

      {classement === "generosite" ? (
        <PalmaresJoueurs
          locale={locale}
          lignes={(lignesBrutes ?? []) as LigneJoueur[]}
          moiId={userId}
          unite={traduire(locale, UNITE[classement])}
        />
      ) : classement === "jumelages" ? (
        <PalmaresJumelages
          locale={locale}
          lignes={(lignesBrutes ?? []) as LigneJumelage[]}
          maVilleId={maVilleId}
          unite={traduire(locale, UNITE[classement])}
        />
      ) : (
        <PalmaresVilles
          locale={locale}
          lignes={(lignesBrutes ?? []) as LigneVille[]}
          maVilleId={maVilleId}
          unite={traduire(locale, UNITE[classement])}
        />
      )}
    </>
  );
}

function PalmaresVilles({
  locale,
  lignes,
  maVilleId,
  unite,
}: {
  locale: Locale;
  lignes: LigneVille[];
  maVilleId: string;
  unite: string;
}) {
  const moi = lignes.find((l) => l.ville_id === maVilleId);
  return (
    <>
      {moi ? (
        <div className="card">
          <div className="spread">
            <span className="h3">{traduire(locale, "palmares.maPosition")}</span>
            <span className="badge pres">
              {ordinal(moi.rang, locale)} · {moi.valeur} {unite}
            </span>
          </div>
        </div>
      ) : null}
      {lignes.length === 0 ? (
        <p className="empty">{traduire(locale, "palmares.aucunResultat")}</p>
      ) : (
        <ol className="list">
          {lignes.slice(0, TAILLE_AFFICHEE).map((l) => {
            const estMoi = l.ville_id === maVilleId;
            const href = estMoi ? "/ville" : `/villes?ville=${l.ville_id}`;
            return (
              <li key={l.ville_id}>
                <Link href={href} className="rowbtn" aria-current={estMoi}>
                  <span className="rk">{l.rang}</span>
                  <span className="nm">{l.nom}</span>
                  <span className="pp">{new Intl.NumberFormat(locale).format(l.valeur)}</span>
                  {estMoi ? (
                    <span className="meta">
                      <span className="badge">{traduire(locale, "villes.maVille")}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

function PalmaresJoueurs({
  locale,
  lignes,
  moiId,
  unite,
}: {
  locale: Locale;
  lignes: LigneJoueur[];
  moiId: string;
  unite: string;
}) {
  const moi = lignes.find((l) => l.joueur_id === moiId);
  return (
    <>
      {moi ? (
        <div className="card">
          <div className="spread">
            <span className="h3">{traduire(locale, "palmares.maPosition")}</span>
            <span className="badge pres">
              {ordinal(moi.rang, locale)} · {moi.valeur} {unite}
            </span>
          </div>
        </div>
      ) : null}
      {lignes.length === 0 ? (
        <p className="empty">{traduire(locale, "palmares.aucunResultat")}</p>
      ) : (
        <ol className="list">
          {lignes.slice(0, TAILLE_AFFICHEE).map((l) => {
            const estMoi = l.joueur_id === moiId;
            return (
              <li key={l.joueur_id}>
                <span className="rowbtn" aria-current={estMoi}>
                  <span className="rk">{l.rang}</span>
                  <span className="nm">{l.pseudo}</span>
                  <span className="pp">{new Intl.NumberFormat(locale).format(l.valeur)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

function PalmaresJumelages({
  locale,
  lignes,
  maVilleId,
  unite,
}: {
  locale: Locale;
  lignes: LigneJumelage[];
  maVilleId: string;
  unite: string;
}) {
  const moi = lignes.find((l) => l.ville_a_id === maVilleId || l.ville_b_id === maVilleId);
  return (
    <>
      {moi ? (
        <div className="card">
          <div className="spread">
            <span className="h3">{traduire(locale, "palmares.maPosition")}</span>
            <span className="badge pres">
              {ordinal(moi.rang, locale)} · {moi.valeur} {unite}
            </span>
          </div>
        </div>
      ) : null}
      {lignes.length === 0 ? (
        <p className="empty">{traduire(locale, "palmares.aucunResultat")}</p>
      ) : (
        <ol className="list">
          {lignes.slice(0, TAILLE_AFFICHEE).map((l) => {
            const estMoi = l.ville_a_id === maVilleId || l.ville_b_id === maVilleId;
            return (
              <li key={l.jumelage_id}>
                <span className="rowbtn" aria-current={estMoi}>
                  <span className="rk">{l.rang}</span>
                  <span className="nm">
                    {l.ville_a_nom} · {l.ville_b_nom}
                  </span>
                  <span className="pp">{new Intl.NumberFormat(locale).format(l.valeur)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
