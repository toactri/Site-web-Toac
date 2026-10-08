import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getMusculationDecharges,
  getMusculationValidations,
  getAdherentsSaisonStats,
  getAdherentsMusculation,
  DatabaseNotConfiguredError,
  type MusculationDechargeRow,
  type MusculationValidationRow,
  type AdherentMusculation,
} from "@/lib/db";
import AdminMusculationTable from "@/components/AdminMusculationTable";
import MusculationValidationChecklist from "@/components/MusculationValidationChecklist";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Décharges musculation",
  robots: { index: false, follow: false },
};

export default async function BureauMusculationPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/musculation");
  if (session.role !== "admin") redirect("/espace-adherents/dossier");

  const { saison: saisonDemandee } = await searchParams;

  let decharges: MusculationDechargeRow[] = [];
  let validations: MusculationValidationRow[] = [];
  let saisons: string[] = [];
  let saison: string | null = null;
  let adherents: AdherentMusculation[] = [];
  let dbError = false;
  try {
    let stats;
    [decharges, validations, stats] = await Promise.all([
      getMusculationDecharges(),
      getMusculationValidations(),
      getAdherentsSaisonStats(),
    ]);
    saisons = stats.map((s) => s.saison);
    saison = saisonDemandee && saisons.includes(saisonDemandee) ? saisonDemandee : (saisons[0] ?? null);
    if (saison) adherents = await getAdherentsMusculation(saison);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      dbError = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Décharges musculation
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Décharges signées et certificats médicaux transmis via la page « Musculation » — un lien devient
        officiel une fois validé (relu et confirmé) par l&apos;adhérent. Les adhérents dont le dossier a été
        transmis sur une saison précédente (valable 3 ans) peuvent être cochés ci-dessous.
      </p>
      <div className="mt-8">
        {dbError ? (
          <DbSetupNotice />
        ) : (
          <>
            <MusculationValidationChecklist saison={saison} saisons={saisons} adherents={adherents} />
            <AdminMusculationTable decharges={decharges} validations={validations} />
          </>
        )}
      </div>
    </div>
  );
}
