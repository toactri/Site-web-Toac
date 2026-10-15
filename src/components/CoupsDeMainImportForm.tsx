"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass } from "@/components/formStyles";

const buttonClass =
  "rounded-md bg-toac-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-toac-blue-800 disabled:opacity-60";
const fileInputClass =
  "w-full text-sm text-toac-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-toac-blue-950 file:px-4 file:py-2 file:text-sm file:text-white";

interface ImportReport {
  saison: string;
  importees: number;
  nonRetrouvees: string[];
  rejets: string[];
}

/** Import de l'onglet « Réponses » du formulaire d'adhésion (CSV) pour une saison. */
export default function CoupsDeMainImportForm({ defaultSaison }: { defaultSaison: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const saison = String(new FormData(form).get("saison") ?? "");
    if (!window.confirm(`Remplacer les coups de main ${saison} par le contenu de ce fichier ?`)) return;

    setSending(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/admin/coups-de-main/import", { method: "POST", body: new FormData(form) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "L'import a échoué.");
        return;
      }
      setReport(data);
      form.reset();
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez plus tard.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-toac-blue-900/80">
        <li>Dans le Google Sheets d&apos;adhésion, ouvrez l&apos;onglet « Réponses ».</li>
        <li>Fichier → Télécharger → Valeurs séparées par des virgules (.csv).</li>
        <li>
          Déposez le fichier ci-dessous. Seules les réponses des adhérents de la saison (liste importée dans
          Attestations de paiement) sont gardées ; l&apos;import remplace celles de la saison choisie.
        </li>
      </ol>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div>
          <label htmlFor="cdm-saison" className={labelClass}>Saison</label>
          <input id="cdm-saison" name="saison" required defaultValue={defaultSaison} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cdm-fichier" className={labelClass}>Fichier CSV</label>
          <input id="cdm-fichier" name="fichier" type="file" accept=".csv,text/csv" required className={fileInputClass} />
        </div>
      </div>
      <button type="submit" disabled={sending} className={buttonClass}>
        {sending ? "Import…" : "Importer"}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      {report && (
        <div role="status" className="space-y-2 rounded-md border border-toac-gray-200 bg-toac-gray-50 p-3 text-sm">
          <p className="font-medium text-emerald-700">
            ✓ {report.importees} réponse(s) d&apos;adhérents importée(s) pour la saison {report.saison}.
          </p>
          {report.nonRetrouvees.length > 0 && (
            <details>
              <summary className="cursor-pointer text-amber-800">
                {report.nonRetrouvees.length} réponse(s) sans adhésion {report.saison} correspondante, écartée(s)
              </summary>
              <p className="mt-2 text-toac-blue-900/70">
                Adhésion non finalisée, ou nom / date de naissance différents de la liste des adhérents.
              </p>
              <ul className="mt-2 list-disc pl-5 text-toac-blue-900/80">
                {report.nonRetrouvees.map((n, i) => (
                  <li key={`${n}-${i}`}>{n}</li>
                ))}
              </ul>
            </details>
          )}
          {report.rejets.length > 0 && (
            <p className="text-red-700">
              {report.rejets.length} ligne(s) illisible(s) ignorée(s) : {report.rejets.join(", ")}.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
