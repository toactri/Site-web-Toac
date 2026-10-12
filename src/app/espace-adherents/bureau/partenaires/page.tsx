import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPartnerSignups, DatabaseNotConfiguredError, type PartnerSignupRow } from "@/lib/db";
import AdminPartnerSignupsTable from "@/components/AdminPartnerSignupsTable";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Gestion adhérents - partenaires",
  robots: { index: false, follow: false },
};

export default async function BureauPartenairesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/partenaires");
  if (session.role !== "admin") redirect("/espace-adherents");

  let signups: PartnerSignupRow[];
  let dbError = false;
  try {
    signups = await getPartnerSignups();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      dbError = true;
      signups = [];
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Gestion adhérents - partenaires
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Demandes d&apos;activation des avantages partenaires (ex. Alltricks) envoyées depuis les pages
        partenaires du site. Le responsable partenariat reçoit un email à chaque demande, avec un lien
        pour confirmer directement ; vous pouvez aussi confirmer depuis cette page. L&apos;adhérent reçoit
        alors automatiquement un email lui confirmant que son avantage est activé.
      </p>
      <div className="mt-8">
        {dbError ? <DbSetupNotice /> : <AdminPartnerSignupsTable signups={signups} />}
      </div>
    </div>
  );
}
