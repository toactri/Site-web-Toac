import "server-only";
import crypto from "node:crypto";
import {
  findAdherentSaisonByEmail,
  getLatestSaison,
  getRecentConnexionJetons,
  insertConnexionJeton,
  consumeConnexionLien,
  recordConnexionCodeAttempt,
  markConnexionJetonUsed,
  type AdherentSaisonRow,
  type ConnexionJetonRow,
} from "@/lib/db";
import { createSessionToken, type SessionRole } from "@/lib/session";
import { superAdminEmails } from "@/lib/superAdmin";

/**
 * Connexion à l'espace adhérents par email, sans mot de passe.
 *
 * L'adhérent saisit l'email de son adhésion (celui du dossier importé dans
 * Bureau → Attestations, saison la plus récente). S'il est connu, il reçoit un
 * email contenant un lien de connexion et un code à 6 chiffres, valables
 * quelques minutes et utilisables une seule fois. Aucun compte n'est à créer :
 * l'adhésion de la saison fait office de compte, et un adhérent qui ne
 * renouvelle pas perd l'accès au premier import de la saison suivante.
 *
 * Les adresses de ADMIN_EMAILS (séparées par des virgules) obtiennent le rôle
 * bureau, qu'elles figurent ou non parmi les adhérents.
 */

/** Durée de validité d'un lien / code. */
const VALIDITE_MINUTES = 15;
/** Au-delà de ce nombre d'emails sur la fenêtre de validité, on n'en renvoie plus. */
const MAX_DEMANDES = 3;
/** Essais de code autorisés par demande. */
export const MAX_TENTATIVES_CODE = 5;

export const CONTACT_BUREAU = "formulaire de contact du site (toac-triathlon.com/contact)";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function adminEmails(): Set<string> {
  return new Set([
    ...(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
    // Les super-administrateurs sont aussi membres du bureau (src/lib/superAdmin.ts).
    ...superAdminEmails(),
  ]);
}

/** N'accepte qu'un chemin interne au site comme destination après connexion. */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next.slice(0, 200);
}

export interface LoginIdentity {
  email: string;
  prenom: string | null;
  nomAffiche: string;
  role: SessionRole;
}

function identityFromAdherent(adherent: AdherentSaisonRow, email: string): LoginIdentity {
  return {
    email,
    prenom: adherent.prenom,
    nomAffiche: `${adherent.prenom} ${adherent.nom}`.trim(),
    role: adminEmails().has(email) ? "admin" : "member",
  };
}

/** Identité correspondant à l'email saisi, ou null s'il n'est ni adhérent de la saison ni bureau. */
export async function resolveIdentityByEmail(rawEmail: string): Promise<LoginIdentity | null> {
  const email = normalizeEmail(rawEmail);
  const saison = await getLatestSaison();
  const adherent = saison ? await findAdherentSaisonByEmail(saison, email) : null;
  if (adherent) return identityFromAdherent(adherent, email);
  if (adminEmails().has(email)) {
    return { email, prenom: null, nomAffiche: process.env.ADMIN_NAME?.trim() || "Bureau TOAC", role: "admin" };
  }
  return null;
}

