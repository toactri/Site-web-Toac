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
import AdminAttestationsTable from "@/components/AdminAttestationsTable";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Attestations de paiement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BureauAttestationsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/attestations");
  if (session.role !== "admin") redirect("/espace-adherents");

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

  // La liste des adhérents et le signataire se règlent dans Bureau → Imports.
  const ouvert = stats.length > 0 && Boolean(settings.tresorierNom && settings.signaturePath);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Attestations de paiement
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Les adhérents demandent leur attestation (licence FFTri + cotisation club, pour leur CSE) sur{" "}
        <Link href="/attestation-adhesion" className="underline">/attestation-adhesion</Link>. Elle est générée à
        partir de la liste des adhérents et envoyée à l&apos;email de leur dossier.{" "}
        {ouvert ? (
          <strong className="text-emerald-700">Service ouvert.</strong>
        ) : (
          <strong className="text-amber-800">
            Service fermé tant que la liste n&apos;est pas importée et que le trésorier et sa signature ne sont pas
            renseignés.
          </strong>
        )}{" "}
        {stats[0] ? (
          <>
            Liste des adhérents {stats[0].saison} : {stats[0].payes} dossiers payés, importée le{" "}
            {new Date(stats[0].importe_le).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} —{" "}
          </>
        ) : null}
        <Link href="/espace-adherents/bureau/imports" className="underline">Imports</Link>.
      </p>

      {dbError ? (
        <div className="mt-8"><DbSetupNotice /></div>
      ) : (
        <>
          <h2 className="mt-8 mb-4 font-display text-lg uppercase text-toac-blue-950">
            Attestations envoyées ({attestations.length})
          </h2>
          <AdminAttestationsTable attestations={attestations} />
        </>
      )}
    </div>
  );
}
