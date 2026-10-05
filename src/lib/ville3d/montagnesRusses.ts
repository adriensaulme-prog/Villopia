/**
 * Circuit de montagnes russes du Parc d'attractions (3ᵉ consigne du 05/10/2026, retour d'Adrien du 05/10/2026 : « de vraies
 * montagnes russes avec des rails et des wagons »). Une courbe fermée dans une emprise de 52 × 44 m, calculée une fois :
 * la gare, une longue côte de 33 m, la chute, un looping vertical (un cercle dans un plan vertical, décalé de 3,2 m de
 * côté entre l'entrée et la sortie pour que la voie ne se recoupe pas), deux petites bosses, un virage, trois bosses
 * encore, un virage et le retour à la gare.
 *
 * Fonctions pures, sans dépendance : les points sont en mètres, (x, z) dans l'emprise (origine au coin nord-ouest),
 * y au-dessus du sol de la plateforme. `tests/unit/parcAttractions.test.ts` vérifie que la voie ne se recoupe jamais.
 */
export type P3 = [number, number, number];

/** Dimensions de l'emprise du circuit (m). */
export const EMPRISE_MONTAGNES = { largeur: 52, profondeur: 44 } as const;

/** Rayon du looping et son décalage latéral entre l'entrée et la sortie (m). */
const R_LOOP = 6.5;
const DECALAGE_LOOP = 3.2;

/** Points de contrôle du circuit : x, y (hauteur), z. */
function pointsDeControle(): P3[] {
  const pts: P3[] = [
    // gare (cap à l'est) et côte
    [6, 2, 40],
    [13, 2.4, 40],
    [20, 7, 40],
    [28, 15.5, 40],
    [35, 25, 40],
    [41, 31.2, 40],
    // sommet, puis chute en virant vers le nord
    [45.5, 33, 39.5],
    [49, 31, 36.5],
    [51, 22, 32],
    [50.5, 10.5, 28.5],
  ];
  // looping vertical : un cercle dans le plan (z, y), cap au nord (−z), décalé de côté au fil de l'angle
  const yBas = 2.8;
  const x0 = 49.8;
  for (let k = 0; k < 8; k++) {
    const th = (k / 8) * Math.PI * 2;
    pts.push([x0 - (DECALAGE_LOOP * th) / (Math.PI * 2), yBas + R_LOOP * (1 - Math.cos(th)), 24 - R_LOOP * Math.sin(th)]);
  }
  pts.push(
    // sortie du looping, première bosse, virage du coin nord-est
    [x0 - DECALAGE_LOOP, yBas, 24],
    [46.2, 3.2, 19],
    [45.6, 10.5, 13.2],
    [45, 3.2, 7.8],
    [43.2, 4, 3.2],
    // cap à l'ouest : trois bosses
    [38, 4.8, 1.8],
    [31, 11.5, 2.6],
    [23.5, 3.6, 3.4],
    [15.5, 9.5, 3],
    [8.5, 4.2, 3.6],
    // virage du coin nord-ouest, cap au sud : une bosse, puis le retour à la gare
    [3.8, 4.8, 6.4],
    [2.4, 6.4, 14],
    [2.4, 9.2, 22],
    [2.6, 4.4, 30],
    [2.8, 2.8, 35],
    [3.4, 2.2, 38.2]
  );
  return pts;
}

const dist = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Catmull-Rom centripète (Barry-Goldman) entre p1 et p2, t dans [0, 1] : pas de boucle parasite sur des points inégalement espacés. */
export function catmullRom(p0: P3, p1: P3, p2: P3, p3: P3, t: number): P3 {
  const t0 = 0,
    t1 = t0 + Math.sqrt(Math.max(dist(p0, p1), 1e-6)),
    t2 = t1 + Math.sqrt(Math.max(dist(p1, p2), 1e-6)),
    t3 = t2 + Math.sqrt(Math.max(dist(p2, p3), 1e-6));
  const u = t1 + (t2 - t1) * t;
  const lerp = (a: P3, b: P3, ta: number, tb: number): P3 => {
    const f = (u - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  const a1 = lerp(p0, p1, t0, t1),
    a2 = lerp(p1, p2, t1, t2),
    a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2),
    b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

/**
 * Le circuit échantillonné tous les `pas` mètres environ, courbe fermée (le dernier point précède le premier). Mêmes points
 * à chaque appel : le circuit ne dépend de rien.
 */
export function circuitMontagnes(pas = 1.7): P3[] {
  const c = pointsDeControle();
  const n = c.length;
  const sortie: P3[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = c[(i + n - 1) % n],
      p1 = c[i],
      p2 = c[(i + 1) % n],
      p3 = c[(i + 2) % n];
    const m = Math.max(2, Math.round(dist(p1, p2) / pas));
    for (let k = 0; k < m; k++) sortie.push(catmullRom(p0, p1, p2, p3, k / m));
  }
  return sortie;
}

/** Longueur du circuit (m). */
export function longueurCircuit(pts: readonly P3[]): number {
  let L = 0;
  for (let i = 0; i < pts.length; i++) L += dist(pts[i], pts[(i + 1) % pts.length]);
  return L;
}
