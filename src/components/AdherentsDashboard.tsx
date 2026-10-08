import type { AdherentSaisonRow } from "@/lib/db";
import { kpiAdherents, kpiFinancier, kpiStatuts, isPaye, type KpiCellule, type KpiLigne } from "@/lib/adherentsKpi";

const cardClass = "rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm";
const thClass = "px-3 py-2 text-left font-semibold text-toac-blue-950";
const tdClass = "px-3 py-1.5 text-toac-blue-900";

function euros(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function Cellule({ c }: { c: KpiCellule }) {
  return (
    <td className={`${tdClass} whitespace-nowrap text-right`}>
      <strong>{c.valeur ?? "—"}</strong>
      {c.pourcentage !== null ? <span className="ml-2 text-toac-blue-900/60">{c.pourcentage} %</span> : null}
    </td>
  );
}

function TableKpi({ titre, lignes }: { titre: string; lignes: KpiLigne[] }) {
  return (
    <section className={cardClass}>
      <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">{titre}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200">
            <tr>
              <th className={thClass} />
              <th className={`${thClass} text-right`}>Global</th>
              <th className={`${thClass} text-right`}>Anciens</th>
              <th className={`${thClass} text-right`}>Nouveaux</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.libelle} className="border-b border-toac-gray-100 last:border-0">
                <th className={`${tdClass} text-left font-medium`}>{l.libelle}</th>
                <Cellule c={l.global} />
                <Cellule c={l.anciens} />
                <Cellule c={l.nouveaux} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Indicateurs de l'onglet « Tableau de bord » du Google Sheets d'adhésion,
 * recalculés à partir de la liste importée (Bureau → Attestations).
 */
export default function AdherentsDashboard({ adherents }: { adherents: AdherentSaisonRow[] }) {
  const payes = adherents.filter(isPaye);
  const financier = kpiFinancier(adherents);
  const statuts = kpiStatuts(adherents);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TableKpi titre="Adhérents (dossiers payés)" lignes={kpiAdherents(payes)} />
      <TableKpi titre="Tous les dossiers" lignes={kpiAdherents(adherents)} />

      <section className={cardClass}>
        <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Financier</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-toac-gray-200">
              <tr>
                <th className={thClass} />
                <th className={`${thClass} text-right`}>Attendu</th>
                <th className={`${thClass} text-right`}>Réglé</th>
                <th className={`${thClass} text-right`}>% réglé</th>
                <th className={`${thClass} text-right`}>Reste dû</th>
              </tr>
            </thead>
            <tbody>
              {financier.map((f) => (
                <tr key={f.libelle} className="border-b border-toac-gray-100 last:border-0">
                  <th className={`${tdClass} text-left font-medium`}>{f.libelle}</th>
                  <td className={`${tdClass} text-right`}>{euros(f.attendu)}</td>
                  <td className={`${tdClass} text-right`}>{euros(f.regle)}</td>
                  <td className={`${tdClass} text-right`}>
                    {f.attendu > 0 ? `${Math.round((f.regle / f.attendu) * 100)} %` : "—"}
                  </td>
                  <td className={`${tdClass} text-right`}>{euros(f.attendu - f.regle)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Par statut de dossier</h2>
        <ul className="text-sm text-toac-blue-900">
          {statuts.map((s) => (
            <li key={s.statut} className="flex justify-between border-b border-toac-gray-100 py-1.5 last:border-0">
              <span>{s.statut}</span>
              <strong>{s.total}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
