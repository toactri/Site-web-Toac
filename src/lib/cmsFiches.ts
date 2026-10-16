import "server-only";
import { revalidatePath } from "next/cache";
import { CMS_CONNEXION, getCmsCatalog } from "@/lib/cms";
import { COACHES_SECTION_NAME } from "@/lib/training";
import type { MembreRole } from "@/lib/db";

/**
 * Fiches publiques (page « Le bureau & les coachs ») créées et supprimées en
 * même temps que les rôles (Bureau → Rôles et accès).
 *
 * Le site n'a qu'un accès en lecture au CMS ; l'écriture passe par deux
 * fonctions Supabase dédiées (fiche_membre_creer / fiche_membre_supprimer,
 * migration Devanture-cms 20261016120000), qui exigent le secret
 * CMS_FICHES_SECRET et n'agissent que sur les sections « Bureau … » et
 * « Encadrement sportif ». Les emails ne vont jamais dans le CMS (lecture
 * publique) : le lien est l'identifiant de fiche gardé dans roles_membres.
 */

export const BUREAU_SECTION_NAME = "Bureau 2026";

export function sectionPourRole(role: MembreRole): string {
  return role === "bureau" ? BUREAU_SECTION_NAME : COACHES_SECTION_NAME;
}

export class FichesNonConfigureesError extends Error {}

function secret(): string {
  const value = process.env.CMS_FICHES_SECRET?.trim();
  if (!value) throw new FichesNonConfigureesError("CMS_FICHES_SECRET n'est pas configurée : fiche non créée.");
  return value;
}

const cle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Fiche de la section portant ce nom (dans un ordre ou l'autre : « Prénom Nom » / « Nom Prénom »). */
export async function trouverFiche(role: MembreRole, prenom: string | null, nom: string): Promise<string | null> {
  const catalogue = await getCmsCatalog();
  const section = catalogue?.find((s) => s.name === sectionPourRole(role));
  if (!section) return null;
  const cles = new Set(prenom ? [cle(`${prenom} ${nom}`), cle(`${nom} ${prenom}`)] : [cle(nom)]);
  return section.products.find((p) => cles.has(cle(p.name)))?.id ?? null;
}

async function rpc<T>(fonction: string, corps: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${CMS_CONNEXION.supabaseUrl}/rest/v1/rpc/${fonction}`, {
    method: "POST",
    headers: {
      apikey: CMS_CONNEXION.supabaseAnonKey,
      Authorization: `Bearer ${CMS_CONNEXION.supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_secret: secret(), ...corps }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`CMS : ${fonction} a répondu ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

/** Page publique mise à jour tout de suite (la lecture du CMS n'est pas mise en cache). */
function rafraichirPages() {
  revalidatePath("/", "layout");
}

/**
 * Relie la fiche existante de la personne, ou en crée une.
 * Renvoie l'identifiant et si elle a été créée.
 */
export async function creerOuRelierFiche(fiche: {
  role: MembreRole;
  prenom: string | null;
  nom: string;
  description: string;
  sports: string[];
}): Promise<{ id: string; creee: boolean }> {
  const existante = await trouverFiche(fiche.role, fiche.prenom, fiche.nom);
  if (existante) return { id: existante, creee: false };
  const nomAffiche = fiche.prenom ? `${fiche.prenom} ${fiche.nom}` : fiche.nom;
  const id = await rpc<string>("fiche_membre_creer", {
    p_site_id: CMS_CONNEXION.siteId,
    p_section: sectionPourRole(fiche.role),
    p_nom: nomAffiche,
    p_description: fiche.description,
    p_sports: fiche.sports,
  });
  rafraichirPages();
  return { id, creee: true };
}

export async function supprimerFiche(id: string): Promise<boolean> {
  const supprimee = await rpc<boolean>("fiche_membre_supprimer", { p_id: id });
  rafraichirPages();
  return supprimee;
}
