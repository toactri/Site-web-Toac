import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { findAdherentSaison, getAttestationFor, getLatestSaison, DatabaseNotConfiguredError } from "@/lib/db";
import { BlobNotConfiguredError } from "@/lib/blob";
import { isDossierPaye, parseDateNaissance } from "@/lib/adherentsImport";
import {
  generateAttestation,
  sendAttestationAndRecord,
  maskEmail,
  AttestationNotConfiguredError,
} from "@/lib/attestation";
import { checkFormSubmission } from "@/lib/formGuard";

/**
 * Demande d'attestation de paiement par un adhérent (page /attestation-adhesion).
 * Vérifie l'adhésion dans la saison importée (Bureau → Attestations), génère le
 * PDF et l'envoie à l'email du dossier — jamais à une adresse saisie ici.
 */
export const maxDuration = 60;

/** Pas de nouvel envoi au même adhérent avant ce délai : évite d'inonder sa boîte. */
const RESEND_DELAY_MS = 10 * 60 * 1000;

const CONTACT = "contact@toac-triathlon.com";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const nom = String(form.get("nom") ?? "").trim();
  const prenom = String(form.get("prenom") ?? "").trim();
  const dateNaissance = parseDateNaissance(String(form.get("dateNaissance") ?? ""));

  if (!nom || !prenom || !dateNaissance) {
    return NextResponse.json(
      { error: "Merci de renseigner votre nom, votre prénom et votre date de naissance." },
      { status: 400 }
    );
  }

  const guard = checkFormSubmission(form, { nom, prenom });
  if (guard.kind === "spam") {
    console.info("[attestation] Demande bloquée (anti-spam) :", guard.reason);
    return NextResponse.json({ error: "Demande refusée." }, { status: 400 });
  }
  if (guard.kind === "reload") {
    return NextResponse.json(
      { error: "Le formulaire a expiré. Rechargez la page puis renvoyez votre demande." },
      { status: 400 }
    );
  }

  try {
    const saison = await getLatestSaison();
    if (!saison) {
      return NextResponse.json(
        { error: `Le service n'est pas encore ouvert. Contactez le bureau : ${CONTACT}.` },
        { status: 503 }
      );
    }

    const adherent = await findAdherentSaison(saison, { nom, prenom, dateNaissance });
    if (!adherent) {
      return NextResponse.json(
        {
          error:
            `Aucune adhésion ${saison} trouvée avec ces nom, prénom et date de naissance. Vérifiez votre ` +
            `saisie (même orthographe que lors de votre inscription) ou contactez le bureau : ${CONTACT}.`,
        },
        { status: 404 }
      );
    }
    if (!isDossierPaye(adherent.statut_dossier)) {
      return NextResponse.json(
        {
          error:
            `Votre dossier ${saison} n'est pas encore marqué comme réglé : l'attestation ne peut pas être ` +
            `délivrée pour l'instant. Pour toute question : ${CONTACT}.`,
        },
        { status: 409 }
      );
    }
    if (!adherent.email) {
      return NextResponse.json(
        { error: `Aucune adresse email n'est associée à votre dossier. Contactez le bureau : ${CONTACT}.` },
        { status: 409 }
      );
    }

    const existing = await getAttestationFor(saison, adherent);
    if (
      existing?.envoi_statut === "envoyee" &&
      existing.envoi_le &&
      Date.now() - new Date(existing.envoi_le).getTime() < RESEND_DELAY_MS
    ) {
      return NextResponse.json({
        ok: true,
        email: maskEmail(existing.email),
        message: "Votre attestation vient déjà de vous être envoyée. Pensez à vérifier vos courriers indésirables.",
      });
    }

    const { attestation, pdf } = await generateAttestation(saison, adherent, existing?.document_path ?? null);
    const outcome = await sendAttestationAndRecord(attestation, pdf);
    if (outcome.statut !== "envoyee") {
      return NextResponse.json(
        {
          error:
            `Votre attestation a bien été générée mais l'email n'a pas pu partir. Le bureau en est informé ; ` +
            `vous pouvez aussi le contacter : ${CONTACT}.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, email: maskEmail(attestation.email) });
  } catch (error) {
    if (
      error instanceof DatabaseNotConfiguredError ||
      error instanceof BlobNotConfiguredError ||
      error instanceof AttestationNotConfiguredError
    ) {
      console.error("[attestation]", error.message);
      return NextResponse.json(
        { error: `Le service n'est pas encore ouvert. Contactez le bureau : ${CONTACT}.` },
        { status: 503 }
      );
    }
    console.error("[attestation] Échec de la génération :", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
