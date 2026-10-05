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
export const THEMES = ["classique", "haussmannien"] as const;
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
