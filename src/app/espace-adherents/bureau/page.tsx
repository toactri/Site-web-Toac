import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMembers, DatabaseNotConfiguredError } from "@/lib/db";
import AdminMembersTable from "@/components/AdminMembersTable";
import DbSetupNotice from "@/components/DbSetupNotice";
import type { Member } from "@/lib/types";
import { getCmsPageBlocks } from "@/lib/cms";
import { CmsEditableText } from "@/components/cms-edit";

export const metadata: Metadata = {
  title: "Vue bureau — Dossiers adhérents",
  robots: { index: false, follow: false },
};

export default async function BureauDossiersPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau");
  if (session.role !== "admin") redirect("/espace-adherents/dossier");

  let members: Member[];
  let dbError = false;
  try {
    members = await getMembers();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      dbError = true;
      members = [];
    } else {
      throw error;
    }
  }

  const introBlocks = await getCmsPageBlocks("espace-bureau");
  const introBlock = introBlocks?.[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {introBlock ? (
        <>
          <CmsEditableText
            as="h1"
            value={introBlock.heading || "Vue bureau — Dossiers adhérents"}
            target={{ kind: "block", id: introBlock.id, field: "heading" }}
            className="section-title block font-display text-3xl uppercase text-toac-blue-950"
          />
          <CmsEditableText
            as="p"
            value={
              introBlock.body ||
              "Dossiers importés du club (CSV) et nouvelles demandes d'adhésion, dans la même liste. Cochez les étapes au fur et à mesure — les changements sont enregistrés immédiatement."
            }
            target={{ kind: "block", id: introBlock.id, field: "body" }}
            multiline
            className="mt-4 block text-toac-blue-900/80"
          />
        </>
      ) : (
        <>
          <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
            Vue bureau — Dossiers adhérents
          </h1>
          <p className="mt-4 text-toac-blue-900/80">
            Dossiers importés du club (CSV) et nouvelles demandes d&apos;adhésion, dans la même liste. Cochez
            les étapes au fur et à mesure — les changements sont enregistrés immédiatement.
          </p>
        </>
      )}

      {/* Demandes d'adhésion et Pré-inscriptions ne sont pas proposées ici :
          les adhésions de la saison sont suivies hors du site (Google Form +
          paiement sur l'espace FFTRI). Le paiement en ligne Monetico a été
          retiré du code en octobre 2026 (voir l'historique git). */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/espace-adherents/bureau/partenaires"
          className="rounded-md border border-toac-blue-800 px-4 py-2 text-sm font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
        >
          Avantages partenaires →
        </Link>
        <Link
          href="/espace-adherents/bureau/musculation"
          className="rounded-md border border-toac-blue-800 px-4 py-2 text-sm font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
        >
          Décharges musculation →
        </Link>
        <Link
          href="/espace-adherents/bureau/attestations"
          className="rounded-md border border-toac-blue-800 px-4 py-2 text-sm font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
        >
          Attestations de paiement →
        </Link>
        <Link
          href="/espace-adherents/bureau/diagnostic"
          className="rounded-md border border-toac-blue-800/40 px-4 py-2 text-sm font-medium text-toac-blue-900/70 hover:bg-toac-blue-950 hover:text-white"
        >
          Diagnostic serveur →
        </Link>
      </div>

      <div className="mt-8">
        {dbError ? <DbSetupNotice /> : <AdminMembersTable members={members} />}
      </div>
    </div>
  );
}
