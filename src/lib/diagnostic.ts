import "server-only";
import { BLOB_TOKEN_ENV_NAMES, resolveBlobToken, putBlob } from "@/lib/blob";
import { countNotificationRecipients } from "@/lib/musculationNotification";

/**
 * Collecte l'état réel du serveur (variables d'environnement vues par la
 * fonction qui sert le site, plateforme, déploiement servi) pour diagnostiquer
 * les fonctionnalités qui dépendent d'une configuration : stockage Vercel Blob,
 * base Postgres, emails, paiement.
 *
 * Aucune valeur secrète n'est jamais renvoyée : uniquement la présence, la
 * longueur et un préfixe masqué.
 */

/** Variables attendues côté serveur, avec leur rôle. */
export const WATCHED_VARS: { name: string; role: string }[] = [
  { name: "BLOB_READ_WRITE_TOKEN", role: "Stockage des documents (Vercel Blob)" },
  { name: "TOAC_BLOB_TOKEN", role: "Repli du jeton Vercel Blob (nom non géré par Vercel)" },
  { name: "DATABASE_URL", role: "Base Postgres (dossiers, commandes, décharges)" },
  { name: "SESSION_SECRET", role: "Signature des cookies de l'espace adhérents" },
  { name: "ADMIN_USERNAME", role: "Identifiant du compte bureau" },
  { name: "ADMIN_PASSWORD", role: "Mot de passe du compte bureau" },
  { name: "BREVO_API_KEY", role: "Envoi des emails (contact, notifications musculation et partenariat)" },
  { name: "MUSCULATION_NOTIFICATION_EMAILS", role: "Destinataires de la notification musculation" },
  {
    name: "PARTNER_SIGNUP_NOTIFICATION_EMAILS",
    role: "Destinataires de la notification partenariat (responsable partenariat)",
  },
  { name: "MONETICO_CLE_HMAC", role: "Paiement en ligne Monetico" },
  { name: "CMS_SUPABASE_URL", role: "Projet Supabase servant le contenu CMS (repli : projet Devanture)" },
  { name: "CMS_SITE_ID", role: "Identifiant du site dans le CMS (repli : site TOAC sur Devanture)" },
];

/** Noms de variables affichés dans la liste « ce que reçoit le runtime ». */
const NAME_FILTER =
  /BLOB|STORE|POSTGRES|DATABASE|VERCEL|NETLIFY|MONETICO|BREVO|SESSION_SECRET|^ADMIN_|MUSCULATION|PARTNER|^CMS_/i;

export interface VarInfo {
  name: string;
  role: string;
  present: boolean;
  length: number;
  hint: string;
}

export function describeVar(name: string, role = ""): VarInfo {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { name, role, present: false, length: 0, hint: "—" };

  // Pour un jeton Blob (vercel_blob_rw_<storeId>_<secret>), l'identifiant de
  // store n'est pas secret — il apparaît dans les URLs publiques des fichiers —
  // et permet de vérifier qu'on parle bien du bon store. La partie aléatoire,
  // elle, ne sort jamais.
  const blobMatch = value.match(/^(vercel_blob_rw_[A-Za-z0-9]+)_/);
  const hint = blobMatch ? `${blobMatch[1]}_***` : `${value.slice(0, 3)}***`;
  return { name, role, present: true, length: value.length, hint };
}

export interface Diagnostic {
  platform: string;
  hosting: { label: string; value: string }[];
  vars: VarInfo[];
  injectedNames: string[];
  totalEnvVars: number;
  blobTokenSource: string | null;
  /** Adresses effectivement reconnues dans MUSCULATION_NOTIFICATION_EMAILS. */
  notificationRecipients: number;
}

export function collectDiagnostic(): Diagnostic {
  const onVercel = Boolean(process.env.VERCEL);
  const onNetlify = Boolean(process.env.NETLIFY);
  const blobToken = resolveBlobToken();

  return {
    platform: onVercel ? "Vercel" : onNetlify ? "Netlify" : "Inconnue (ni Vercel, ni Netlify)",
    hosting: [
      { label: "Environnement (VERCEL_ENV)", value: process.env.VERCEL_ENV ?? "—" },
      { label: "Région (VERCEL_REGION)", value: process.env.VERCEL_REGION ?? "—" },
      { label: "URL du déploiement (VERCEL_URL)", value: process.env.VERCEL_URL ?? "—" },
      { label: "Projet (VERCEL_PROJECT_ID)", value: process.env.VERCEL_PROJECT_ID ?? "—" },
      { label: "Branche déployée", value: process.env.VERCEL_GIT_COMMIT_REF ?? "—" },
      { label: "Dépôt déployé", value: process.env.VERCEL_GIT_REPO_SLUG ?? "—" },
      { label: "Commit déployé", value: (process.env.VERCEL_GIT_COMMIT_SHA ?? "—").slice(0, 12) },
      { label: "Node.js", value: process.version },
    ],
    vars: WATCHED_VARS.map(({ name, role }) => describeVar(name, role)),
    injectedNames: Object.keys(process.env).filter((name) => NAME_FILTER.test(name)).sort(),
    totalEnvVars: Object.keys(process.env).length,
    blobTokenSource: blobToken?.source ?? null,
    notificationRecipients: countNotificationRecipients(),
  };
}

export type BlobTest =
  | { ok: true; url: string; source: string }
  | { ok: false; errorName: string; errorMessage: string };

/** Écrit un petit fichier texte dans le store Blob et renvoie l'erreur brute en cas d'échec. */
export async function runBlobTest(): Promise<BlobTest> {
  const resolved = resolveBlobToken();
  try {
    const blob = await putBlob(
      `diagnostic/test-${Date.now()}.txt`,
      `Test de diagnostic TOAC — ${new Date().toISOString()}`,
      { contentType: "text/plain; charset=utf-8" }
    );
    return { ok: true, url: blob.url, source: resolved?.source ?? "?" };
  } catch (error) {
    return {
      ok: false,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export { BLOB_TOKEN_ENV_NAMES };
