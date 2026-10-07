import type { Metadata } from "next";
import AttestationRequestForm from "@/components/AttestationRequestForm";
import { createFormToken, FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/formGuard";

export const metadata: Metadata = {
  title: "Attestation de paiement de l'adhésion",
  description:
    "Recevez par email votre attestation de paiement (licence FFTri et cotisation club) pour votre CSE.",
  robots: { index: false, follow: false },
};

// Le jeton anti-spam est horodaté : il doit être produit à chaque affichage.
export const dynamic = "force-dynamic";

export default function AttestationAdhesionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Attestation de paiement
      </h1>
      <div className="mt-4 space-y-3 text-toac-blue-900/80">
        <p>
          Votre CSE vous demande un justificatif de votre adhésion ? Renseignez les informations ci-dessous :
          nous vérifions votre adhésion de la saison et vous envoyons aussitôt une attestation de paiement
          (licence FFTri et cotisation club) à l&apos;adresse email indiquée lors de votre inscription.
        </p>
        <p className="text-sm">
          Pourquoi une attestation et pas une facture ? La licence est encaissée par la FFTri : le club atteste
          de votre paiement, mais ne peut pas établir de facture à sa place.
        </p>
      </div>
      <div className="mt-8 rounded-lg border border-toac-gray-200 bg-white p-6 shadow-sm">
        <AttestationRequestForm
          formToken={createFormToken()}
          tokenField={FORM_TOKEN_FIELD}
          honeypotField={HONEYPOT_FIELD}
        />
      </div>
      <p className="mt-6 text-sm text-toac-blue-900/60">
        Adresse email changée depuis l&apos;inscription, ou dossier introuvable ? Écrivez au bureau :{" "}
        <a href="mailto:contact@toac-triathlon.com" className="underline">contact@toac-triathlon.com</a>.
      </p>
    </div>
  );
}
