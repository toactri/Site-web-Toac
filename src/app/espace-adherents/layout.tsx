import { getSession } from "@/lib/session";
import { recordVisiteEspace } from "@/lib/db";

/**
 * Consigne la visite de l'espace adhérents (date de dernier accès dans la vue
 * bureau). Seuls les comptes connectés par email sont suivis ; une erreur
 * d'enregistrement n'empêche jamais d'afficher la page.
 */
export default async function EspaceAdherentsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.username.includes("@")) {
    await recordVisiteEspace(session.username).catch((error) =>
      console.error("[espace] Échec de l'enregistrement de la visite :", error)
    );
  }
  return children;
}
