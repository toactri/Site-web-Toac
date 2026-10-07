"use client";

import { useState, type FormEvent } from "react";
import { inputClass, labelClass } from "@/components/formStyles";

/**
 * Demande d'attestation de paiement : l'adhérent s'identifie, le serveur
 * vérifie l'adhésion et envoie le PDF à l'email de son dossier (voir
 * /api/attestation). Le jeton anti-spam est fourni par la page serveur.
 */
export default function AttestationRequestForm({
  formToken,
  tokenField,
  honeypotField,
}: {
  formToken: string;
  tokenField: string;
  honeypotField: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/attestation", { method: "POST", body: new FormData(event.currentTarget) });
    } catch {
      setStatus("error");
      setMessage("Erreur réseau. Vérifiez votre connexion et réessayez.");
      return;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus("error");
      setMessage(data?.error ?? "Une erreur est survenue. Réessayez plus tard.");
      return;
    }
    setStatus("sent");
    setMessage(
      data?.message ??
        `C'est envoyé ! Votre attestation vient de partir à l'adresse ${data?.email ?? "de votre dossier"}. ` +
          "Pensez à vérifier vos courriers indésirables."
    );
  }

  if (status === "sent") {
    return (
      <p role="status" className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name={tokenField} value={formToken} />
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="attestation-hp">Ne pas remplir ce champ</label>
        <input id="attestation-hp" name={honeypotField} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="attestation-nom" className={labelClass}>Nom</label>
          <input id="attestation-nom" name="nom" required autoComplete="family-name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attestation-prenom" className={labelClass}>Prénom</label>
          <input id="attestation-prenom" name="prenom" required autoComplete="given-name" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="attestation-naissance" className={labelClass}>Date de naissance</label>
        <input
          id="attestation-naissance"
          name="dateNaissance"
          type="date"
          required
          autoComplete="bday"
          className={inputClass}
        />
      </div>

      {status === "error" && message && (
        <p role="alert" className="text-sm font-medium text-red-600">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-toac-pink-500 px-6 py-2.5 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60"
      >
        {status === "sending" ? "Envoi…" : "Recevoir mon attestation"}
      </button>
    </form>
  );
}
