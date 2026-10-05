import { traduire } from "@/lib/i18n/dictionaries";
import {
  CATALOGUE_DEVELOPPEMENTS,
  CATEGORIES_RESSOURCE,
  FAMILLES_DEVELOPPEMENT,
  peutFinancer,
  type IdDeveloppement,
  type StockRessources,
} from "@/lib/game/developpements";
import { PucesCout } from "../composants";
import { LABEL_CATEGORIE, type Categorie, type ContextePays } from "../types";

type LigneStock = { categorie: Categorie; production: number; depense: number; stock: number };
type Acquis = { developpement: IdDeveloppement; semaine_vote: string; debloque_le: string };
type Option = { developpement: IdDeveloppement };

/**
 * « Développement » (A-INTEGRER §48) : le stock de ressources du pays (produit, dépensé, disponible),
 * le catalogue des neuf développements par famille avec leur état (débloqué, proposé cette semaine,
 * à venir) et leur coût, et la liste des acquis. Le vote lui-même se fait dans « Cette semaine ».
 */
export async function OngletDeveloppement({ ctx }: { ctx: ContextePays }) {
  const { locale, supabase, countryId, estMonPays } = ctx;
  const nf = new Intl.NumberFormat(locale);

  const [{ data: stockBrut }, { data: acquisBruts }, { data: optionsBrutes }] = await Promise.all([
    supabase.rpc("stock_pays", { p_country_id: countryId }),
    supabase.from("developpements_pays").select("developpement, semaine_vote, debloque_le").eq("country_id", countryId).order("debloque_le"),
    estMonPays
      ? supabase.rpc("resultats_vote_developpement", { p_country_id: countryId, p_semaine: null })
      : Promise.resolve({ data: [] }),
  ]);

  const lignesStock = (stockBrut ?? []) as LigneStock[];
  const stockDisponible: StockRessources | null =
    lignesStock.length > 0
      ? lignesStock.reduce(
          (s, l) => ({ ...s, [l.categorie]: Number(l.stock) }),
          { industrie: 0, techno: 0, culture: 0, commerce: 0 } as StockRessources
        )
      : null;
  const acquis = new Map(((acquisBruts ?? []) as Acquis[]).map((a) => [a.developpement, a]));
  const proposes = new Set(((optionsBrutes ?? []) as Option[]).map((o) => o.developpement));

  return (
    <>
      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.stock.titre")}</h2>
      </div>
      {lignesStock.length === 0 ? (
        <p className="empty">{traduire(locale, "pays.classement.vide")}</p>
      ) : (
        <div className="tiles">
          {CATEGORIES_RESSOURCE.map((c) => {
            const l = lignesStock.find((x) => x.categorie === c);
            return (
              <div key={c} className="tile">
                <b>{nf.format(Number(l?.stock ?? 0))}</b>
                <span>
                  {traduire(locale, LABEL_CATEGORIE[c])} · {traduire(locale, "pays.stock.disponible").toLowerCase()}
                </span>
                <span>
                  {traduire(locale, "pays.stock.production")} {nf.format(Number(l?.production ?? 0))} ·{" "}
                  {traduire(locale, "pays.stock.depense")} {nf.format(Number(l?.depense ?? 0))}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="note">{traduire(locale, "pays.stock.note")}</p>

      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.acquis.titre")}</h2>
        <span className="badge">
          {acquis.size} / {CATALOGUE_DEVELOPPEMENTS.length}
        </span>
      </div>
      {acquis.size === 0 ? <p className="empty">{traduire(locale, "pays.acquis.aucun")}</p> : null}

      {FAMILLES_DEVELOPPEMENT.map((f) => (
        <section key={f} className={`famille-dev famille-${f}`}>
          <h3 className="h3 famille-titre">{traduire(locale, `pays.famille.${f}`)}</h3>
          {CATALOGUE_DEVELOPPEMENTS.filter((d) => d.famille === f).map((d) => {
            const a = acquis.get(d.id);
            const propose = proposes.has(d.id);
            return (
              <div key={d.id} className={`card dev-carte${a ? " acquis" : ""}`}>
                <div className="spread">
                  <span className="h3">{traduire(locale, `pays.dev.${d.id}.nom`)}</span>
                  {a ? (
                    <span className="badge good">
                      {traduire(locale, "pays.acquis.depuis")}{" "}
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(a.debloque_le))}
                    </span>
                  ) : propose ? (
                    <span className="badge warn">{traduire(locale, "pays.devVote.auVote")}</span>
                  ) : null}
                </div>
                <p className="note">{traduire(locale, `pays.dev.${d.id}.effet`)}</p>
                {!a ? (
                  <p className="ligne-meta">
                    {traduire(locale, "pays.devVote.cout")} :{" "}
                    <PucesCout locale={locale} cout={d.cout} stock={stockDisponible} />
                    {stockDisponible && peutFinancer(stockDisponible, d) ? (
                      <>
                        {" · "}
                        <span className="badge good">{traduire(locale, "pays.devVote.financable")}</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
      <p className="note">{traduire(locale, "pays.devVote.regle")}</p>
    </>
  );
}
