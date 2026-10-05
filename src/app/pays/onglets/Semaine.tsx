import { traduire } from "@/lib/i18n/dictionaries";
import { debutSemaineIso } from "@/lib/game/semaineIso";
import { palierGuerre } from "@/lib/game/conflits";
import {
  FAMILLES_DEVELOPPEMENT,
  developpementDe,
  peutFinancer,
  type FamilleDeveloppement,
  type IdDeveloppement,
  type StockRessources,
} from "@/lib/game/developpements";
import { formaterPoids } from "@/lib/game/classementPays";
import { PucesCout } from "../composants";
import {
  donnerAvisDiplomatie,
  proposerDecisionDiplomatique,
  soutenirDecisionDiplomatique,
  voterDeveloppement,
  voterPays,
} from "../actions";
import {
  CATEGORIES,
  CATEGORIES_DIPLOMATIE,
  LABEL_CATEGORIE,
  LABEL_DIPLOMATIE,
  premiereLigne,
  type Categorie,
  type CategorieDiplomatie,
  type ConflitPays,
  type ContextePays,
  type ResultatDecision,
  type ResultatVote,
} from "../types";

type OptionDeveloppement = { developpement: IdDeveloppement; famille: FamilleDeveloppement; report: boolean; nb_votes: number };
type DecisionVisante = {
  proposition_id: string;
  pays_proposant_id: string;
  categorie: CategorieDiplomatie;
  nb_pour: number;
  nb_contre: number;
  avis_pour: number;
  avis_contre: number;
};
type AvisPays = { avis_pour: number; avis_contre: number };

/**
 * « Cette semaine » : les trois décisions hebdomadaires du pays (la ressource à produire, le
 * développement à financer, la décision diplomatique), puis le conflit en cours. C'est l'onglet par
 * défaut : tout ce qui se joue en une visite rapide de /pays est ici.
 */
