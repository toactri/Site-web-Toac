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
  importes: number;
  rejets: { ligne: number; nom: string; raison: string }[];
  avertissements: string[];
}

/** Import de l'onglet « Dossiers adhésion » (CSV) pour une saison. */
export function AttestationsImportForm({ defaultSaison }: { defaultSaison: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const saison = String(new FormData(form).get("saison") ?? "");
    if (!window.confirm(`Remplacer tous les adhérents ${saison} enregistrés par le contenu de ce fichier ?`)) return;

    setSending(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/admin/attestations/import", { method: "POST", body: new FormData(form) });
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
        <li>Dans le Google Sheets d&apos;adhésion, ouvrez l&apos;onglet « Dossiers (tri/nom) ».</li>
        <li>Fichier → Télécharger → Valeurs séparées par des virgules (.csv).</li>
        <li>Déposez le fichier ci-dessous. L&apos;import remplace la liste de la saison choisie.</li>
      </ol>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div>
          <label htmlFor="import-saison" className={labelClass}>Saison</label>
          <input id="import-saison" name="saison" required defaultValue={defaultSaison} className={inputClass} />
        </div>
        <div>
          <label htmlFor="import-fichier" className={labelClass}>Fichier CSV</label>
          <input id="import-fichier" name="fichier" type="file" accept=".csv,text/csv" required className={fileInputClass} />
        </div>
      </div>
      <button type="submit" disabled={sending} className={buttonClass}>
        {sending ? "Import…" : "Importer"}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      {report && (
        <div role="status" className="space-y-2 rounded-md border border-toac-gray-200 bg-toac-gray-50 p-3 text-sm">
          <p className="font-medium text-emerald-700">
            ✓ {report.importes} adhérent(s) importé(s) pour la saison {report.saison}.
          </p>
          {report.avertissements.map((a) => (
            <p key={a} className="text-amber-800">⚠ {a}</p>
          ))}
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
  );
}

/** Nom du trésorier signataire et image de sa signature. */
export function AttestationsSettingsForm({
  tresorierNom,
  signatureHref,
}: {
  tresorierNom: string | null;
  signatureHref: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/attestations/parametres", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage({ ok: false, text: data?.error ?? "L'enregistrement a échoué." });
        return;
      }
      setMessage({ ok: true, text: "Réglages enregistrés." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Erreur réseau. Réessayez plus tard." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tresorier-nom" className={labelClass}>Trésorier signataire (prénom NOM)</label>
        <input
          id="tresorier-nom"
          name="tresorierNom"
          required
          defaultValue={tresorierNom ?? ""}
          placeholder="ex. Erwan LEJEAN"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="tresorier-signature" className={labelClass}>
          Image de signature (PNG ou JPG, fond blanc ou transparent)
        </label>
        {signatureHref ? (
          // eslint-disable-next-line @next/next/no-img-element -- image privée servie par /api/documents
          <img
            src={signatureHref}
            alt="Signature actuelle"
            className="mb-2 h-20 rounded border border-toac-gray-200 bg-white object-contain p-1"
          />
        ) : (
          <p className="mb-2 text-sm text-amber-800">Aucune signature déposée pour l&apos;instant.</p>
        )}
        <input
          id="tresorier-signature"
          name="signature"
          type="file"
          accept="image/png,image/jpeg"
          required={!signatureHref}
          className={fileInputClass}
        />
      </div>
      <button type="submit" disabled={sending} className={buttonClass}>
        {sending ? "Enregistrement…" : "Enregistrer"}
      </button>
      {message && (
        <p role="status" className={`text-sm font-medium ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