/** Identité d'un adhérent retrouvé par nom, prénom et date de naissance (son email de dossier). */
export function identityFromAdherentRow(adherent: AdherentSaisonRow): LoginIdentity | null {
  if (!adherent.email?.trim()) return null;
  return identityFromAdherent(adherent, normalizeEmail(adherent.email));
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET n'est pas défini.");
  return value;
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

const hashLien = (lien: string) => hmac(`connexion-lien:${lien}`);
const hashCode = (demande: string, code: string) => hmac(`connexion-code:${demande}:${code}`);

/** Identifiant de demande factice, indiscernable d'un vrai : la réponse ne trahit pas si un email est connu. */
export function fakeDemande(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export type StartLoginOutcome =
  /** Email envoyé (ou journalisé faute de Brevo hors production). */
  | { kind: "envoye"; demande: string }
  /** Trop de demandes récentes : rien de renvoyé, les emails déjà reçus restent valables. */
  | { kind: "limite"; demande: string }
  /** L'envoi a échoué. */
  | { kind: "echec"; demande: string };

/** Crée une demande de connexion pour cette identité et envoie le lien et le code par email. */
export async function startEmailLogin(
  identity: LoginIdentity,
  options: { origin: string; suivant: string | null }
): Promise<StartLoginOutcome> {
  const recent = await getRecentConnexionJetons(identity.email, VALIDITE_MINUTES);
  if (recent.count >= MAX_DEMANDES && recent.derniereDemande) {
    return { kind: "limite", demande: recent.derniereDemande };
  }

  const demande = crypto.randomBytes(16).toString("base64url");
  const lien = crypto.randomBytes(32).toString("base64url");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

  await insertConnexionJeton({
    demande,
    lienHash: hashLien(lien),
    codeHash: hashCode(demande, code),
    email: identity.email,
    nomAffiche: identity.nomAffiche,
    role: identity.role,
    suivant: options.suivant,
    minutes: VALIDITE_MINUTES,
  });

  const url = `${options.origin}/connexion/lien?t=${encodeURIComponent(lien)}`;
  try {
    const sent = await sendLoginEmail(identity, url, code);
    return { kind: sent ? "envoye" : "echec", demande };
  } catch (error) {
    console.error("[connexion] Échec de l'envoi de l'email de connexion :", error);
    return { kind: "echec", demande };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendLoginEmail(identity: LoginIdentity, url: string, code: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.info("[connexion] BREVO_API_KEY non configurée : email de connexion non envoyé.");
    // Hors production, le lien est journalisé pour pouvoir tester en local.
    if (process.env.NODE_ENV !== "production") console.info(`[connexion] Lien : ${url} — code : ${code}`);
    return process.env.NODE_ENV !== "production";
  }

  const bonjour = identity.prenom ? `Bonjour ${identity.prenom},` : "Bonjour,";
  const text =
    `${bonjour}\n\n` +
    `Pour vous connecter à l'espace adhérents du TOAC Triathlon, ouvrez ce lien :\n${url}\n\n` +
    `Ou saisissez ce code sur la page de connexion : ${code}\n\n` +
    `Le lien et le code sont valables ${VALIDITE_MINUTES} minutes et ne servent qu'une fois.\n\n` +
    "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.\n\n" +
    "Sportivement,\nLe bureau du TOAC Triathlon\n";

  const html =
    `<!doctype html><html lang="fr"><body style="font-family:Helvetica,Arial,sans-serif;color:#0b1a3a;line-height:1.5;">` +
    `<p>${escapeHtml(bonjour)}</p>` +
    `<p>Pour vous connecter à l'espace adhérents du TOAC Triathlon :</p>` +
    `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#e6007e;color:#ffffff;` +
    `padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Me connecter</a></p>` +
    `<p>Ou saisissez ce code sur la page de connexion :</p>` +
    `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>` +
    `<p style="color:#555;">Le lien et le code sont valables ${VALIDITE_MINUTES} minutes et ne servent qu'une fois. ` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>` +
    `<p>Sportivement,<br>Le bureau du TOAC Triathlon</p></body></html>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "TOAC Triathlon", email: process.env.BREVO_FROM_EMAIL ?? "contact@toac-triathlon.com" },
      to: [{ email: identity.email, name: identity.nomAffiche }],
      subject: `Votre code de connexion TOAC : ${code}`,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Brevo a répondu ${response.status} : ${await response.text()}`);
  }
  return true;
}

export interface LoginSession {
  token: string;
  role: SessionRole;
  name: string;
  suivant: string | null;
}

function toSession(row: ConnexionJetonRow): LoginSession {
  const role: SessionRole = row.role === "admin" ? "admin" : "member";
  return {
    token: createSessionToken({ username: row.email, name: row.nom_affiche, role }),
    role,
    name: row.nom_affiche,
    suivant: row.suivant,
  };
}

/** Connexion par le lien reçu par email. */
export async function loginWithLien(lien: string): Promise<LoginSession | null> {
  if (!lien) return null;
  const row = await consumeConnexionLien(hashLien(lien));
  return row ? toSession(row) : null;
}

/** Connexion par le code à 6 chiffres, rattaché à la demande affichée dans le navigateur. */
export async function loginWithCode(demande: string, code: string): Promise<LoginSession | null> {
  if (!demande || !/^\d{6}$/.test(code)) return null;
  const candidates = await recordConnexionCodeAttempt(demande, MAX_TENTATIVES_CODE);
  for (const row of candidates) {
    const expected = Buffer.from(row.code_hash);
    const actual = Buffer.from(hashCode(row.demande, code));
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      return (await markConnexionJetonUsed(row.id)) ? toSession(row) : null;
    }
  }
  return null;
}