export async function OngletSemaine({ ctx }: { ctx: ContextePays }) {
  const { locale, supabase, userId, countryId, estMonPays, jeSuisPresident, nomDe } = ctx;
  const semaine = debutSemaineIso();
  const nf = new Intl.NumberFormat(locale);

  const [
    { data: resultatsBruts },
    { data: monVoteBrut },
    { data: resultatDecisionBrut },
    { data: monVoteDiplomatieBrut },
    { data: conflitBrut },
  ] = await Promise.all([
    supabase.rpc("resultats_vote_semaine", { p_country_id: countryId, p_semaine: null }),
    estMonPays
      ? supabase.from("votes_pays").select("categorie").eq("joueur_id", userId).eq("semaine", semaine).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("resultat_decision_semaine", { p_country_id: countryId, p_semaine: null }),
    estMonPays
      ? supabase.from("votes_diplomatie").select("position").eq("joueur_id", userId).eq("semaine", semaine).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("conflit_pays", { p_country_id: countryId }),
  ]);

  const resultats = (resultatsBruts ?? []) as ResultatVote[];
  const monVote = (monVoteBrut?.categorie as Categorie | undefined) ?? null;
  const resultatDecision = premiereLigne<ResultatDecision>(resultatDecisionBrut);
  const monVoteDiplomatie = resultatDecision
    ? ((monVoteDiplomatieBrut?.position as "pour" | "contre" | undefined) ?? null)
    : null;
  const conflit = premiereLigne<ConflitPays>(conflitBrut);

  // Développements (migration 0054) : tant qu'elle n'est pas appliquée, les appels échouent et la
  // section reste simplement absente.
  let options: OptionDeveloppement[] = [];
  let stock: StockRessources | null = null;
  let monVoteDeveloppement: string | null = null;
  let decisionsVisantes: DecisionVisante[] = [];
  let poidsAvis = 0;
  let mesAvis = new Map<string, string>();
  let avisRecus: AvisPays | undefined;
  let effortCible: number | null = null;
  let monEffort: number | null = null;

  if (estMonPays) {
    const [optionsRes, stockRes, voteDevRes, visantesRes, poidsRes] = await Promise.all([
      supabase.rpc("resultats_vote_developpement", { p_country_id: countryId, p_semaine: null }),
      supabase.rpc("stock_pays", { p_country_id: countryId }),
      supabase.from("votes_developpement").select("developpement").eq("joueur_id", userId).eq("semaine", semaine).maybeSingle(),
      supabase.rpc("decisions_visant_pays", { p_country_id: countryId, p_semaine: null }),
      supabase.rpc("poids_voix_diplomatique_pays", { p_country_id: countryId, p_semaine: null }),
    ]);
    options = ((optionsRes.data ?? []) as OptionDeveloppement[]).map((o) => ({ ...o, nb_votes: Number(o.nb_votes) }));
    const lignesStock = (stockRes.data ?? []) as { categorie: Categorie; stock: number }[];
    if (lignesStock.length > 0) {
      stock = { industrie: 0, techno: 0, culture: 0, commerce: 0 };
      for (const l of lignesStock) stock[l.categorie] = Number(l.stock);
    }
    monVoteDeveloppement = (voteDevRes.data?.developpement as string | undefined) ?? null;
    decisionsVisantes = (visantesRes.data ?? []) as DecisionVisante[];
    poidsAvis = Number(poidsRes.data ?? 0);

    if (decisionsVisantes.length > 0) {
      const { data: avisBruts } = await supabase
        .from("avis_diplomatie")
        .select("proposition_id, position")
        .eq("joueur_id", userId)
        .in("proposition_id", decisionsVisantes.map((d) => d.proposition_id));
      mesAvis = new Map((avisBruts ?? []).map((a) => [a.proposition_id as string, a.position as string]));
    }

    if (resultatDecision) {
      const { data: avisRes } = await supabase.rpc("avis_decision_semaine", { p_country_id: countryId, p_semaine: null });
      avisRecus = premiereLigne<AvisPays>(avisRes);
      if (resultatDecision.categorie === "rivalite") {
        const [cibleRes, moiRes] = await Promise.all([
          supabase.rpc("effort_national_cible", { p_country_id: countryId, p_cible_id: resultatDecision.pays_cible_id }),
          supabase.rpc("effort_national", { p_country_id: countryId }),
        ]);
        effortCible = cibleRes.data === null || cibleRes.data === undefined ? null : Number(cibleRes.data);
        monEffort = moiRes.data === null || moiRes.data === undefined ? null : Number(moiRes.data);
      }
    }
  }

  const palierConflit = conflit
    ? palierGuerre(Math.max(conflit.jours_gagnes_attaquant, conflit.jours_gagnes_defenseur))
    : null;
  const nomPaysCible = resultatDecision ? nomDe(resultatDecision.pays_cible_id) : null;
  const nomAttaquant = conflit ? nomDe(conflit.pays_attaquant_id) : null;
  const nomDefenseur = conflit ? nomDe(conflit.pays_defenseur_id) : null;

  return (
    <>
      {estMonPays ? <p className="note">{traduire(locale, "pays.semaine.intro")}</p> : null}

      {/* 1. Vote hebdomadaire de ressource (Jalon 10) */}
      {estMonPays ? (
        <>
          <div className="head-row">
            <h2 className="h3">{traduire(locale, "pays.vote.titre")}</h2>
            <span className={`badge ${monVote ? "good" : "warn"}`}>
              {traduire(locale, monVote ? "pays.semaine.etatFait" : "pays.semaine.etatAFaire")}
            </span>
          </div>
          {monVote ? (
            <p className="note">
              {traduire(locale, "pays.vote.dejaVote")} <b>{traduire(locale, LABEL_CATEGORIE[monVote])}</b>.
            </p>
          ) : (
            <>
              <p className="note">{traduire(locale, "pays.vote.instruction")}</p>
              <div className="row">
                {CATEGORIES.map((c) => (
                  <form key={c} action={voterPays}>
                    <input type="hidden" name="categorie" value={c} />
                    <button className="btn small" type="submit">
                      {traduire(locale, LABEL_CATEGORIE[c])}
                    </button>
                  </form>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.resultats.titre")}</h2>
      </div>
      <ol className="list">
        {resultats.map((r, i) => (
          <li key={r.categorie}>
            <span className="rowbtn">
              <span className="rk">{i + 1}</span>
              <span className="nm">{traduire(locale, LABEL_CATEGORIE[r.categorie])}</span>
              <span className="pp">{r.pourcentage}%</span>
              <span className="meta">{nf.format(r.nb_votes)}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* 2. Vote de développement (§48) */}
      {estMonPays && options.length > 0 ? (
        <>
          <div className="head-row">
            <h2 className="h3">{traduire(locale, "pays.devVote.titre")}</h2>
            <span className={`badge ${monVoteDeveloppement ? "good" : "warn"}`}>
              {traduire(locale, monVoteDeveloppement ? "pays.semaine.etatFait" : "pays.semaine.etatAFaire")}
            </span>
          </div>
          {monVoteDeveloppement ? (
            <p className="note">
              {traduire(locale, "pays.devVote.dejaVote")}{" "}
              <b>{traduire(locale, `pays.dev.${monVoteDeveloppement as IdDeveloppement}.nom`)}</b>.
            </p>
          ) : (
            <p className="note">{traduire(locale, "pays.devVote.instruction")}</p>
          )}
          <div className="options-dev">
            {FAMILLES_DEVELOPPEMENT.map((f) => options.find((o) => o.famille === f)).map((o) => {
              if (!o) return null;
              const def = developpementDe(o.developpement);
              if (!def) return null;
              const financable = stock ? peutFinancer(stock, def) : null;
              return (
                <div key={o.developpement} className={`card option-dev famille-${o.famille}`}>
                  <div className="spread">
                    <span className="h3">{traduire(locale, `pays.dev.${o.developpement}.nom`)}</span>
                    <span className="badge">{traduire(locale, `pays.famille.${o.famille}`)}</span>
                  </div>
                  <p className="note">{traduire(locale, `pays.dev.${o.developpement}.effet`)}</p>
                  <div className="spread">
                    <span className="ligne-meta">
                      {traduire(locale, "pays.devVote.cout")} : <PucesCout locale={locale} cout={def.cout} stock={stock} />
                    </span>
                  </div>
                  <div className="spread">
                    <span className="ligne-meta">
                      {nf.format(o.nb_votes)} {traduire(locale, "pays.devVote.voix")}
                      {o.report ? (
                        <>
                          {" · "}
                          <span className="badge warn" title={traduire(locale, "pays.devVote.reconduit")}>
                            {traduire(locale, "pays.devVote.reconduitCourt")}
                          </span>
                        </>
                      ) : null}
                      {financable ? (
                        <>
                          {" · "}
                          <span className="badge good">{traduire(locale, "pays.devVote.financable")}</span>
                        </>
                      ) : null}
                    </span>
                    {!monVoteDeveloppement ? (
                      <form action={voterDeveloppement}>
                        <input type="hidden" name="developpement" value={o.developpement} />
                        <button className="btn small" type="submit">
                          {traduire(locale, "pays.devVote.voter")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="note">{traduire(locale, "pays.devVote.regle")}</p>
        </>
      ) : null}
      {estMonPays && options.length === 0 && stock ? (
        <>
          <div className="head-row">
            <h2 className="h3">{traduire(locale, "pays.devVote.titre")}</h2>
          </div>
          <p className="empty">{traduire(locale, "pays.devVote.catalogueComplet")}</p>
        </>
      ) : null}

      {/* 3. Décision diplomatique (Jalons 12 et 13) */}
      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.diplomatie.titre")}</h2>
        {estMonPays && resultatDecision ? (
          <span className={`badge ${monVoteDiplomatie ? "good" : "warn"}`}>
            {traduire(locale, monVoteDiplomatie ? "pays.semaine.etatFait" : "pays.semaine.etatAFaire")}
          </span>
        ) : null}
      </div>
      {resultatDecision ? (
        <div className="card">
          <div className="spread">
            <span className="h3">
              {traduire(locale, LABEL_DIPLOMATIE[resultatDecision.categorie])} · {nomPaysCible}
            </span>
          </div>
          <div className="row">
            <span className="badge">
              {nf.format(resultatDecision.nb_pour)} {traduire(locale, "pays.diplomatie.pour")}
            </span>
            <span className="badge">
              {nf.format(resultatDecision.nb_contre)} {traduire(locale, "pays.diplomatie.contre")}
            </span>
            {avisRecus && (Number(avisRecus.avis_pour) > 0 || Number(avisRecus.avis_contre) > 0) ? (
              <span className="badge info" title={traduire(locale, "pays.diplomatie.avisRecus")}>
                {traduire(locale, "pays.diplomatie.avisRecus")} : {formaterPoids(Number(avisRecus.avis_pour), locale)} /{" "}
                {formaterPoids(Number(avisRecus.avis_contre), locale)}
              </span>
            ) : null}
          </div>
          {effortCible !== null && monEffort !== null ? (
            <p className="note">
              {traduire(locale, "pays.renseignement.effort")} : <b>{nf.format(effortCible)}</b> (
              {traduire(locale, "pays.renseignement.notre")} : {nf.format(monEffort)})
            </p>
          ) : null}
          {estMonPays ? (
            monVoteDiplomatie ? (
              <p className="note">
                {traduire(locale, "pays.diplomatie.dejaVote")}{" "}
                <b>{traduire(locale, monVoteDiplomatie === "pour" ? "pays.diplomatie.pour" : "pays.diplomatie.contre")}</b>.
              </p>
            ) : (
              <div className="row">
                <form action={soutenirDecisionDiplomatique}>
                  <input type="hidden" name="position" value="pour" />
                  <button className="btn small" type="submit">
                    {traduire(locale, "pays.diplomatie.pour")}
                  </button>
                </form>
                <form action={soutenirDecisionDiplomatique}>
                  <input type="hidden" name="position" value="contre" />
                  <button className="btn small" type="submit">
                    {traduire(locale, "pays.diplomatie.contre")}
                  </button>
                </form>
              </div>
            )
          ) : null}
        </div>
      ) : (
        <p className="empty">{traduire(locale, "pays.diplomatie.aucunePropositionCetteSemaine")}</p>
      )}
      {jeSuisPresident && !resultatDecision ? (
        <form action={proposerDecisionDiplomatique} className="row" style={{ flexWrap: "wrap" }}>
          <select name="paysCibleId" className="select" aria-label={traduire(locale, "pays.diplomatie.choisirCible")} required>
            <option value="">{traduire(locale, "pays.diplomatie.choisirCible")}</option>
            {ctx.listePays
              .filter((p) => p.id !== countryId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
          </select>
          <select name="categorie" className="select" aria-label={traduire(locale, "pays.diplomatie.choisirCategorie")} required>
            <option value="">{traduire(locale, "pays.diplomatie.choisirCategorie")}</option>
            {CATEGORIES_DIPLOMATIE.map((c) => (
              <option key={c} value={c}>
                {traduire(locale, LABEL_DIPLOMATIE[c])}
              </option>
            ))}
          </select>
          <button className="btn small" type="submit">
            {traduire(locale, "pays.diplomatie.proposer")}
          </button>
        </form>
      ) : null}

      {/* 3 bis. Décisions des autres pays qui visent celui-ci : l'avis pondéré (§47 Culture n°1, §48 Rayonnement) */}
      {estMonPays && (decisionsVisantes.length > 0 || poidsAvis > 0) ? (
        <>
          <div className="head-row">
            <h2 className="h3">{traduire(locale, "pays.avis.titre")}</h2>
            {poidsAvis > 0 ? (
              <span className="badge info">
                {traduire(locale, "pays.avis.poids")} ×{formaterPoids(poidsAvis, locale)}
              </span>
            ) : null}
          </div>
          {decisionsVisantes.length === 0 ? (
            <p className="empty">{traduire(locale, "pays.avis.aucune")}</p>
          ) : (
            decisionsVisantes.map((d) => {
              const monAvis = mesAvis.get(d.proposition_id) ?? null;
              return (
                <div key={d.proposition_id} className="card">
                  <div className="spread">
                    <span className="h3">
                      {traduire(locale, LABEL_DIPLOMATIE[d.categorie])} · {traduire(locale, "pays.avis.par")}{" "}
                      {nomDe(d.pays_proposant_id)}
                    </span>
                  </div>
                  <div className="row">
                    <span className="badge">
                      {nf.format(Number(d.nb_pour))} {traduire(locale, "pays.diplomatie.pour")}
                    </span>
                    <span className="badge">
                      {nf.format(Number(d.nb_contre))} {traduire(locale, "pays.diplomatie.contre")}
                    </span>
                    <span className="badge info">
                      {traduire(locale, "pays.avis.recus")} : {formaterPoids(Number(d.avis_pour), locale)} /{" "}
                      {formaterPoids(Number(d.avis_contre), locale)}
                    </span>
                  </div>
                  {poidsAvis <= 0 ? (
                    <p className="note">{traduire(locale, "pays.avis.pasDeVoix")}</p>
                  ) : monAvis ? (
                    <p className="note">
                      {traduire(locale, "pays.avis.dejaDonne")}{" "}
                      <b>{traduire(locale, monAvis === "pour" ? "pays.diplomatie.pour" : "pays.diplomatie.contre")}</b>.
                    </p>
                  ) : (
                    <div className="row">
                      {(["pour", "contre"] as const).map((position) => (
                        <form key={position} action={donnerAvisDiplomatie}>
                          <input type="hidden" name="propositionId" value={d.proposition_id} />
                          <input type="hidden" name="position" value={position} />
                          <button className="btn small" type="submit">
                            {traduire(locale, position === "pour" ? "pays.diplomatie.pour" : "pays.diplomatie.contre")}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      ) : null}

      {/* 4. Conflit en cours (Jalons 13 et 21) */}
      {conflit ? (
        <>
          <div className="head-row">
            <h2 className="h3">{traduire(locale, "pays.conflit.titre")}</h2>
          </div>
          <div className="card">
            <div className="spread">
              <span className="h3">
                {nomAttaquant} {traduire(locale, "pays.conflit.contre")} {nomDefenseur}
              </span>
              <span className="badge">
                {traduire(locale, conflit.statut === "en_cours" ? "pays.conflit.enCours" : "pays.conflit.termine")}
              </span>
            </div>
            {palierConflit ? (
              <p className="note">
                <span className="badge">{traduire(locale, `pays.conflit.palier.${palierConflit}`)}</span>
              </p>
            ) : null}
            <div className="tiles">
              <div className="tile">
                <b>{nf.format(conflit.jours_gagnes_attaquant)}</b>
                <span>{traduire(locale, "pays.conflit.joursGagnesAttaquant")}</span>
              </div>
              <div className="tile">
                <b>{nf.format(conflit.jours_gagnes_defenseur)}</b>
                <span>{traduire(locale, "pays.conflit.joursGagnesDefenseur")}</span>
              </div>
              <div className="tile">
                <b>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(conflit.effort_attaquant)}</b>
                <span>{traduire(locale, "pays.conflit.effortAttaquant")}</span>
              </div>
              <div className="tile">
                <b>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(conflit.effort_defenseur)}</b>
                <span>{traduire(locale, "pays.conflit.effortDefenseur")}</span>
              </div>
            </div>
            <p className="note">{traduire(locale, "pays.conflit.bonusInclus")}</p>
            {conflit.statut === "en_cours" ? (
              <p className="note">{traduire(locale, "pays.conflit.effetQuotidien")}</p>
            ) : null}
            {conflit.statut === "termine" && conflit.resultat ? (
              <p className="note">
                {traduire(locale, "pays.conflit.resultat")}{" "}
                <b>
                  {conflit.resultat === "egalite"
                    ? traduire(locale, "pays.conflit.egalite")
                    : conflit.resultat === "attaquant"
                      ? nomAttaquant
                      : nomDefenseur}
                </b>
              </p>
            ) : (
              <p className="note">
                {traduire(locale, "pays.conflit.finLe")}{" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(conflit.fin))}
              </p>
            )}
            {Object.keys(conflit.cout_ressources).length > 0 ? (
              <>
                <p className="note">{traduire(locale, "pays.conflit.cout")}</p>
                <div className="tiles">
                  {CATEGORIES.filter((c) => conflit.cout_ressources[c] !== undefined).map((c) => (
                    <div key={c} className="tile">
                      <b>{nf.format(conflit.cout_ressources[c] ?? 0)}</b>
                      <span>{traduire(locale, LABEL_CATEGORIE[c])}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {!estMonPays ? <p className="note">{traduire(locale, "pays.devVote.autrePays")}</p> : null}
    </>
  );
}

