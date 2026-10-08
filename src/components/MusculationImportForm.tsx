"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { labelClass } from "@/components/formStyles";

const fileInputClass =
  "w-full text-sm text-toac-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-toac-blue-950 file:px-4 file:py-2 file:text-sm file:text-white";

interface ImportReport {
  ajoutes: number;
  misAJour: number;
  rejets: { ligne: number; nom: string; raison: string }[];
}

/**
 * Import (CSV) des adhérents dont la décharge et le certificat médical ont été
 * transmis sur une saison précédente (valables 3 ans) : ils apparaissent comme
 * validés musculation sans avoir à refaire le formulaire en ligne.
 */
export default function MusculationImportForm() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/admin/musculation/import", { method: "POST", body: new FormData(form) });
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
    <details className="mb-8 rounded-lg border border-toac-gray-200 bg-toac-gray-50 p-4">
      <summary className="cursor-pointer font-medium text-toac-blue-950">
        Importer des adhérents déjà validés (dossiers des saisons précédentes)
      </summary>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-toac-blue-900/80">
          <li>
            Pour les adhérents dont la décharge et le certificat médical ont déjà été transmis au club (valables
            3 ans) : ils apparaîtront comme validés sans refaire le formulaire.
          </li>
          <li>
            Fichier CSV avec une ligne d&apos;en-tête : colonnes <strong>Nom</strong> et <strong>Prénom</strong>{" "}
            obligatoires ; <strong>Date de naissance</strong>, <strong>Date décharge</strong> (début des 3 ans
            de validité) et <strong>Commentaire</strong> facultatives.
          </li>
          <li>
            L&apos;import complète la liste (un adhérent déjà présent est mis à jour) : personne n&apos;est
            retiré.
          </li>
        </ul>
        <div>
          <label htmlFor="muscu-import-fichier" className={labelClass}>Fichier CSV</label>
          <input
            id="muscu-import-fichier"
            name="fichier"
            type="file"
            accept=".csv,text/csv"
            required
            className={fileInputClass}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-toac-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-toac-blue-800 disabled:opacity-60"
        >
          {sending ? "Import…" : "Importer"}
        </button>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        {report && (
          <div role="status" className="space-y-2 rounded-md border border-toac-gray-200 bg-white p-3 text-sm">
            <p className="font-medium text-emerald-700">
              ✓ {report.ajoutes} adhérent(s) ajouté(s), {report.misAJour} mis à jour.
            </p>
            {report.rejets.length > 0 && (
              <details>
                <summary className="cursor-pointer text-red-700">{report.rejets.length} ligne(s) ignorée(s)</summary>
                <ul className="mt-2 list-disc pl-5 text-toac-blue-900/80">
                  {report.rejets.map((r) => (
                    <li key={r.ligne}>Ligne {r.ligne} — {r.nom || "?"} : {r.raison}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </form>
    </details>
  );
}
