"use client";

import { useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { inputClass, labelClass } from "@/components/formStyles";
import { formatBytes } from "@/lib/uploadLimits";
import {
  BLOB_PREFIX,
  MAX_COMPTE_RENDU_BYTES,
  RUBRIQUES,
  anneesProposees,
  nomFichierCompteRendu,
} from "@/lib/comptesRendus";

const fileInputClass =
  "w-full text-sm text-toac-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-toac-blue-950 file:px-4 file:py-2 file:text-sm file:text-white";

/**
 * Envoi d'un compte rendu de course : le PDF part directement du navigateur
 * vers le store Blob (sans la limite de 4,5 Mo des fonctions), puis
 * /api/comptes-rendus le range dans le sous-dossier Drive de la rubrique.
 */
export default function CompteRenduUploadForm({ prenomParDefaut }: { prenomParDefaut: string }) {
  const annees = anneesProposees();
  const [rubriqueId, setRubriqueId] = useState(RUBRIQUES[0].id);
  const [annee, setAnnee] = useState(annees[0]);
  const [course, setCourse] = useState("");
  const [prenom, setPrenom] = useState(prenomParDefaut);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lien, setLien] = useState<string | null>(null);

  const rubrique = RUBRIQUES.find((r) => r.id === rubriqueId) ?? RUBRIQUES[0];
  const apercu = course.trim() && prenom.trim()
    ? nomFichierCompteRendu(annee, rubrique.prefixe, course, prenom)
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // currentTarget n'est plus renseigné après le premier await.
    const form = event.currentTarget;
    const file = new FormData(form).get("fichier");
    if (!(file instanceof File) || file.size === 0) {
      setStatus("error");
      setMessage("Merci de joindre votre compte rendu en PDF.");
      return;
    }
    if (file.type !== "application/pdf") {
      setStatus("error");
      setMessage("Le compte rendu doit être un fichier PDF.");
      return;
    }
    if (file.size > MAX_COMPTE_RENDU_BYTES) {
      setStatus("error");
      setMessage(`Le fichier fait ${formatBytes(file.size)} : la limite est de ${formatBytes(MAX_COMPTE_RENDU_BYTES)}.`);
      return;
    }

    setStatus("sending");
    setMessage(null);
    setLien(null);
    try {
      const blob = await upload(`${BLOB_PREFIX}${file.name.replace(/[^\w.-]+/g, "_")}`, file, {
        access: "private",
        handleUploadUrl: "/api/comptes-rendus/upload",
        contentType: "application/pdf",
      });
      const response = await fetch("/api/comptes-rendus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: blob.pathname, rubrique: rubriqueId, annee, course, prenom }),
      });
      const result = (await response.json().catch(() => null)) as { url?: string; nom?: string; error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Échec de l'envoi. Réessayez plus tard.");
      setStatus("done");
      setMessage(`Merci ! « ${result?.nom} » est maintenant dans la rubrique ${rubrique.titre}.`);
      setLien(result?.url ?? null);
      setCourse("");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage((error as Error).message || "Échec de l'envoi. Réessayez plus tard.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-rubrique" className={labelClass}>Catégorie</label>
          <select id="cr-rubrique" value={rubriqueId} onChange={(e) => setRubriqueId(e.target.value)} className={inputClass}>
            {RUBRIQUES.map((r) => (
              <option key={r.id} value={r.id}>{r.titre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cr-annee" className={labelClass}>Année de la course</label>
          <select id="cr-annee" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className={inputClass}>
            {annees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cr-course" className={labelClass}>Course</label>
          <input
            id="cr-course"
            required
            maxLength={80}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="ex. : Tours, Marathon de Paris"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cr-prenom" className={labelClass}>Prénom</label>
          <input
            id="cr-prenom"
            required
            maxLength={60}
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="cr-fichier" className={labelClass}>Compte rendu (PDF, {formatBytes(MAX_COMPTE_RENDU_BYTES)} max.)</label>
        <input id="cr-fichier" name="fichier" type="file" accept="application/pdf,.pdf" required className={fileInputClass} />
      </div>
      {apercu && <p className="text-xs text-toac-blue-900/60">Nom du fichier dans le Drive : {apercu}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-toac-pink-500 px-5 py-2 text-sm font-medium text-white hover:bg-toac-pink-600 disabled:opacity-60"
      >
        {status === "sending" ? "Envoi en cours…" : "Envoyer mon compte rendu"}
      </button>

      {message && (
        <p role="status" className={`text-sm ${status === "error" ? "text-red-700" : "text-green-700"}`}>
          {message}{" "}
          {lien && (
            <a href={lien} target="_blank" rel="noopener noreferrer" className="underline">Voir le fichier</a>
          )}
        </p>
      )}
    </form>
  );
}
