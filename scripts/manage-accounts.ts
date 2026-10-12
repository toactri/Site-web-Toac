/**
 * CLI de gestion des comptes de l'espace adhérents (src/data/accounts.json,
 * ignoré par git). Toutes les commandes lisent/écrivent ce fichier.
 *
 * Usage :
 *   npm run accounts -- list
 *   npm run accounts -- add <username> <password> <"Nom Prénom"> <member|admin>
 *   npm run accounts -- passwd <username> <nouveauMotDePasse>
 *   npm run accounts -- remove <username>
 *
 * Les adhérents n'ont pas besoin de compte : ils se connectent par email
 * (lien + code), voir src/lib/emailLogin.ts.
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { loadEnvLocal } from "./load-env";
import type { Account } from "../src/lib/types";

loadEnvLocal();

const ACCOUNTS_PATH = path.join(process.cwd(), "src", "data", "accounts.json");

function loadAccounts(): Account[] {
  if (!fs.existsSync(ACCOUNTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf8"));
}

function saveAccounts(accounts: Account[]) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2) + "\n", "utf8");
}

async function cmdList() {
  const accounts = loadAccounts();
  console.table(
    accounts.map((a) => ({ username: a.username, name: a.name, role: a.role }))
  );
}

async function cmdAdd(args: string[]) {
  const [username, password, name, role] = args;
  if (!username || !password || !name || !role) {
    console.error(
      'Usage : npm run accounts -- add <username> <password> "<Nom Prénom>" <member|admin>'
    );
    process.exit(1);
  }
  if (role !== "member" && role !== "admin") {
    console.error("Le rôle doit être 'member' ou 'admin'.");
    process.exit(1);
  }

  const accounts = loadAccounts();
  if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
    console.error(`Le compte "${username}" existe déjà.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  accounts.push({ username, passwordHash, name, role });
  saveAccounts(accounts);
  console.log(`✅ Compte "${username}" créé.`);
}

async function cmdPasswd(args: string[]) {
  const [username, newPassword] = args;
  if (!username || !newPassword) {
    console.error("Usage : npm run accounts -- passwd <username> <nouveauMotDePasse>");
    process.exit(1);
  }
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
  if (!account) {
    console.error(`Compte "${username}" introuvable.`);
    process.exit(1);
  }
  account.passwordHash = await bcrypt.hash(newPassword, 10);
  saveAccounts(accounts);
  console.log(`✅ Mot de passe mis à jour pour "${username}".`);
}

async function cmdRemove(args: string[]) {
  const [username] = args;
  if (!username) {
    console.error("Usage : npm run accounts -- remove <username>");
    process.exit(1);
  }
  const accounts = loadAccounts();
  const next = accounts.filter((a) => a.username.toLowerCase() !== username.toLowerCase());
  if (next.length === accounts.length) {
    console.error(`Compte "${username}" introuvable.`);
    process.exit(1);
  }
  saveAccounts(next);
  console.log(`✅ Compte "${username}" supprimé.`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "list":
      return cmdList();
    case "add":
      return cmdAdd(args);
    case "passwd":
      return cmdPasswd(args);
    case "remove":
      return cmdRemove(args);
    default:
      console.log(
        [
          "Commandes disponibles :",
          "  list",
          "  add <username> <password> \"<Nom Prénom>\" <member|admin>",
          "  passwd <username> <nouveauMotDePasse>",
          "  remove <username>",
        ].join("\n")
      );
  }
}

main();
