import "server-only";
import { recordListeAttenteConfirmation } from "@/lib/db";

/**
 * Email de confirmation envoyé à la personne qui s'inscrit sur la liste
 * d'attente (page Adhésion). Même mécanique que
 * src/lib/partnerSignupNotification.ts : envoi via Brevo, résultat consigné
 * en base (visible dans Bureau → Liste d'attente), jamais d'exception qui
 * empêcherait l'inscription d'aboutir.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ConfirmationInput {
  id: number;
  saison: string;
  nom: string;
  prenom: string;
  email: string;
}

async function send(input: ConfirmationInput): Promise<{ statut: "envoyee" | "ignoree"; erreur: string | null }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return { statut: "ignoree", erreur: "BREVO_API_KEY n'est pas configurée : aucun email ne peut être envoyé." };
  }

  const texte =
    `Bonjour ${input.prenom},\n\n` +
    `Ton inscription sur la liste d'attente du TOAC Triathlon pour la saison ${input.saison} est bien enregistrée.\n\n` +
    "Nous reviendrons vers toi avant l'ouverture des adhésions pour t'indiquer la marche à suivre.\n\n" +
    "Sportivement,\nLe bureau du TOAC Triathlon\n";

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:Helvetica,Arial,sans-serif;color:#0b1a3a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;font-size:16px;line-height:1.5;">
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(input.prenom)},</p>
    <p style="margin:0 0 16px;">
      Ton inscription sur la liste d'attente du TOAC Triathlon pour la saison
      <strong>${escapeHtml(input.saison)}</strong> est bien enregistrée.
    </p>
    <p style="margin:0 0 16px;">
      Nous reviendrons vers toi avant l'ouverture des adhésions pour t'indiquer la marche à suivre.
    </p>
    <p style="margin:0;">Sportivement,<br />Le bureau du TOAC Triathlon</p>
  </div>
</body>
</html>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "TOAC Triathlon", email: process.env.BREVO_FROM_EMAIL ?? "contact@toac-triathlon.com" },
      to: [{ email: input.email, name: `${input.prenom} ${input.nom}` }],
      subject: `[TOAC] Liste d'attente ${input.saison} : inscription enregistrée`,
      htmlContent: html,
      textContent: texte,
    }),
  });
  if (!response.ok) {
    throw new Error(`Brevo a répondu ${response.status} : ${await response.text()}`);
  }
  return { statut: "envoyee", erreur: null };
}

/** Envoie la confirmation et consigne le résultat ; n'échoue jamais. */
export async function confirmListeAttente(input: ConfirmationInput): Promise<void> {
  let statut: "envoyee" | "ignoree" | "echec";
  let erreur: string | null;
  try {
    ({ statut, erreur } = await send(input));
  } catch (error) {
    statut = "echec";
    erreur = error instanceof Error ? error.message : String(error);
  }
  if (statut !== "envoyee") console.warn("[liste-attente] Confirmation non envoyée :", erreur, { to: input.email });
  try {
    await recordListeAttenteConfirmation(input.id, statut, erreur?.slice(0, 500) ?? null);
  } catch (error) {
    console.error("[liste-attente] Échec de l'enregistrement du statut de confirmation :", error);
  }
}
