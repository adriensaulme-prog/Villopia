/** Pastilles de couleur d'un pack : un coup d'œil sur son ambiance, sans image à télécharger. */
export function PastillesPalette({ palette }: { palette: readonly string[] }) {
  return (
    <span className="pack-palette" aria-hidden="true">
      {palette.map((couleur) => (
        <i key={couleur} style={{ background: couleur }} />
      ))}
    </span>
  );
}
