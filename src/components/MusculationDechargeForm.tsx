"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isMineur } from "@/lib/age";
import { compressImageFile } from "@/lib/imageCompression";
import { materializeFile, FileUnreadableError } from "@/lib/clientFiles";
import { MAX_UPLOAD_TOTAL_BYTES, formatBytes } from "@/lib/uploadLimits";
import { inputClass, labelClass } from "@/components/formStyles";

/** Au-delà, on abandonne l'envoi plutôt que de laisser l'adhérent attendre. */
const REQUEST_TIMEOUT_MS = 90_000;

const fileInputClass =
  "w-full text-sm text-toac-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-toac-blue-950 file:px-4 file:py-2 file:text-sm file:text-white";

/**
 * Formulaire "décharge salle de musculation" : reprend les champs de la
 * décharge papier du TOAC Omnisports, génère le document équivalent
 * côté serveur et le dépose (avec le certificat médical) dans le dossier
 * Google Drive du club — voir /api/musculation/decharge.
 */
export default function MusculationDechargeForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Cause technique de l'échec, affichée en petit sous le message : sans elle,
  // un envoi qui n'atteint pas le serveur reste indiagnostiquable.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  // Le bloc « autorisation parentale » se déplie tout seul dès que la date de
  // naissance saisie correspond à une personne de moins de 18 ans. Le serveur
  // refait ce calcul de son côté : ce qui est envoyé ici n'est qu'un confort
  // d'affichage.
  const [dateNaissance, setDateNaissance] = useState("");
  const estMineur = isMineur(dateNaissance);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    setErrorDetail(null);

    const startedAt = Date.now();
    const formData = new FormData(event.currentTarget);

    // Deux étapes avant l'envoi :
    //  - les photos prises au smartphone sont recompressées, elles pèsent
    //    souvent plus lourd que ce qu'un envoi accepte ;
    //  - chaque fichier est ensuite lu en mémoire. Sans cela, le navigateur ne
    //    lit les octets qu'au moment d'envoyer, et un document dont la
    //    permission a expiré (fichier ouvert depuis Drive ou l'application
    //    Fichiers) fait échouer la requête instantanément, sans rien laisser
    //    côté serveur.
    try {
      for (const field of ["certificatMedical", "signature"]) {
        const file = formData.get(field);
        if (file instanceof File && file.size > 0) {
          formData.set(field, await materializeFile(await compressImageFile(file)));
        }
      }
    } catch (error) {
      if (error instanceof FileUnreadableError) {
        setErrorMessage(
          `Impossible de lire « ${error.fileName} ». Si vous l'avez choisi depuis Google Drive ou ` +
            "une application de stockage, enregistrez-le d'abord dans votre téléphone, puis " +
            "sélectionnez-le à nouveau."
        );
        setStatus("error");
        return;
      }
      throw error;
    }

    // Au-delà de la limite, la requête est coupée avant d'atteindre le serveur :
    // sans ce contrôle, l'adhérent ne verrait qu'une « erreur réseau »
    // inexplicable.
    const totalBytes = Array.from(formData.values()).reduce(
      (total, value) => total + (value instanceof File ? value.size : 0),
      0
    );
    if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
      setErrorMessage(
        `Vos fichiers pèsent ${formatBytes(totalBytes)} au total, pour ${formatBytes(MAX_UPLOAD_TOTAL_BYTES)} au maximum. ` +
          "Si votre certificat est un PDF, envoyez plutôt une photo de celui-ci ; sinon, reprenez la photo avec une définition plus basse."
      );
      setStatus("error");
      return;
    }

    // Un envoi qui n'aboutit pas ne laisse aucune trace côté serveur : la
    // requête n'y arrive jamais. Le délai explicite permet au moins de
    // distinguer « trop long » de « connexion perdue », et le détail technique
    // est affiché pour pouvoir être rapporté au bureau.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("/api/musculation/decharge", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setErrorMessage(
        timedOut
          ? "L'envoi a été interrompu : le serveur a mis trop de temps à répondre. Réessayez dans quelques minutes."
          : "L'envoi n'a pas abouti : la connexion au serveur a été perdue. Réessayez, et si cela se reproduit, signalez-le au bureau du club."
      );
      setErrorDetail(
        `${error instanceof Error ? `${error.name} : ${error.message}` : String(error)} · ` +
          `fichiers ${formatBytes(totalBytes)} · ${Math.round((Date.now() - startedAt) / 1000)} s`
      );
      setStatus("error");
      return;
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setErrorMessage(data?.error ?? "Une erreur est survenue. Réessayez plus tard.");
      setStatus("error");
      return;
    }
    router.push(data.reviewUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className={labelClass}>Nom</label>
          <input id="nom" name="nom" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="prenom" className={labelClass}>Prénom</label>
          <input id="prenom" name="prenom" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="nationalite" className={labelClass}>Nationalité</label>
          <input id="nationalite" name="nationalite" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="dateNaissance" className={labelClass}>Date de naissance</label>
          <input
            id="dateNaissance"
            name="dateNaissance"
            type="date"
            required
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="adresse" className={labelClass}>Adresse</label>
        <input id="adresse" name="adresse" required className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="codePostal" className={labelClass}>Code postal</label>
          <input id="codePostal" name="codePostal" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="ville" className={labelClass}>Ville</label>
          <input id="ville" name="ville" required className={inputClass} />
        </div>
      </div>

      {/* Pas de champ date : la décharge est datée du jour de l'envoi et signée
          dans la ville renseignée ci-dessus. */}

      {estMineur && (
        <div className="rounded-md border border-toac-gray-200 bg-toac-gray-50 p-4">
          <p className="text-sm font-medium text-toac-blue-900">
            Adhérent(e) mineur(e) : une autorisation parentale est requise.
          </p>
          <div className="mt-3">
            <label htmlFor="representantNom" className={labelClass}>
              Nom du père / mère / répondant légal
            </label>
            <input
              id="representantNom"
              name="representantNom"
              required={estMineur}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="certificatMedical" className={labelClass}>
          Certificat médical d&apos;aptitude à la musculation (sans contre-indication, valable 3 ans)
        </label>
        <input
          id="certificatMedical"
          name="certificatMedical"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          className={fileInputClass}
        />
        <p className="mt-1 text-xs text-toac-blue-900/60">
          Image (JPG, PNG) ou PDF. Les photos sont automatiquement allégées avant l&apos;envoi, vous
          n&apos;avez pas à les redimensionner.
        </p>
      </div>

      <div>
        <label htmlFor="signature" className={labelClass}>
          Votre signature (photo ou scan)
        </label>
        <input
          id="signature"
          name="signature"
          type="file"
          accept=".jpg,.jpeg,.png"
          required
          className={fileInputClass}
        />
        <p className="mt-1 text-xs text-toac-blue-900/60">
          Signez sur une feuille blanche puis prenez-la en photo, ou utilisez une image de votre signature (JPG, PNG).
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-toac-blue-900/90">
        <input type="checkbox" name="rgpdConsent" required className="mt-1" />
        J&apos;accepte que les données et documents transmis dans ce formulaire (dont mon certificat
        médical et ma signature) soient traités et conservés par le TOAC Triathlon dans le seul but de
        gérer l&apos;accès à la salle de musculation, conformément au RGPD.
      </label>

      {errorMessage && (
        <div role="alert">
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          {errorDetail && (
            <p className="mt-1 font-mono text-xs text-toac-blue-900/50">{errorDetail}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-toac-pink-500 px-6 py-2.5 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60"
      >
        {status === "sending" ? "Génération du document…" : "Continuer"}
      </button>
    </form>
  );
}
