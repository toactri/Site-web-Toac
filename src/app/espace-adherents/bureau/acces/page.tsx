import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import {
  getAccesEspace,
  getAdherentsSaisonStats,
  DatabaseNotConfiguredError,
  type AccesEspaceRow,
} from "@/lib/db";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Accès à l'espace adhérents",
  robots: { index: false, follow: false },
};

const dateFr = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export default async function BureauAccesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/acces");
  if (session.role !== "admin") redirect("/espace-adherents");
  // Réservé au super-administrateur (Bureau → Admin).
  if (!isSuperAdmin(session)) redirect("/espace-adherents/bureau");

  let acces: AccesEspaceRow[] = [];
  let totalSaison: { saison: string; total: number } | null = null;
  let dbError = false;
  try {
    const [rows, stats] = await Promise.all([getAccesEspace(), getAdherentsSaisonStats()]);
    acces = rows;
    totalSaison = stats[0] ? { saison: stats[0].saison, total: stats[0].total } : null;
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }
  const adherentsConnectes = acces.filter((a) => a.nom !== null).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Accès à l&apos;espace adhérents
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Adhérents qui se sont connectés à l&apos;espace, du plus récent au plus ancien. Le dernier accès est mis à
        jour à chaque connexion et au plus une fois par heure lors d&apos;une visite.
      </p>

      {dbError ? (
        <div className="mt-8">
          <DbSetupNotice />
        </div>
      ) : (
        <>
          <p className="mt-6 font-medium text-toac-blue-950">
            {adherentsConnectes} adhérent{adherentsConnectes > 1 ? "s" : ""}
            {totalSaison ? ` sur ${totalSaison.total} (saison ${totalSaison.saison})` : ""} se{" "}
            {adherentsConnectes > 1 ? "sont" : "est"} déjà connecté{adherentsConnectes > 1 ? "s" : ""}.
          </p>
          {acces.length === 0 ? (
            <p className="mt-4 text-sm text-toac-blue-900/70">Aucun accès pour l&apos;instant.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-toac-gray-50 text-left text-toac-blue-950">
                  <tr>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Prénom</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">1er accès</th>
                    <th className="px-3 py-2">Dernier accès</th>
                    <th className="px-3 py-2 text-right">Connexions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-toac-gray-100">
                  {acces.map((a) => (
                    <tr key={a.email}>
                      <td className="px-3 py-2">{a.nom ?? <span className="text-toac-blue-900/50">—</span>}</td>
                      <td className="px-3 py-2">{a.prenom ?? ""}</td>
                      <td className="px-3 py-2 text-toac-blue-900/70">{a.email}</td>
                      <td className="whitespace-nowrap px-3 py-2">{dateFr.format(new Date(a.premier_acces))}</td>
                      <td className="whitespace-nowrap px-3 py-2">{dateFr.format(new Date(a.dernier_acces))}</td>
                      <td className="px-3 py-2 text-right">{a.connexions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-toac-blue-900/50">
            « — » : email absent de la dernière liste d&apos;adhérents importée (compte bureau ou adhérent non
            renouvelé).
          </p>
        </>
      )}
    </div>
  );
}
