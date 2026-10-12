import "server-only";
import { unstable_cache } from "next/cache";
import { RUBRIQUES, type RubriqueCompteRendu } from "@/lib/comptesRendus";

/**
 * Rubriques réellement présentes dans le Drive : les sous-dossiers de
 * « Comptes rendus de course », listés par le script Apps Script (action
 * `list`). Un dossier créé dans le Drive apparaît ainsi sur le site sans
 * modifier le code, au plus tard après la durée de cache.
 *
 * Les dossiers déjà connus de RUBRIQUES gardent leur titre, leur accroche et
 * leur ordre ; les autres prennent le nom du dossier et se placent avant
 * « Autres ». Si le script est injoignable, on retombe sur RUBRIQUES.
 */

const CACHE_SECONDES = 300;
const ID_AUTRES = RUBRIQUES.find((r) => r.titre === "Autres")?.id;

const listerDossiers = unstable_cache(
  async (): Promise<{ id: string; name: string }[]> => {
    const url = process.env.CR_DRIVE_UPLOAD_URL?.trim();
    const secret = process.env.CR_DRIVE_UPLOAD_SECRET?.trim();
    if (!url || !secret) throw new Error("Script Drive non configuré.");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, action: "list" }),
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as { ok?: boolean; folders?: { id: string; name: string }[]; error?: string };
    // Une erreur levée n'est pas mise en cache : le prochain affichage réessaie.
    if (!result.ok || !Array.isArray(result.folders)) throw new Error(result.error ?? "Réponse inattendue du script.");
    return result.folders;
  },
  ["comptes-rendus-dossiers"],
  { revalidate: CACHE_SECONDES }
);

export async function getRubriques(): Promise<RubriqueCompteRendu[]> {
  let dossiers: { id: string; name: string }[];
  try {
    dossiers = await listerDossiers();
  } catch (error) {
    console.error("Liste des dossiers de comptes rendus indisponible :", (error as Error).message);
    return RUBRIQUES;
  }

  const rang = (id: string) => {
    const index = RUBRIQUES.findIndex((r) => r.id === id);
    if (id === ID_AUTRES) return Number.MAX_SAFE_INTEGER;
    return index === -1 ? RUBRIQUES.length : index;
  };
  return dossiers
    .map((d) => RUBRIQUES.find((r) => r.id === d.id) ?? { titre: d.name, detail: "", id: d.id, prefixe: "" })
    .sort((a, b) => rang(a.id) - rang(b.id) || a.titre.localeCompare(b.titre, "fr"));
}
