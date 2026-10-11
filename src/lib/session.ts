import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "toac_session";
/**
 * Durée de session par rôle. Les adhérents se connectent par lien ou code
 * envoyé par email, sans mot de passe : une session longue leur évite de
 * redemander un email à chaque visite. Le bureau garde une durée plus courte,
 * ses droits étant plus étendus.
 */
const SESSION_MAX_AGE_SECONDS: Record<SessionRole, number> = {
  member: 60 * 60 * 24 * 60, // 60 jours
  admin: 60 * 60 * 24 * 7, // 7 jours
};

export type SessionRole = "member" | "admin";

export interface SessionPayload {
  username: string;
  name: string;
  role: SessionRole;
  memberId: string | null;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET n'est pas défini. Ajoutez-le dans votre fichier .env (voir .env.example)."
    );
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payloadB64: string): string {
  return base64url(
    crypto.createHmac("sha256", getSecret()).update(payloadB64).digest()
  );
}

export function createSessionToken(
  payload: Omit<SessionPayload, "exp">
): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS[payload.role] * 1000,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const json = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** À utiliser uniquement dans des Server Components / Route Handlers / Server Actions. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Options du cookie de session, dont la durée suit celle du jeton du rôle. */
export function sessionCookieOptions(role: SessionRole) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS[role],
  };
}
