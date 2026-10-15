import "server-only";
import type { SessionPayload } from "@/lib/session";

/**
 * Super-administrateurs : les adresses de SUPER_ADMIN_EMAILS (séparées par des
 * virgules). Eux seuls peuvent importer les fichiers du Google Sheets (Bureau →
 * Imports : liste des adhérents, réponses « coups de main ») et modifier le
 * trésorier signataire et sa signature (Bureau → Attestations) — les autres
 * membres du bureau voient ces pages sans les formulaires.
 *
 * Une adresse listée ici obtient aussi le rôle bureau à la connexion par email,
 * même si elle ne figure pas dans ADMIN_EMAILS. Sans la variable, personne n'a
 * accès à ces fonctions : le compte bureau à mot de passe partagé
 * (ADMIN_USERNAME) n'en fait jamais partie.
 */
export function superAdminEmails(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSuperAdmin(session: SessionPayload | null | undefined): boolean {
  return session?.role === "admin" && superAdminEmails().has(session.username.trim().toLowerCase());
}
