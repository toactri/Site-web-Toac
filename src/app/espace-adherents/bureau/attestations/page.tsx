import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getAttestations,
  getAdherentsSaisonStats,
  DatabaseNotConfiguredError,
  type AttestationRow,
} from "@/lib/db";
import { getAttestationSettings, type AttestationSettings } from "@/lib/attestation";
import { currentSaison } from "@/lib/adherentsImport";
import { documentHref } from "@/lib/documentUrl";
import AdminAttestationsTable from "@/components/AdminAttestationsTable";
import { AttestationsImportForm, AttestationsSettingsForm } from "@/components/AdminAttestationsSetup";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Attestations de paiement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BureauAttestationsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/attestations");
  if (session.role !== "admin") redirect("/espace-adherents/dossier");

  let attestations: AttestationRow[] = [];
  let stats: Awaited<ReturnType<typeof getAdherentsSaisonStats>> = [];
  let settings: AttestationSettings = { tresorierNom: null, signaturePath: null };
  let dbError = false;
  try {
    [attestations, stats, settings] = await Promise.all([
      getAttestations(),
      getAdherentsSaisonStats(),
      getAttestationSettings(),
    ]);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }

  const ouvert = stats.length > 0 && Boolean(settings.tresorierNom && settings.signaturePath);
  const cardClass = "rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Attestations de paiement
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Les adhérents demandent leur attestation (licence FFTri + cotisation club, pour leur CSE) sur{" "}
        <Link href="/attestation-adhesion" className="underline">/attestation-adhesion</Link>. Elle est générée à
        partir de la liste importée ci-dessous et envoyée à l&apos;email de leur dossier.{" "}
        {ouvert ? (
          <strong className="text-emerald-700">Service ouvert.</strong>
        ) : (
          <strong className="text-amber-800">
            Service fermé tant que la liste n&apos;est pas importée et que le trésorier et sa signature ne sont pas
            renseignés.
          </strong>
        )}
      </p>

      {dbError ? (
        <div className="mt-8"><DbSetupNotice /></div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className={cardClass}>
              <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Liste des adhérents</h2>
              {stats.length > 0 ? (
                <ul className="mb-4 text-sm text-toac-blue-900/80">
                  {stats.map((s) => (
                    <li key={s.saison}>
                      Saison {s.saison} : <strong>{s.total}</strong> dossiers dont <strong>{s.payes}</strong> payés
                      (importés le{" "}
                      {new Date(s.importe_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-sm text-amber-800">Aucune liste importée.</p>
              )}
              <AttestationsImportForm defaultSaison={stats[0]?.saison ?? currentSaison()} />
            </section>
            <section className={cardClass}>
              <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Signataire</h2>
              <AttestationsSettingsForm
                tresorierNom={settings.tresorierNom}
                signatureHref={settings.signaturePath ? documentHref(settings.signaturePath) : null}
              />
            </section>
          </div>

          <h2 className="mt-10 mb-4 font-display text-lg uppercase text-toac-blue-950">
            Attestations envoyées ({attestations.length})
          </h2>
          <AdminAttestationsTable attestations={attestations} />
        </>
      )}
    </div>
  );
}
