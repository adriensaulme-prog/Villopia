import Link from "next/link";
import { traduire } from "@/lib/i18n/dictionaries";
import type { ContextePays, Mandat, VillePrincipale } from "../types";

/**
 * « Pays » : les villes principales du pays et l'historique de ses présidents — ce qui décrit le pays
 * lui-même, par opposition aux décisions de la semaine.
 */
export function OngletApercuPays({
  ctx,
  villesPrincipales,
  mandats,
}: {
  ctx: ContextePays;
  villesPrincipales: VillePrincipale[];
  mandats: Mandat[];
}) {
  const { locale, maVilleId, countryId } = ctx;
  const nf = new Intl.NumberFormat(locale);
  return (
    <>
      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.villesPrincipales")}</h2>
      </div>
      {villesPrincipales.length === 0 ? (
        <p className="empty">{traduire(locale, "pays.aucuneVille")}</p>
      ) : (
        <ol className="list">
          {villesPrincipales.map((v, i) => {
            const estMoi = v.id === maVilleId;
            const href = estMoi ? "/ville" : `/villes?ville=${v.id}`;
            return (
              <li key={v.id}>
                <Link href={href} className="rowbtn" aria-current={estMoi}>
                  <span className="rk">{i + 1}</span>
                  <span className="nm">{v.nom}</span>
                  <span className="pp">{nf.format(v.population)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      <p className="note">
        <Link href={`/villes?pays=${countryId}`}>{traduire(locale, "pays.voirToutesLesVilles")}</Link>
      </p>

      <div className="head-row">
        <h2 className="h3">{traduire(locale, "pays.president.historique")}</h2>
      </div>
      {mandats.length === 0 ? (
        <p className="empty">{traduire(locale, "pays.president.aucunHistorique")}</p>
      ) : (
        <ol className="list">
          {mandats.map((m, i) => (
            <li key={`${m.villeId}-${m.debut}`}>
              <span className="rowbtn">
                <span className="rk">{mandats.length - i}</span>
                <span className="nm">{m.nom}</span>
                <span className="meta">
                  {new Intl.DateTimeFormat(locale).format(new Date(m.debut))}
                  {m.fin ? ` – ${new Intl.DateTimeFormat(locale).format(new Date(m.fin))}` : null}
                  {m.fin === null ? <span className="badge pres">{traduire(locale, "pays.president.enCours")}</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
