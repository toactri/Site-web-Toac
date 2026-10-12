import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getAccountByUsername } from "./data-store";
import { createSessionToken } from "./session";
import type { Account } from "./types";

/**
 * Compte bureau défini par variables d'environnement (ADMIN_USERNAME +
 * ADMIN_PASSWORD), en plus des comptes du fichier src/data/accounts.json.
 *
 * Pourquoi : accounts.json contient des hachages de mots de passe et n'est donc
 * pas versionné (voir .gitignore) — il n'existe pas sur le serveur déployé.
 * Sans ce compte-là, personne ne peut ouvrir l'espace adhérents en production.
 *
 * Le mot de passe est comparé en temps constant. Il vit dans les variables
 * d'environnement du projet, comme SITE_PASSWORD : jamais dans le dépôt, jamais
 * envoyé au navigateur.
 */
const MIN_ADMIN_PASSWORD_LENGTH = 8;

function equalsInConstantTime(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function authenticateEnvAdmin(username: string, password: string): Account | null {
  const expectedUsername = process.env.ADMIN_USERNAME?.trim();
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!expectedUsername || !expectedPassword) return null;

  if (expectedPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    console.error(
      `ADMIN_PASSWORD fait moins de ${MIN_ADMIN_PASSWORD_LENGTH} caractères : compte bureau désactivé.`
    );
    return null;
  }

  // Le nom d'utilisateur n'est pas un secret : la comparaison en temps constant
  // ne porte que sur le mot de passe.
  if (username.trim().toLowerCase() !== expectedUsername.toLowerCase()) return null;
  if (!equalsInConstantTime(password, expectedPassword)) return null;

  return {
    username: expectedUsername,
    passwordHash: "",
    name: process.env.ADMIN_NAME?.trim() || "Bureau TOAC",
    role: "admin",
  };
}

export async function authenticate(
  username: string,
  password: string
): Promise<Account | null> {
  const envAdmin = authenticateEnvAdmin(username, password);
  if (envAdmin) return envAdmin;

  const account = getAccountByUsername(username.trim());
  if (!account) return null;

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) return null;

  return account;
}

export function buildSessionTokenForAccount(account: Account): string {
  return createSessionToken({
    username: account.username,
    name: account.name,
    role: account.role,
  });
}
