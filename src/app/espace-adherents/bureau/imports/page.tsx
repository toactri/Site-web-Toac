import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import { getAdherentsSaisonStats, getCoupsDeMainStats, DatabaseNotConfiguredError } from "@/lib/db";
import { getAttestationSettings, type AttestationSettings } from "@/lib/attestation";
import { currentSaison } from "@/lib/adherentsImport";
import { documentHref } from "@/lib/documentUrl";
import { AttestationsImportForm, AttestationsSettingsForm } from "@/components/AdminAttestationsSetup";
import CoupsDeMainImportForm from "@/components/CoupsDeMainImportForm";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Imports",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cardClass = "rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm";
const dateCourte = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Imports du Google Sheets d'adhésion et réglages du signataire des
 * attestations. Tout le bureau voit l'état des données ; seuls les
 * super-administrateurs (SUPER_ADMIN_EMAILS) importent et modifient.
 */
export default async function BureauImportsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/imports");
  if (session.role !== "admin") redirect("/espace-adherents");
  // Réservé au super-administrateur (Bureau → Admin).
  if (!isSuperAdmin(session)) redirect("/espace-adherents/bureau");
  const superAdmin = true;

  let adherents: Awaited<ReturnType<typeof getAdherentsSaisonStats>> = [];
  let coupsDeMain: Awaited<ReturnType<typeof getCoupsDeMainStats>> = [];
  let settings: AttestationSettings = { tresorierNom: null, signaturePath: null };
  let dbError = false;
  try {
    [adherents, coupsDeMain, settings] = await Promise.all([
      getAdherentsSaisonStats(),
      getCoupsDeMainStats(),
      getAttestationSettings(),
    ]);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }
  const saisonParDefaut = adherents[0]?.saison ?? currentSaison();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Vue bureau — Imports</h1>
      <p className="mt-4 text-toac-blue-900/80">
        Données reprises du Google Sheets d&apos;adhésion et réglages des attestations de paiement.{" "}
        {superAdmin
          ? "Importez d'abord la liste des adhérents : les réponses au formulaire y sont rattachées."
          : "Les imports et le signataire sont réservés au super-administrateur ; vous voyez ici l'état des données."}
      </p>

      {dbError ? (
        <div className="mt-8"><DbSetupNotice /></div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-1 font-display text-lg uppercase text-toac-blue-950">1. Liste des adhérents</h2>
            <p className="mb-3 text-sm text-toac-blue-900/70">
              Onglet « Dossiers (tri/nom) ». Alimente la vue bureau, les attestations, la musculation, la connexion à
              l&apos;espace adhérents et les coups de main.
            </p>
            {adherents.length > 0 ? (
              <ul className="mb-4 text-sm text-toac-blue-900/80">
                {adherents.map((s) => (
                  <li key={s.saison}>
                    Saison {s.saison} : <strong>{s.total}</strong> dossiers dont <strong>{s.payes}</strong> payés
                    (importés le {dateCourte(s.importe_le)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-amber-800">Aucune liste importée.</p>
            )}
            {superAdmin && <AttestationsImportForm defaultSaison={saisonParDefaut} />}
          </section>

          <section className={cardClass}>
            <h2 className="mb-1 font-display text-lg uppercase text-toac-blue-950">2. Réponses au formulaire</h2>
            <p className="mb-3 text-sm text-toac-blue-900/70">
              Onglet « Réponses ». Alimente la page Coups de main (question « Je souhaite donner un coup de main
              sur : »).
            </p>
            {coupsDeMain.length > 0 ? (
              <ul className="mb-4 text-sm text-toac-blue-900/80">
                {coupsDeMain.map((s) => (
                  <li key={s.saison}>
                    Saison {s.saison} : <strong>{s.total}</strong> réponses d&apos;adhérents dont{" "}
                    <strong>{s.motives}</strong> motivés (importées le {dateCourte(s.importe_le)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-amber-800">Aucune réponse importée.</p>
            )}
            {superAdmin && <CoupsDeMainImportForm defaultSaison={saisonParDefaut} />}
          </section>

          <section className={cardClass}>
            <h2 className="mb-1 font-display text-lg uppercase text-toac-blue-950">Signataire des attestations</h2>
            <p className="mb-3 text-sm text-toac-blue-900/70">
              Nom du trésorier et image de sa signature, apposés sur les attestations de paiement.
            </p>
            {superAdmin ? (
              <AttestationsSettingsForm
                tresorierNom={settings.tresorierNom}
                signatureHref={settings.signaturePath ? documentHref(settings.signaturePath) : null}
              />
            ) : (
              <p className="text-sm text-toac-blue-900/80">
                {settings.tresorierNom ? (
                  <>
                    Trésorier : <strong>{settings.tresorierNom}</strong> —{" "}
                    {settings.signaturePath ? "signature enregistrée." : "signature manquante."}
                  </>
                ) : (
                  <span className="text-amber-800">Trésorier et signature non renseignés.</span>
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
