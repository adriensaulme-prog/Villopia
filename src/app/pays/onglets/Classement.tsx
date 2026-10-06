import { traduire } from "@/lib/i18n/dictionaries";
import { Drapeau } from "@/components/Drapeau";
import { CATEGORIES_RESSOURCE } from "@/lib/game/developpements";
import { estPremier, type LigneClassementPays } from "@/lib/game/classementPays";
import { LABEL_CATEGORIE, type Categorie, type ContextePays } from "../types";

type LigneBrute = {
  categorie: Categorie;
  rang: number | null;
  total: number;
  nb_pays: number;
  premier_country_id: string | null;
  premier_total: number | null;
};

/**
 * « Classement » (A-INTEGRER §47) : où se situe le pays dans chacune des quatre catégories de
 * ressource, qui est en tête, et l'effet que son n°1 reçoit cette semaine. Le classement est
 * recalculé à chaque semaine (migration 0052) sur les ressources accumulées avant le lundi.
 */
export async function OngletClassement({ ctx }: { ctx: ContextePays }) {
  const { locale, supabase, countryId, nomDe } = ctx;
  const nf = new Intl.NumberFormat(locale);

  const { data } = await supabase.rpc("classement_pays_vue", { p_country_id: countryId, p_semaine: null });
  const lignes: LigneClassementPays[] = ((data ?? []) as LigneBrute[]).map((l) => ({
    categorie: l.categorie,
    rang: l.rang === null ? null : Number(l.rang),
    total: Number(l.total),
    nbPays: Number(l.nb_pays),
    premierCountryId: l.premier_country_id,
    premierTotal: l.premier_total === null ? null : Number(l.premier_total),
  }));
  const parCategorie = new Map(lignes.map((l) => [l.categorie, l]));
  const aucunClasse = lignes.length > 0 && lignes.every((l) => l.nbPays === 0);

  return (
    <>
      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.classement.titre")}</h2>
      </div>
      <p className="note">{traduire(locale, "pays.classement.intro")}</p>

      {lignes.length === 0 ? (
        <p className="empty">{traduire(locale, "pays.classement.vide")}</p>
      ) : (
        <ol className="classement-pays">
          {CATEGORIES_RESSOURCE.map((c) => {
            const l = parCategorie.get(c);
            if (!l) return null;
            const premier = estPremier(l);
            const leaderEstCePays = l.premierCountryId === countryId;
            return (
              <li key={c} className={`card ligne-classement${premier ? " premier" : ""}`}>
                <div className="spread">
                  <span className="h3">{traduire(locale, LABEL_CATEGORIE[c])}</span>
                  {l.rang === null ? (
                    <span className="badge">{traduire(locale, "pays.classement.nonClasse")}</span>
                  ) : (
                    <span className={`badge ${premier ? "good" : ""}`}>
                      {traduire(locale, "pays.classement.rang")} {l.rang} / {nf.format(l.nbPays)}
                    </span>
                  )}
                </div>
                <p className="ligne-meta">
                  {nf.format(l.total)} · {l.nbPays > 0 ? (
                    leaderEstCePays ? (
                      <b>
                        {traduire(locale, "pays.classement.enTete")} <Drapeau code={countryId} hauteur={13} /> {nomDe(countryId)}
                      </b>
                    ) : (
                      <>
                        {traduire(locale, "pays.classement.enTete")} <Drapeau code={l.premierCountryId} hauteur={13} />{" "}
                        <b>{nomDe(l.premierCountryId)}</b> (
                        {nf.format(l.premierTotal ?? 0)})
                      </>
                    )
                  ) : null}
                </p>
                <p className="note effet-premier">
                  <span className={`badge ${premier ? "good" : ""}`}>
                    {traduire(locale, premier ? "pays.classement.effetActif" : "pays.classement.effetDuPremier")}
                  </span>{" "}
                  {traduire(locale, `pays.classement.effet.${c}`)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {aucunClasse ? <p className="empty">{traduire(locale, "pays.classement.vide")}</p> : null}
      <p className="note">{traduire(locale, "pays.classement.note")}</p>
    </>
  );
}
