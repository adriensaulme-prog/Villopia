/**
 * Repère local d'une parcelle, partagé par les bâtiments de quartier
 * (quartiers.ts) et les modèles des packs de thème (batimentsPacks.ts).
 * Extrait de quartiers.ts sans changement de comportement.
 */
import type { Geo, OptionsBoite } from "./geometrie";
import { box } from "./geometrie";
import type { Facade, Rect } from "./catalogue";

// ---------------------------------------------------------------------
// Repère local d'une parcelle (A-INTEGRER §36 A) : permet de poser auvents,
// perrons, terrasses… « devant » ou « derrière » la façade quel que soit le
// côté de la rue, sans quatre cas par élément.
// ---------------------------------------------------------------------

/**
 * `rect(a0, a1, o0, o1)` : rectangle monde où `a` est le décalage le long de la
 * façade depuis son centre et `o` la distance à la façade, positive vers la
 * rue, négative vers l'intérieur du bâtiment (o0 < o1).
 */
export function repere(front: Facade, fp: Rect) {
  const lateral = front === "-z" || front === "+z";
  const centre = lateral ? (fp[0] + fp[2]) / 2 : (fp[1] + fp[3]) / 2;
  const face = front === "-z" ? fp[1] : front === "+z" ? fp[3] : front === "-x" ? fp[0] : fp[2];
  const sens = front === "-z" || front === "-x" ? -1 : 1;
  const rect = (a0: number, a1: number, o0: number, o1: number): Rect => {
    const d0 = face + sens * o0,
      d1 = face + sens * o1;
    const lo = Math.min(d0, d1),
      hi = Math.max(d0, d1);
    return lateral ? [centre + a0, lo, centre + a1, hi] : [lo, centre + a0, hi, centre + a1];
  };
  /** Point monde (x, z) à (a, o). */
  const point = (a: number, o: number): [number, number] =>
    lateral ? [centre + a, face + sens * o] : [face + sens * o, centre + a];
  return { lateral, centre, face, sens, rect, point };
}

export function boite(g: Geo, R: Rect, y0: number, y1: number, o: OptionsBoite) {
  box(g, R[0], y0, R[1], R[2], y1, R[3], o);
}
