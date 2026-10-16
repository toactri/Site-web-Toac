import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import {
  getAdherentsSaisonStats,
  getBureauCompteurs,
  listRolesMembres,
  DatabaseNotConfiguredError,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Vue bureau — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Fonctions réservées aux super-administrateurs (SUPER_ADMIN_EMAILS), réunies
 * sur une page : rôles, imports du Google Sheets, fréquentation de l'espace
 * adhérents, diagnostic serveur. Chaque page cible le vérifie aussi.
 */
export default async function BureauAdminPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/admin");
  if (!isSuperAdmin(session)) redirect("/espace-adherents/bureau");

  let nbRoles: number | null = null;
  let acces: number | null = null;
  let dernierImport: string | null = null;
  try {
    const [roles, compteurs, stats] = await Promise.all([
      listRolesMembres(),
      getBureauCompteurs(),
      getAdherentsSaisonStats(),
    ]);
    nbRoles = roles.length;
    acces = compteurs.acces.valides;
    dernierImport = stats[0]
      ? `${stats[0].saison}, le ${new Date(stats[0].importe_le).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`
      : null;
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
  }

  const tuiles = [
    {
      href: "/espace-adherents/bureau/roles",
      titre: "Rôles et accès",
      valeur: nbRoles ?? "—",
      texte: "rôles attribués (bureau, coach)",
    },
    {
      href: "/espace-adherents/bureau/imports",
      titre: "Imports",
      valeur: dernierImport ? "✓" : "—",
      texte: dernierImport ? `liste des adhérents ${dernierImport}` : "aucune liste importée",
    },
    {
      href: "/espace-adherents/bureau/acces",
      titre: "Accès espace adhérents",
      valeur: acces ?? "—",
      texte: "personnes connectées",
    },
    {
      href: "/espace-adherents/bureau/diagnostic",
      titre: "Diagnostic serveur",
      valeur: "⚙",
      texte: "configuration et stockage",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Vue bureau — Admin</h1>
      <p className="mt-4 text-toac-blue-900/80">Fonctions réservées au super-administrateur.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tuiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-lg border border-toac-blue-800 bg-white p-4 shadow-sm hover:bg-toac-blue-950 hover:text-white"
          >
            <span className="block text-sm font-medium text-toac-blue-950 group-hover:text-white">{t.titre} →</span>
            <span className="mt-2 block font-display text-4xl text-toac-blue-950 group-hover:text-white">{t.valeur}</span>
            <span className="block text-sm text-toac-blue-900/80 group-hover:text-white/80">{t.texte}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
