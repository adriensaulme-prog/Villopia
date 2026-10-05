import { traduire } from "@/lib/i18n/dictionaries";
import type { IdDeveloppement } from "@/lib/game/developpements";
import { LABEL_CATEGORIE, LABEL_DIPLOMATIE, type ContextePays, type LigneHistorique } from "../types";

/** « Historique » : une carte par semaine passée — président, ressource votée, développement voté, décision diplomatique, conflit. */
export async function OngletHistorique({ ctx }: { ctx: ContextePays }) {
  const { locale, supabase, countryId, nomDe } = ctx;
  const nf = new Intl.NumberFormat(locale);

  const { data: historiqueBrut } = await supabase.rpc("historique_pays", {
    p_country_id: countryId,
    p_nb_semaines: 12,
  });
  const historique = (historiqueBrut ?? []) as LigneHistorique[];

  return (
    <>
      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.historique.titre")}</h2>
      </div>
      {historique.length === 0 ? (
        <p className="empty">{traduire(locale, "pays.historique.aucun")}</p>
      ) : (
        <ol className="list">
          {historique.map((h, i) => {
            const issue =
              h.conflit_resultat === null
                ? "enCours"
                : h.conflit_resultat === "egalite"
                  ? "egalite"
                  : h.conflit_resultat === h.conflit_role
                    ? "victoire"
                    : "defaite";
            return (
              <li key={`${h.semaine}-${h.conflit_id ?? i}`}>
                <div className="card">
                  <div className="spread">
                    <span className="h3">
                      {traduire(locale, "pays.historique.semaineDu")}{" "}
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(h.semaine))}
                    </span>
                  </div>
                  {h.president_ville_nom ? (
                    <p className="note">
                      <span className="badge pres">{traduire(locale, "classement.president")}</span> <b>{h.president_ville_nom}</b>
                    </p>
                  ) : null}
                  {h.premier_de && h.premier_de.length > 0 ? (
                    <p className="note">
                      <span className="badge good">{traduire(locale, "pays.historique.premierDe")}</span>{" "}
                      <b>{h.premier_de.map((c) => traduire(locale, LABEL_CATEGORIE[c])).join(", ")}</b>
                    </p>
                  ) : null}
                  {h.vote_categorie ? (
                    <p className="note">
                      {traduire(locale, "pays.historique.vote")} : <b>{traduire(locale, LABEL_CATEGORIE[h.vote_categorie])}</b> (
                      {h.vote_nb})
                    </p>
                  ) : null}
                  {h.developpement ? (
                    <p className="note">
                      {traduire(locale, "pays.historique.developpement")} :{" "}
                      <b>{traduire(locale, `pays.dev.${h.developpement as IdDeveloppement}.nom`)}</b> ({h.developpement_nb}) —{" "}
                      {traduire(locale, h.developpement_finance ? "pays.historique.finance" : "pays.historique.nonFinance")}
                    </p>
                  ) : null}
                  {h.decision_categorie ? (
                    <p className="note">
                      {traduire(locale, "pays.historique.decision")} :{" "}
                      <b>
                        {traduire(locale, LABEL_DIPLOMATIE[h.decision_categorie])} · {nomDe(h.decision_cible)}
                      </b>{" "}
                      — {traduire(locale, h.decision_adoptee ? "pays.historique.adoptee" : "pays.historique.rejetee")} (
                      {h.decision_pour} {traduire(locale, "pays.diplomatie.pour").toLowerCase()} / {h.decision_contre}{" "}
                      {traduire(locale, "pays.diplomatie.contre").toLowerCase()})
                    </p>
                  ) : null}
                  {h.conflit_id && h.conflit_role ? (
                    <p className="note">
                      {traduire(locale, "pays.historique.conflit")} {traduire(locale, "pays.conflit.contre")}{" "}
                      <b>{nomDe(h.conflit_adversaire)}</b> ({traduire(locale, `pays.historique.role.${h.conflit_role}`)}) :{" "}
                      <b>{traduire(locale, `pays.historique.issue.${issue}`)}</b>
                      {" · "}
                      {traduire(locale, "pays.historique.pertes")} {nf.format(h.pertes_pays ?? 0)} /{" "}
                      {nf.format(h.pertes_adversaire ?? 0)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
