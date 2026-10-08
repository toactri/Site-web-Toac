import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getAdherentsSaison,
  getBureauCompteurs,
  getLatestSaison,
  DatabaseNotConfiguredError,
  type AdherentSaisonRow,
  type BureauCompteurs,
} from "@/lib/db";
import AdherentsDashboard from "@/components/AdherentsDashboard";
import AdherentsSaisonTable from "@/components/AdherentsSaisonTable";
import DbSetupNotice from "@/components/DbSetupNotice";
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

  let saison: string | null = null;
  let adherents: AdherentSaisonRow[] = [];
  let compteurs: BureauCompteurs | null = null;
  let dbError = false;
  try {
    [saison, compteurs] = await Promise.all([getLatestSaison(), getBureauCompteurs()]);
    if (saison) adherents = await getAdherentsSaison(saison);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }
  const importeLe = adherents[0]?.importe_le;
  // Les colonnes Profil, TDL… n'existent que depuis l'ajout des indicateurs :
  // une liste importée avant reste à réimporter pour les alimenter.
  const aReimporter = adherents.length > 0 && adherents.every((a) => a.profil === null);

  const tuiles = [
    {
      href: "/espace-adherents/bureau/partenaires",
      titre: "Avantages partenaires",
      valides: compteurs?.partenaires.valides,
      libelleValides: "activés",
      enAttente: compteurs?.partenaires.aTraiter,
      libelleEnAttente: "à traiter",
    },
    {
      href: "/espace-adherents/bureau/musculation",
      titre: "Décharges musculation",
      valides: compteurs?.musculation.valides,
      libelleValides: "validées",
      enAttente: compteurs?.musculation.aTraiter,
      libelleEnAttente: "en attente de confirmation",
    },
    {
      href: "/espace-adherents/bureau/attestations",
      titre: "Attestations de paiement",
      valides: compteurs?.attestations.valides,
      libelleValides: "envoyées",
      enAttente: compteurs?.attestations.aTraiter,
      libelleEnAttente: "non envoyées",
    },
  ];

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
              "Adhérents de la saison et indicateurs du tableau de bord, d'après la dernière liste importée depuis le Google Sheets d'adhésion (Bureau → Attestations de paiement)."
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
            Adhérents de la saison et indicateurs du tableau de bord, d&apos;après la dernière liste importée
            depuis le Google Sheets d&apos;adhésion (Bureau → Attestations de paiement).
          </p>
        </>
      )}

      {/* Demandes d'adhésion et Pré-inscriptions ne sont pas proposées ici :
          les adhésions de la saison sont suivies hors du site (Google Form +
          paiement sur l'espace FFTRI). Le paiement en ligne Monetico a été
          retiré du code en octobre 2026 (voir l'historique git). */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tuiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-lg border border-toac-blue-800 bg-white p-4 shadow-sm hover:bg-toac-blue-950 hover:text-white"
          >
            <span className="block text-sm font-medium text-toac-blue-950 group-hover:text-white">{t.titre} →</span>
            <span className="mt-2 block font-display text-4xl text-toac-blue-950 group-hover:text-white">
              {t.valides ?? "—"}
            </span>
            <span className="block text-sm text-toac-blue-900/80 group-hover:text-white/80">
              {t.libelleValides}
              {t.enAttente ? (
                <>
                  {" · "}
                  <strong className="text-amber-800 group-hover:text-amber-200">
                    {t.enAttente} {t.libelleEnAttente}
                  </strong>
                </>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/espace-adherents/bureau/diagnostic"
          className="rounded-md border border-toac-blue-800/40 px-4 py-2 text-sm font-medium text-toac-blue-900/70 hover:bg-toac-blue-950 hover:text-white"
        >
          Diagnostic serveur →
        </Link>
      </div>

      {dbError ? (
        <div className="mt-8"><DbSetupNotice /></div>
      ) : !saison ? (
        <p className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Aucune liste d&apos;adhérents importée. Importez l&apos;onglet « Dossiers (tri/nom) » du Google Sheets
          depuis{" "}
          <Link href="/espace-adherents/bureau/attestations" className="underline">Attestations de paiement</Link>.
        </p>
      ) : (
        <>
          <h2 className="mt-10 font-display text-xl uppercase text-toac-blue-950">Tableau de bord — saison {saison}</h2>
          {importeLe ? (
            <p className="mt-1 text-sm text-toac-blue-900/70">
              Données du Google Sheets importées le{" "}
              {new Date(importeLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}
              {" "}— pour actualiser, réimportez la liste depuis{" "}
              <Link href="/espace-adherents/bureau/attestations" className="underline">Attestations de paiement</Link>.
            </p>
          ) : null}
          {aReimporter ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              La liste actuelle a été importée avant l&apos;ajout des indicateurs : réimportez-la une fois depuis{" "}
              <Link href="/espace-adherents/bureau/attestations" className="underline">Attestations de paiement</Link>{" "}
              pour remplir le profil, le bénévolat TDL, le tarif et les montants.
            </p>
          ) : null}
          <div className="mt-4">
            <AdherentsDashboard adherents={adherents} />
          </div>
          <h2 className="mt-10 mb-4 font-display text-xl uppercase text-toac-blue-950">Liste des adhérents</h2>
          <AdherentsSaisonTable adherents={adherents} />
        </>
      )}
    </div>
  );
}
