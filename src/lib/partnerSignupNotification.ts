import "server-only";
import { SITE_URL } from "@/lib/seo";

/**
 * Emails liés aux demandes d'activation des avantages partenaires (ex.
 * Alltricks) : notification au responsable partenariat à chaque demande, et
 * confirmation à l'adhérent une fois qu'il a été ajouté côté partenaire.
 * Même logique que src/lib/musculationNotification.ts (destinataires du côté
 * club lus depuis une variable d'environnement, envoi via Brevo, jamais
 * d'exception qui remonterait jusqu'à l'appelant).
 */

export interface PartnerSignupNotificationOutcome {
  statut: "envoyee" | "ignoree" | "echec";
  destinataires: string[];
  erreur: string | null;
}

const PARTNER_LABELS: Record<string, string> = {
  alltricks: "Alltricks",
};

function partnerLabel(slug: string): string {
  return PARTNER_LABELS[slug] ?? slug;
}

/** Identité et contenu libre viennent d'un formulaire public : échappés avant d'entrer dans du HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Destinataires de la notification au responsable partenariat, lus dans PARTNER_SIGNUP_NOTIFICATION_EMAILS. */
function resolveStaffRecipients(): string[] {
  const entries = (process.env.PARTNER_SIGNUP_NOTIFICATION_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((address) => address.trim())
    .filter(Boolean);

  const valid = entries.filter((address) => EMAIL_PATTERN.test(address));
  const rejected = entries.filter((address) => !EMAIL_PATTERN.test(address));
  if (rejected.length > 0) {
    console.warn(
      "[partenaires] Entrées ignorées dans PARTNER_SIGNUP_NOTIFICATION_EMAILS (adresse invalide) :",
      rejected
    );
  }
  return Array.from(new Set(valid.map((address) => address.toLowerCase())));
}

function button(href: string, label: string, background: string): string {
  return (
    `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;` +
    `background:${background};color:#ffffff;text-decoration:none;border-radius:6px;` +
    `font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;` +
    `letter-spacing:0.04em;">${label}</a>`
  );
}

function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:Helvetica,Arial,sans-serif;color:#0b1a3a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function identityTable(adherent: { nom: string; prenom: string; email: string }): string {
  return `<table style="margin:0 0 24px;border-collapse:collapse;font-size:15px;line-height:1.6;">
      <tr><td style="padding:0 12px 0 0;color:#5b6478;">Nom</td><td style="font-weight:bold;">${escapeHtml(adherent.nom)}</td></tr>
      <tr><td style="padding:0 12px 0 0;color:#5b6478;">Prénom</td><td style="font-weight:bold;">${escapeHtml(adherent.prenom)}</td></tr>
      <tr><td style="padding:0 12px 0 0;color:#5b6478;">Email</td><td style="font-weight:bold;">${escapeHtml(adherent.email)}</td></tr>
    </table>`;
}

export interface StaffNotificationInput {
  /** URL absolue du site, pour construire le lien de confirmation. */
  origin: string;
  partenaire: string;
  token: string;
  nom: string;
  prenom: string;
  email: string;
}

