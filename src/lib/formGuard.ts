import "server-only";
import crypto from "node:crypto";

/**
 * Anti-spam des formulaires publics envoyés en POST HTML classique (sans
 * JavaScript côté client), ex. la demande d'avantage Alltricks.
 *
 * Trois filets, du plus sûr au plus heuristique :
 * 1. Jeton horodaté et signé, posé dans le formulaire au rendu de la page :
 *    un robot qui envoie directement la requête sans charger la page n'en a
 *    pas, et ne peut pas le fabriquer. Il donne aussi le délai de remplissage
 *    (un humain met plus de quelques secondes).
 * 2. Champ piège invisible : un humain ne le voit pas, un robot le remplit.
 * 3. Nom ET prénom en suite de lettres aléatoires (« upRdYSNnuExNMCWJxXRH ») :
 *    signature des robots de spam de formulaires.
 */

export const FORM_TOKEN_FIELD = "jeton";
export const HONEYPOT_FIELD = "hp_note";

const MIN_FILL_MS = 3_000;
/** Au-delà, on demande de recharger la page plutôt que d'accepter un vieux jeton rejoué. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function sign(timestamp: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`form-guard:${timestamp}`).digest("hex").slice(0, 32);
}

/** Jeton à placer dans un champ caché du formulaire, au rendu de la page. */
export function createFormToken(now = Date.now()): string {
  const timestamp = String(now);
  const signature = sign(timestamp);
  return signature ? `${timestamp}.${signature}` : timestamp;
}

export type FormGuardVerdict =
  /** Soumission acceptée. */
  | { kind: "ok" }
  /** Robot quasi certain : faire comme si tout allait bien, sans rien enregistrer ni envoyer. */
  | { kind: "spam"; reason: string }
  /** Jeton absent ou trop vieux : un humain peut tomber dessus, on lui demande de recharger. */
  | { kind: "reload"; reason: string };

/** Suite de lettres sans espace ni tiret, avec au moins 3 majuscules internes. */
function looksRandom(value: string): boolean {
  if (value.length < 10 || !/^[A-Za-z]+$/.test(value)) return false;
  return (value.slice(1).match(/[A-Z]/g) ?? []).length >= 3;
}

export function checkFormSubmission(form: FormData, identity: { nom: string; prenom: string }): FormGuardVerdict {
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim()) {
    return { kind: "spam", reason: "champ piège rempli" };
  }

  const token = String(form.get(FORM_TOKEN_FIELD) ?? "");
  if (!token) return { kind: "reload", reason: "jeton absent" };

  const [timestamp, signature] = token.split(".");
  const expected = sign(timestamp);
  if (expected) {
    const valid =
      typeof signature === "string" &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) return { kind: "spam", reason: "jeton falsifié" };
  }

  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age)) return { kind: "spam", reason: "jeton illisible" };
  if (age < MIN_FILL_MS) return { kind: "spam", reason: `envoyé en ${age} ms` };
  if (age > MAX_AGE_MS) return { kind: "reload", reason: "jeton expiré" };

  if (looksRandom(identity.nom) && looksRandom(identity.prenom)) {
    return { kind: "spam", reason: "nom et prénom aléatoires" };
  }

  return { kind: "ok" };
}
