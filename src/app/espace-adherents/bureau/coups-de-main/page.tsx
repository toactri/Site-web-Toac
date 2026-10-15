import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import {
  getCoupsDeMainSaison,
  getLatestSaison,
  DatabaseNotConfiguredError,
  type CoupDeMainAdherentRow,
} from "@/lib/db";
import { currentSaison } from "@/lib/adherentsImport";
import { coupsDeMainStats, type Correlation, type Repartition } from "@/lib/coupsDeMain";
import CoupsDeMainTable from "@/components/CoupsDeMainTable";
import CoupsDeMainImportForm from "@/components/CoupsDeMainImportForm";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Coups de main",
  robots: { index: false, follow: false },
};

const cardClass = "rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm";
const thClass = "px-3 py-2 text-left font-semibold text-toac-blue-950";
const tdClass = "px-3 py-1.5 text-toac-blue-900";

/** Barre de proportion : repère visuel seulement, la valeur est écrite à côté. */
function Barre({ pourcentage }: { pourcentage: number }) {
  return (
    <div className="h-2.5 w-full min-w-24 rounded-r bg-toac-gray-100" aria-hidden="true">
      <div className="h-full rounded-r bg-toac-blue-700" style={{ width: `${pourcentage}%` }} />
    </div>
  );
}

function TableRepartition({ titre, aide, lignes }: { titre: string; aide: string; lignes: Repartition[] }) {
  return (
    <section className={cardClass}>
      <h2 className="font-display text-lg uppercase text-toac-blue-950">{titre}</h2>
      <p className="mb-3 text-xs text-toac-blue-900/60">{aide}</p>
      <table className="w-full text-sm tabular-nums">
        <tbody>
          {lignes.map((l) => (
            <tr key={l.libelle} className="border-b border-toac-gray-100 last:border-0">
              <th className={`${tdClass} text-left font-medium`}>{l.libelle}</th>
              <td className={`${tdClass} w-10 text-right font-semibold`}>{l.effectif}</td>
              <td className={`${tdClass} w-16 whitespace-nowrap text-right text-toac-blue-900/60`}>{l.pourcentage} %</td>
              <td className={`${tdClass} w-1/3`}>
                <Barre pourcentage={l.pourcentage} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TableCorrelation({ titre, lignes }: { titre: string; lignes: Correlation[] }) {
  return (
    <section className={cardClass}>
      <h3 className="mb-2 font-display text-base uppercase text-toac-blue-950">{titre}</h3>
      <table className="w-full text-sm tabular-nums">
        <thead className="border-b border-toac-gray-200">
          <tr>
            <th className={thClass} />
            <th className={`${thClass} text-right`}>Adhérents</th>
            <th className={`${thClass} text-right`}>Motivés</th>
            <th className={thClass} />
            <th className={`${thClass} text-right`}>Actions / pers.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.groupe} className="border-b border-toac-gray-100 last:border-0">
              <th className={`${tdClass} text-left font-medium`}>{l.groupe}</th>
              <td className={`${tdClass} text-right`}>{l.effectif}</td>
              <td className={`${tdClass} whitespace-nowrap text-right font-semibold`}>
                {l.motives} <span className="font-normal text-toac-blue-900/60">({l.pourcentageMotives} %)</span>
              </td>
              <td className={`${tdClass} w-1/4`}>
                <Barre pourcentage={l.pourcentageMotives} />
              </td>
              <td className={`${tdClass} text-right`}>{l.moyenneActions.toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function BureauCoupsDeMainPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/coups-de-main");
  if (session.role !== "admin") redirect("/espace-adherents");
  const superAdmin = isSuperAdmin(session);

  let saison: string | null = null;
  let adherents: CoupDeMainAdherentRow[] = [];
  let dbError = false;
  try {
    saison = await getLatestSaison();
    if (saison) adherents = await getCoupsDeMainSaison(saison);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }
  const stats = coupsDeMainStats(adherents);
  const importeLe = adherents.find((a) => a.importe_le)?.importe_le;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Vue bureau — Coups de main</h1>
      <p className="mt-4 text-toac-blue-900/80">
        Réponses à la question « Je souhaite donner un coup de main sur : » du formulaire d&apos;adhésion
        {saison ? ` (saison ${saison})` : ""}, pour solliciter les adhérents motivés par chaque action.
        {importeLe
          ? ` Dernier import le ${new Date(importeLe).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.`
          : ""}
      </p>

      {dbError ? (
        <div className="mt-8">
          <DbSetupNotice />
        </div>
      ) : stats.repondants === 0 ? (
        <p className="mt-8 rounded-md border border-toac-gray-200 bg-toac-gray-50 p-4 text-sm text-toac-blue-900/70">
          Aucune réponse importée pour l&apos;instant
          {superAdmin ? " : importez l'onglet « Réponses » ci-dessous." : " : le super-administrateur doit importer l'onglet « Réponses »."}
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { valeur: stats.motives, libelle: "adhérents prêts à donner un coup de main" },
              {
                valeur: `${Math.round((stats.motives / stats.repondants) * 100)} %`,
                libelle: `des ${stats.repondants} adhérents dont la réponse est connue`,
              },
              {
                valeur: stats.adherents - stats.repondants,
                libelle: "adhérents sans réponse rattachée (non comptés ci-dessous)",
              },
            ].map((t) => (
              <div key={t.libelle} className={cardClass}>
                <span className="block font-display text-4xl text-toac-blue-950">{t.valeur}</span>
                <span className="block text-sm text-toac-blue-900/80">{t.libelle}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TableRepartition
              titre="Motivation par action"
              aide={`Nombre et % des ${stats.repondants} répondants ayant coché chaque action (plusieurs choix possibles).`}
              lignes={stats.parAction}
            />
            <TableRepartition
              titre="Nombre d'actions cochées"
              aide="0 = « Je préfère profiter des entraînements » ou rien de coché."
              lignes={stats.parNombre}
            />
          </div>

          <h2 className="mt-10 font-display text-lg uppercase text-toac-blue-950">Motivation selon le profil</h2>
          <p className="mb-4 text-sm text-toac-blue-900/70">
            Part des adhérents motivés (au moins une action cochée) et nombre moyen d&apos;actions par personne, pour
            chaque groupe. Sur de petits effectifs, un écart de quelques points n&apos;est pas significatif.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.correlations.map((c) => (
              <TableCorrelation key={c.titre} titre={c.titre} lignes={c.lignes} />
            ))}
          </div>

          <h2 className="mt-10 mb-4 font-display text-lg uppercase text-toac-blue-950">Adhérents et actions</h2>
          <CoupsDeMainTable
            actions={stats.actions}
            lignes={adherents
              .filter((a) => a.actions !== null)
              .map((a) => ({ id: a.id, nom: a.nom, prenom: a.prenom, actions: a.actions ?? [] }))}
          />
        </>
      )}

      {superAdmin && !dbError && (
        <section className={`${cardClass} mt-10`}>
          <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Importer les réponses</h2>
          <CoupsDeMainImportForm defaultSaison={saison ?? currentSaison()} />
        </section>
      )}
    </div>
  );
}
