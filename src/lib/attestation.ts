import "server-only";
import { putBlob, getBlobStream, deleteBlobs } from "@/lib/blob";
import {
  getParametres,
  upsertAttestation,
  recordAttestationEnvoi,
  type AdherentSaisonRow,
  type AttestationRow,
  type NotificationStatut,
} from "@/lib/db";
import { generateAttestationPdf, buildAttestationFileName, formatEuros } from "@/lib/attestationPdf";
import { slugify } from "@/lib/slug";

/**
 * Attestations de paiement d'adhésion : génération du PDF, dépôt dans le store
 * Blob privé, envoi par email à l'adresse du dossier d'adhésion.
 *
 * Le document n'est jamais affiché ni téléchargeable depuis la page publique :
 * il part uniquement vers l'email connu du club. Nom, prénom et date de
 * naissance suffisent à le demander ; c'est l'adresse de destination, que le
 * demandeur ne choisit pas, qui empêche d'obtenir l'attestation d'un autre.
 */

export const PARAM_TRESORIER_NOM = "attestation_tresorier_nom";
export const PARAM_SIGNATURE_PATH = "attestation_signature_path";

export interface AttestationSettings {
  tresorierNom: string | null;
  signaturePath: string | null;
}

export async function getAttestationSettings(): Promise<AttestationSettings> {
  const values = await getParametres([PARAM_TRESORIER_NOM, PARAM_SIGNATURE_PATH]);
  return {
    tresorierNom: values[PARAM_TRESORIER_NOM]?.trim() || null,
    signaturePath: values[PARAM_SIGNATURE_PATH]?.trim() || null,
  };
}

export async function readBlobBytes(pathname: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const result = await getBlobStream(pathname);
  if (!result || result.statusCode !== 200) return null;
  return {
    bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
    contentType: result.blob.contentType,
  };
}

/** Date du jour à Paris (les fonctions tournent en UTC), au format JJ/MM/AAAA. */
function todayFr(): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" }).format(new Date());
}

export class AttestationNotConfiguredError extends Error {}

/**
 * Génère l'attestation, la dépose dans le store et l'enregistre (une ligne par
 * adhérent et par saison). Remplace le document précédent du même adhérent.
 */
export async function generateAttestation(
  saison: string,
  adherent: AdherentSaisonRow,
  previousPath: string | null
): Promise<{ attestation: AttestationRow; pdf: Buffer }> {
  const settings = await getAttestationSettings();
  if (!settings.tresorierNom || !settings.signaturePath) {
    throw new AttestationNotConfiguredError(
      "Nom du trésorier ou signature non renseigné(e) dans Bureau → Attestations."
    );
  }
  const signature = await readBlobBytes(settings.signaturePath);
  if (!signature) {
    throw new AttestationNotConfiguredError("Image de signature introuvable dans le store : redéposez-la.");
  }

  const pdf = await generateAttestationPdf(
    {
      saison,
      nom: adherent.nom,
      prenom: adherent.prenom,
      sexe: adherent.sexe,
      dateNaissance: adherent.date_naissance,
      cotisationCentimes: adherent.cotisation_centimes,
      licenceCentimes: adherent.licence_centimes,
      tresorierNom: settings.tresorierNom,
      dateEmission: todayFr(),
    },
    { bytes: signature.bytes, mimeType: signature.contentType }
  );

  const blob = await putBlob(
    `attestations/${slugify(saison)}-${slugify(adherent.nom)}-${slugify(adherent.prenom)}-${Date.now()}.pdf`,
    pdf,
    { contentType: "application/pdf" }
  );
  const attestation = await upsertAttestation({ saison, adherent, documentPath: blob.pathname });

  if (previousPath && previousPath !== blob.pathname) {
    await deleteBlobs([previousPath]).catch((error) =>
      console.error("Échec de la suppression de l'ancienne attestation :", error)
    );
  }
  return { attestation, pdf };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Envoie l'attestation en pièce jointe à l'adhérent et consigne le résultat
 * sur la ligne (visible dans la vue bureau). Ne lève jamais.
 */
export async function sendAttestationAndRecord(
  attestation: AttestationRow,
  pdf: Buffer
): Promise<{ statut: NotificationStatut; erreur: string | null }> {
  let outcome: { statut: NotificationStatut; erreur: string | null };
  try {
    outcome = await sendAttestationEmail(attestation, pdf);
  } catch (error) {
    console.error("Échec de l'envoi de l'attestation :", error);
    outcome = { statut: "echec", erreur: error instanceof Error ? error.message : String(error) };
  }
  try {
    await recordAttestationEnvoi(attestation.id, outcome);
  } catch (error) {
    console.error("Échec de l'enregistrement du suivi d'envoi de l'attestation :", error);
  }
  return outcome;
}

async function sendAttestationEmail(
  a: AttestationRow,
  pdf: Buffer
): Promise<{ statut: NotificationStatut; erreur: string | null }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    const erreur = "BREVO_API_KEY n'est pas configurée : aucun email ne peut être envoyé.";
    console.info(`[attestation] ${erreur}`);
    return { statut: "ignoree", erreur };
  }

  const total = formatEuros(a.cotisation_centimes + a.licence_centimes);
  const text =
    `Bonjour ${a.prenom},\n\n` +
    `Vous trouverez en pièce jointe votre attestation de paiement pour la saison ${a.saison} ` +
    `(licence FFTri et cotisation club, soit ${total}), à transmettre à votre CSE.\n\n` +
    "Sportivement,\nLe bureau du TOAC Triathlon\n";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: {
        name: "TOAC Triathlon",
        email: process.env.BREVO_FROM_EMAIL ?? "contact@toac-triathlon.com",
      },
      to: [{ email: a.email, name: `${a.prenom} ${a.nom}` }],
      subject: `Votre attestation de paiement TOAC Triathlon – Saison ${a.saison}`,
      textContent: text,
      htmlContent: `<!doctype html><html lang="fr"><body style="font-family:Helvetica,Arial,sans-serif;color:#0b1a3a;line-height:1.5;">${text
        .split("\n\n")
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("")}</body></html>`,
      attachment: [
        { content: pdf.toString("base64"), name: buildAttestationFileName(a.nom, a.prenom, a.saison) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo a répondu ${response.status} : ${await response.text()}`);
  }
  return { statut: "envoyee", erreur: null };
}

/** « jean.dupont@gmail.com » → « je•••••••@gmail.com », pour confirmer l'envoi sans divulguer l'adresse. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "votre adresse email";
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
