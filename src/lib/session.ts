import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { MembreRole } from "@/lib/db";

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
  exp: number;
  /** Rôles attribués sur le site (relus à chaque requête par getSession, absents du cookie). */
  roles?: MembreRole[];
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

/**
 * Session de la requête, à utiliser uniquement dans des Server Components /
 * Route Handlers / Server Actions. Pour une connexion par email, le rôle est
 * recalculé à partir des rôles actuels (src/lib/roles.ts) plutôt que repris du
 * cookie : un rôle retiré ou ajouté sur le site s'applique sans reconnexion, et
 * une personne sans rôle ni adhésion de la saison n'est plus connectée.
 * Une seule lecture en base par requête (cache React).
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  // Compte bureau à mot de passe (ADMIN_USERNAME) : pas d'email, rôle du cookie.
  if (!payload || !payload.username.includes("@")) return payload;

  // Import dynamique : ce module est aussi chargé par le proxy, qui n'a pas
  // besoin de la base.
  const { resolveRoles, aAccesBureau, aAccesEspace } = await import("@/lib/roles");
  try {
    const r = await resolveRoles(payload.username);
    if (!aAccesEspace(r)) return null;
    return { ...payload, role: aAccesBureau(r) ? "admin" : "member", roles: r.roles };
  } catch (error) {
    // Base momentanément indisponible : on garde le rôle obtenu à la connexion.
    console.error("[session] Lecture des rôles impossible :", error);
    return payload;
  }
});

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
