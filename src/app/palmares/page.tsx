import { redirect } from "next/navigation";

/**
 * L'onglet Palmarès a été fusionné dans Classement (docs/A-INTEGRER.md §35,
 * demande d'Adrien du 05/10/2026). L'ancienne adresse reste valable : elle
 * renvoie vers la vue correspondante de /classement en conservant les filtres.
 */
export default async function PalmaresPage({
  searchParams,
}: {
  searchParams: Promise<{ classement?: string; periode?: string; echelle?: string }>;
}) {
  const { classement, periode, echelle } = await searchParams;
  const params = new URLSearchParams({ section: "palmares" });
  if (classement) params.set("classement", classement);
  if (periode) params.set("periode", periode);
  if (echelle) params.set("echelle", echelle);
  redirect(`/classement?${params.toString()}`);
}
