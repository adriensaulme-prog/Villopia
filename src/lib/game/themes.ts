/**
 * Thèmes visuels disponibles (bibliothèque de bâtiments 4/4,
 * docs/BATIMENTS-ET-PACKS.md §4). Copie TypeScript de la contrainte
 * `cities.theme` (supabase/migrations/0034_...) et du catalogue `packs`
 * (0047_...), à tenir synchronisés — tests/unit/boutique.test.ts le vérifie.
 * "classique" est le pack de base gratuit ; les autres sont partiels
 * (voir src/lib/ville3d/catalogue.ts) — une famille sans modèle dédié
 * retombe sur "classique".
 *
 * Un pack est PUREMENT COSMÉTIQUE (docs/BATIMENTS-ET-PACKS.md §4, rappelé
 * par docs/A-INTEGRER.md §30) : il ne porte que des modèles de bâtiments,
 * une palette et une description — jamais un effet sur les habitants,
 * l'influence ou la défense. Les fiches ci-dessous n'ont donc, volontairement,
 * aucun champ de jeu.
 */
export const THEMES = [
  "classique",
  "haussmannien",
  "bord_de_mer",
  "village_de_pierre",
  "quartier_industriel",
  "futuriste_eco",
  "nordique",
] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_PAR_DEFAUT: Theme = "classique";

export function estTheme(valeur: unknown): valeur is Theme {
  return typeof valeur === "string" && (THEMES as readonly string[]).includes(valeur);
}

/** Familles de bâtiments dont un pack peut fournir des modèles dédiés. */
export type FamilleBatiment = "maison" | "immeuble" | "tour";
export const FAMILLES_BATIMENT: readonly FamilleBatiment[] = ["maison", "immeuble", "tour"];

export interface FichePack {
  id: Theme;
  /** Familles pour lesquelles le pack a ses propres modèles ; les autres retombent sur « classique ». */
  familles: readonly FamilleBatiment[];
  /** Couleurs d'aperçu des pastilles (affichage seulement : approximation des matériaux du pack). */
  palette: readonly string[];
}

export const PACKS: readonly FichePack[] = [
  {
    id: "classique",
    familles: ["maison", "immeuble", "tour"],
    palette: ["#d8a47f", "#e9d8b0", "#9fb7c9", "#7da07a"],
  },
  {
    // Pierre claire, zinc des toits mansardés, fer forgé des garde-corps (batiments.ts, immeuble-haussmannien).
    id: "haussmannien",
    familles: ["immeuble"],
    palette: ["#e9e0cd", "#ded3ba", "#6b7278", "#2d2f33"],
  },
  // Les cinq packs suivants viennent d'A-INTEGRER §40. Un thème est unique par ville : « bord_de_mer » et
  // « village_de_pierre » (maisons) d'une part, « quartier_industriel » et « haussmannien » (immeubles) d'autre
  // part sont donc concurrents d'office — le joueur applique l'un ou l'autre, jamais les deux.
  {
    // Bardage blanc et bleu pastel, volets colorés, bois clair des terrasses (batimentsPacks.ts, maison-balneaire…).
    id: "bord_de_mer",
    familles: ["maison"],
    palette: ["#f4f1e8", "#a9cbe0", "#e0735a", "#c9a77c"],
  },
  {
    // Pierre sèche, ardoise, bois brut des linteaux et des portes (batimentsPacks.ts, maison-pierre-…).
    id: "village_de_pierre",
    familles: ["maison"],
    palette: ["#9a9b96", "#7d807c", "#454a52", "#7a5a3e"],
  },
  {
    // Brique rouge, ossature d'acier noire, verrières teintées (batimentsPacks.ts, immeuble-loft-…).
    id: "quartier_industriel",
    familles: ["immeuble"],
    palette: ["#a8493a", "#7d3b2f", "#25282c", "#7fa6ae"],
  },
  {
    // Façades végétalisées, panneaux solaires, structure métallique claire (batimentsPacks.ts, tour-eco-…).
    id: "futuriste_eco",
    familles: ["tour"],
    palette: ["#6fae6a", "#f2f4f3", "#a9b4bc", "#1f3a5f"],
  },
  {
    // Bois clair, toits pentus, couleurs sourdes : les trois familles d'un coup (batimentsPacks.ts, *-nordique-…).
    id: "nordique",
    familles: ["maison", "immeuble", "tour"],
    palette: ["#d9b98a", "#f2efe8", "#8da2b3", "#b5573a"],
  },
];

export function fichePack(id: string): FichePack | undefined {
  return PACKS.find((p) => p.id === id);
}

/** Un pack tel que le joueur le voit : son droit d'usage est déjà résolu côté serveur. */
export interface PackJoueur {
  id: Theme;
  /** Gratuit pour tous (ligne de `packs`), sinon réservé à qui le possède (ligne de `joueur_packs`). */
  gratuit: boolean;
  possede: boolean;
}

/** Une ligne du catalogue `packs` (table lue côté serveur). */
export interface LigneCatalogue {
  id: string;
  gratuit: boolean;
}

/**
 * Packs que le joueur peut appliquer : les gratuits, plus ceux de `joueur_packs`.
 * Reflète exactement `possede_pack()` (migration 0047), qui est la vraie barrière.
 *
 * `catalogue` vaut null quand la table `packs` n'a pas pu être lue (migration pas
 * encore appliquée) : on retombe alors sur le comportement d'avant la boutique
 * (migration 0034, tout thème connu est libre) plutôt que de verrouiller la ville
 * de quelqu'un sur une erreur de lecture.
 */
export function packsDuJoueur(catalogue: readonly LigneCatalogue[] | null, obtenus: readonly string[]): PackJoueur[] {
  const obtenusSet = new Set(obtenus);
  return PACKS.map(({ id }) => {
    if (catalogue === null) return { id, gratuit: true, possede: true };
    const ligne = catalogue.find((l) => l.id === id);
    // Un pack du code absent du catalogue n'est pas encore ouvert : ni gratuit, ni possédé.
    if (!ligne) return { id, gratuit: false, possede: obtenusSet.has(id) };
    return { id, gratuit: ligne.gratuit, possede: ligne.gratuit || obtenusSet.has(id) };
  });
}

/** Où en est un pack pour CE joueur : appliqué à sa ville, possédé (applicable) ou encore à obtenir. */
export type EtatPack = "applique" | "possede" | "a_obtenir";

export function etatPack(pack: PackJoueur, themeApplique: string): EtatPack {
  if (pack.id === themeApplique) return "applique";
  return pack.possede ? "possede" : "a_obtenir";
}
