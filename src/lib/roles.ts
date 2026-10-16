import "server-only";
import {
  addRoleMembre,
  getParametres,
  getRolesMembre,
  isAdherentSaisonCourante,
  setParametre,
  DatabaseNotConfiguredError,
  type MembreRole,
} from "@/lib/db";
import { superAdminEmails } from "@/lib/superAdmin";

/**
 * Rôles des personnes connectées par email.
 *
 * - Super-administrateurs : SUPER_ADMIN_EMAILS (variables Vercel), seul
 *   réglage hors du site. Ils gèrent les rôles, les imports et le signataire,
 *   et ont toujours accès à la vue bureau : personne ne peut les en retirer
 *   depuis le site.
 * - Bureau et coach : attribués sur le site par un super-administrateur
 *   (Bureau → Rôles et accès, table roles_membres). Relus à chaque requête :
 *   un retrait s'applique à la page suivante, un ajout sans reconnexion.
 *
 * ADMIN_EMAILS (ancien réglage Vercel du bureau) est repris une seule fois dans
 * roles_membres puis ignoré : la variable peut ensuite être supprimée.
 */

const PARAM_MIGRATION = "roles_admin_emails_migres_le";

function emailsAdminVercel(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

let migration: Promise<void> | null = null;

/** Reprend ADMIN_EMAILS dans roles_membres, une fois pour toutes. */
function migrerAdminEmails(): Promise<void> {
  if (!migration) {
    migration = (async () => {
      const deja = await getParametres([PARAM_MIGRATION]);
      if (deja[PARAM_MIGRATION]) return;
      for (const email of emailsAdminVercel()) {
        await addRoleMembre(email, "bureau", null, "ADMIN_EMAILS (Vercel)");
      }
      await setParametre(PARAM_MIGRATION, new Date().toISOString());
    })().catch((error) => {
      migration = null;
      throw error;
    });
  }
  return migration;
}

export interface RolesEffectifs {
  roles: MembreRole[];
  superAdmin: boolean;
  /** Adhérent de la saison la plus récente (calculé seulement sans rôle ni super-admin). */
  adherent: boolean;
  /** Nom saisi sur le site pour une personne non adhérente. */
  nom: string | null;
}

export async function resolveRoles(rawEmail: string): Promise<RolesEffectifs> {
  const email = rawEmail.trim().toLowerCase();
  const superAdmin = superAdminEmails().has(email);
  try {
    await migrerAdminEmails();
    const { roles, nom } = await getRolesMembre(email);
    const adherent = superAdmin || roles.length > 0 ? true : await isAdherentSaisonCourante(email);
    return { roles, superAdmin, nom, adherent };
  } catch (error) {
    // Sans base (développement), on s'en tient à l'ancien réglage Vercel.
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return { roles: emailsAdminVercel().includes(email) ? ["bureau"] : [], superAdmin, nom: null, adherent: true };
  }
}

/**
 * Accès à l'espace adhérents : adhérent de la saison, titulaire d'un rôle ou
 * super-administrateur. Une personne qui perd son rôle sans être adhérente, ou
 * un adhérent absent de la nouvelle saison importée, est déconnecté.
 */
export function aAccesEspace(r: RolesEffectifs): boolean {
  return r.superAdmin || r.roles.length > 0 || r.adherent;
}

/** Accès à la vue bureau : rôle bureau ou super-administrateur. */
export function aAccesBureau(r: RolesEffectifs): boolean {
  return r.superAdmin || r.roles.includes("bureau");
}
