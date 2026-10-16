import "server-only";
import type { SessionPayload } from "@/lib/session";

/**
 * Super-administrateurs : les adresses de SUPER_ADMIN_EMAILS (séparées par des
 * virgules). Eux seuls gèrent les rôles bureau et coach (Bureau → Rôles et
 * accès), importent les fichiers du Google Sheets et modifient le signataire
 * des attestations (Bureau → Imports) — les autres membres du bureau voient ces
 * pages sans les formulaires.
 *
 * Une adresse listée ici a toujours accès à la vue bureau (src/lib/roles.ts) :
 * c'est le seul réglage hors du site, que personne ne peut retirer depuis le
 * site. Sans la variable, personne n'a
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
