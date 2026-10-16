import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin, superAdminEmails } from "@/lib/superAdmin";
import { resolveRoles } from "@/lib/roles";
import { listRolesMembres, DatabaseNotConfiguredError, type RoleMembreRow } from "@/lib/db";
import AdminRolesManager from "@/components/AdminRolesManager";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Rôles et accès",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Gestion des rôles bureau et coach, réservée aux super-administrateurs. */
export default async function BureauRolesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/roles");
  if (!isSuperAdmin(session)) redirect("/espace-adherents/bureau");

  let roles: RoleMembreRow[] = [];
  let dbError = false;
  try {
    // Garantit la reprise unique de ADMIN_EMAILS avant d'afficher la liste.
    await resolveRoles(session.username);
    roles = await listRolesMembres();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Vue bureau — Rôles et accès</h1>
      <p className="mt-4 text-toac-blue-900/80">
        <strong>Bureau</strong> : accès à la vue bureau. <strong>Coach</strong> : connexion à l&apos;espace adhérents,
        même sans être adhérent ; les accès propres aux coachs viendront s&apos;y ajouter. Un ajout ou un retrait
        s&apos;applique immédiatement, sans que la personne ait à se reconnecter.
      </p>
      <p className="mt-2 text-sm text-toac-blue-900/70">
        Super-administrateurs (gestion des rôles, imports, signataire), définis dans Vercel (SUPER_ADMIN_EMAILS) et
        non modifiables ici : {[...superAdminEmails()].join(", ") || "aucun"}.
      </p>

      <div className="mt-8">
        {dbError ? <DbSetupNotice /> : <AdminRolesManager roles={roles} />}
      </div>
    </div>
  );
}