/** Notification au responsable partenariat : une nouvelle demande est arrivée. */
export async function sendPartnerSignupStaffNotification(
  input: StaffNotificationInput
): Promise<PartnerSignupNotificationOutcome> {
  const recipients = resolveStaffRecipients();
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const label = partnerLabel(input.partenaire);
  const confirmUrl = `${input.origin}/partenaires/confirmer/${input.token}`;

  if (recipients.length === 0) {
    const erreur = "Aucun destinataire exploitable dans PARTNER_SIGNUP_NOTIFICATION_EMAILS.";
    console.warn(`[partenaires] ${erreur} Notification non envoyée.`);
    return { statut: "ignoree", destinataires: [], erreur };
  }
  if (!apiKey) {
    const erreur = "BREVO_API_KEY n'est pas configurée : aucun email ne peut être envoyé.";
    console.info(`[partenaires] ${erreur}`, { recipients, confirmUrl });
    return { statut: "ignoree", destinataires: recipients, erreur };
  }

  const html = emailShell(`
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Un adhérent du TOAC Triathlon a demandé à être ajouté sur le compte ${escapeHtml(label)}.
    </p>
    ${identityTable(input)}
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Peux-tu cliquer sur ce bouton une fois que tu as ajouté l'adhérent ?
    </p>
    <p style="margin:0 0 16px;">
      ${button(confirmUrl, "CONFIRMER L'AJOUT", "#e6127a")}
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#5b6478;line-height:1.5;">
      Un email va être automatiquement envoyé à l'adhérent pour lui confirmer que son avantage partenaire est activé.
    </p>
  `);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "TOAC Triathlon", email: process.env.BREVO_FROM_EMAIL ?? "contact@toac-triathlon.com" },
      to: recipients.map((email) => ({ email })),
      subject: `[TOAC] Partenariat ${label} — ${input.prenom} ${input.nom}`,
      htmlContent: html,
      textContent:
        `Un adhérent du TOAC Triathlon a demandé à être ajouté sur le compte ${label}.\n\n` +
        `Nom : ${input.nom}\nPrénom : ${input.prenom}\nEmail : ${input.email}\n\n` +
        `Confirmer l'ajout : ${confirmUrl}\n`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo a répondu ${response.status} : ${await response.text()}`);
  }
  return { statut: "envoyee", destinataires: recipients, erreur: null };
}

export interface MemberConfirmationInput {
  partenaire: string;
  nom: string;
  prenom: string;
  email: string;
}

/** Confirmation envoyée à l'adhérent une fois qu'il a été ajouté côté partenaire. */
export async function sendPartnerSignupMemberConfirmation(
  input: MemberConfirmationInput
): Promise<PartnerSignupNotificationOutcome> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const label = partnerLabel(input.partenaire);

  if (!apiKey) {
    const erreur = "BREVO_API_KEY n'est pas configurée : aucun email ne peut être envoyé.";
    console.info(`[partenaires] ${erreur}`, { to: input.email });
    return { statut: "ignoree", destinataires: [input.email], erreur };
  }

  // Lien vers la page du partenaire sur le site (codes promos), construit
  // depuis le slug pour valoir quel que soit le partenaire.
  const partnerPageUrl = `${SITE_URL}/partenaires/${encodeURIComponent(input.partenaire)}`;

  const html = emailShell(`
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Bonjour ${escapeHtml(input.prenom)},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Tu as demandé à être ajouté sur le compte ${escapeHtml(label)} du TOAC Triathlon.
    </p>
    ${identityTable(input)}
    <p style="margin:0 0 24px;font-size:16px;font-weight:bold;color:#0e9f6e;line-height:1.5;">
      Ton avantage partenaire est activé. Tu peux désormais utiliser les codes promos du TOAC.
    </p>
    <p style="margin:0;">
      ${button(partnerPageUrl, "VOIR LES CODES", "#e6127a")}
    </p>
  `);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "TOAC Triathlon", email: process.env.BREVO_FROM_EMAIL ?? "contact@toac-triathlon.com" },
      to: [{ email: input.email, name: `${input.prenom} ${input.nom}` }],
      subject: `[TOAC] Partenariat ${label} — ${input.prenom} ${input.nom}`,
      htmlContent: html,
      textContent:
        `Bonjour ${input.prenom},\n\n` +
        `Tu as demandé à être ajouté sur le compte ${label} du TOAC Triathlon.\n\n` +
        `Nom : ${input.nom}\nPrénom : ${input.prenom}\nEmail : ${input.email}\n\n` +
        "Ton avantage partenaire est activé. Tu peux désormais utiliser les codes promos du TOAC.\n\n" +
        `Voir les codes : ${partnerPageUrl}\n`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo a répondu ${response.status} : ${await response.text()}`);
  }
  return { statut: "envoyee", destinataires: [input.email], erreur: null };
}
