import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPreinscriptions, DatabaseNotConfiguredError, type PreinscriptionRow } from "@/lib/db";
import AdminPreinscriptionsTable from "@/components/AdminPreinscriptionsTable";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Pré-inscriptions",
  robots: { index: false, follow: false },
};

export default async function BureauPreinscriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/preinscriptions");
  if (session.role !== "admin") redirect("/espace-adherents");

  let preinscriptions: PreinscriptionRow[];
  let dbError = false;
  try {
    preinscriptions = await getPreinscriptions();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      dbError = true;
      preinscriptions = [];
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Pré-inscriptions
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Étape 1 du parcours d&apos;adhésion (page « Nous rejoindre ») — chaque envoi est enregistré
        automatiquement ici. Aucun paiement à ce stade.
      </p>
      <div className="mt-8">
        {dbError ? <DbSetupNotice /> : <AdminPreinscriptionsTable preinscriptions={preinscriptions} />}
      </div>
    </div>
  );
}
