import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInscriptions, DatabaseNotConfiguredError, type InscriptionRow } from "@/lib/db";
import AdminInscriptionsTable from "@/components/AdminInscriptionsTable";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Demandes d'adhésion",
  robots: { index: false, follow: false },
};

export default async function BureauInscriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/inscriptions");
  if (session.role !== "admin") redirect("/espace-adherents");

  let inscriptions: InscriptionRow[];
  let dbError = false;
  try {
    inscriptions = await getInscriptions();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      dbError = true;
      inscriptions = [];
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Demandes d&apos;adhésion
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Chaque envoi du formulaire d&apos;adhésion en ligne (page « Nous rejoindre ») est enregistré
        automatiquement ici.
      </p>
      <div className="mt-8">
        {dbError ? <DbSetupNotice /> : <AdminInscriptionsTable inscriptions={inscriptions} />}
      </div>
    </div>
  );
}
