import type { AdherentSaisonInput } from "@/lib/db";

/**
 * Lecture de l'export CSV de l'onglet « Dossiers adhésion » du Google Sheets
 * d'adhésion (Fichier → Télécharger → CSV, onglet ouvert). Utilisé par l'import
 * de la vue bureau (Bureau → Attestations).
 *
 * Les colonnes sont retrouvées par leur en-tête, pas par leur position : une
 * colonne ajoutée ou déplacée dans le Sheets ne casse pas l'import.
 *
 * Montants retenus pour l'attestation :
 *  - cotisation club = « Cotiz » − « Réduc » (montant réellement payé après
 *    tarif réduit ; ni la trifonction ni le dépôt de caution n'en font partie) ;
 *  - licence = « Licence (€) ».
 */

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Un export enregistré par Excel commence parfois par un BOM.
  const text = content.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * « Réduc? » et « Réduc » sont deux colonnes distinctes (Oui/Non et montant) :
 * le point d'interrogation est donc conservé, seuls accents, casse, espaces,
 * parenthèses et symbole € disparaissent.
 */
function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9?]/g, "");
}

const COLUMNS = {
  nom: ["nom"],
  prenom: ["prenom"],
  dateNaissance: ["datedenaissance"],
  sexe: ["sexe"],
  email: ["adresseemail", "email"],
  cotiz: ["cotiz", "cotisation"],
  reduc: ["reduc"],
  licence: ["licence"],
  statut: ["statutdudossier"],
} as const;

type ColumnKey = keyof typeof COLUMNS;
const REQUIRED: ColumnKey[] = ["nom", "prenom", "dateNaissance", "email", "cotiz", "reduc", "licence", "statut"];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  nom: "Nom",
  prenom: "Prénom",
  dateNaissance: "Date de naissance",
  sexe: "Sexe",
  email: "Adresse email",
  cotiz: "Cotiz",
  reduc: "Réduc",
  licence: "Licence (€)",
  statut: "Statut du dossier",
};

/** « 100,70 € », « 1 234,5 », « 101 € », « 100.7 » → centimes. Vide → 0. */
export function parseMontantCentimes(value: string | undefined): number | null {
  const cleaned = (value ?? "").replace(/[\s  €]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return 0;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** « 24/01/1980 » (ou « 1980-01-24 ») → « 1980-01-24 », sinon null. */
export function parseDateNaissance(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  let day: number, month: number, year: number;
  let match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (match) {
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v))) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface ImportResult {
  adherents: AdherentSaisonInput[];
  /** Lignes écartées, avec la raison, pour le compte rendu affiché au bureau. */
  rejets: { ligne: number; nom: string; raison: string }[];
  avertissements: string[];
}

export class ImportFormatError extends Error {}

export function parseDossiersAdhesionCsv(content: string): ImportResult {
  const rows = parseCsv(content);
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.includes("nom") && normalized.includes("prenom");
  });
  if (headerIndex === -1) {
    throw new ImportFormatError(
      "Ligne d'en-tête introuvable (colonnes « Nom » et « Prénom »). Exportez bien l'onglet « Dossiers adhésion » au format CSV."
    );
  }

  const header = rows[headerIndex].map(normalizeHeader);
  const index = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    index[key] = header.findIndex((h) => (COLUMNS[key] as readonly string[]).includes(h));
  }
  const missing = REQUIRED.filter((key) => index[key] === -1);
  if (missing.length > 0) {
    throw new ImportFormatError(
      `Colonnes introuvables dans le fichier : ${missing.map((k) => `« ${COLUMN_LABELS[k]} »`).join(", ")}.`
    );
  }

  const adherents: AdherentSaisonInput[] = [];
  const rejets: ImportResult["rejets"] = [];

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const ligne = headerIndex + i + 2; // numéro de ligne tel qu'affiché dans le Sheets
    const cell = (key: ColumnKey) => (index[key] === -1 ? "" : (row[index[key]] ?? "").trim());
    const nom = cell("nom");
    const prenom = cell("prenom");
    if (!nom && !prenom) return;
    const label = `${prenom} ${nom}`.trim();

    if (!nom || !prenom) {
      rejets.push({ ligne, nom: label, raison: "nom ou prénom manquant" });
      return;
    }
    const dateNaissance = parseDateNaissance(cell("dateNaissance"));
    if (!dateNaissance) {
      rejets.push({ ligne, nom: label, raison: `date de naissance illisible (« ${cell("dateNaissance")} »)` });
      return;
    }
    const cotiz = parseMontantCentimes(cell("cotiz"));
    const reduc = parseMontantCentimes(cell("reduc"));
    const licence = parseMontantCentimes(cell("licence"));
    if (cotiz === null || reduc === null || licence === null) {
      rejets.push({ ligne, nom: label, raison: "montant illisible (Cotiz, Réduc ou Licence)" });
      return;
    }

    const email = cell("email");
    adherents.push({
      nom,
      prenom,
      dateNaissance,
      sexe: cell("sexe") || null,
      email: email || null,
      cotisationCentimes: Math.max(0, cotiz - reduc),
      licenceCentimes: Math.max(0, licence),
      statutDossier: cell("statut") || null,
    });
  });

  const avertissements: string[] = [];
  const licences = adherents.map((a) => a.licenceCentimes).filter((c) => c > 0);
  if (licences.length > 0 && licences.every((c) => c % 100 === 0)) {
    // La colonne Licence (€) du Sheets est affichée arrondie à l'euro, et
    // l'export CSV reprend la valeur affichée : 100,70 € deviendrait 101 €.
    avertissements.push(
      "Tous les montants de licence sont des euros ronds : la colonne « Licence (€) » est sans doute " +
        "affichée arrondie dans le Sheets, et l'export CSV reprend la valeur affichée (101 € au lieu de " +
        "100,70 €). Passez cette colonne au format « 0,00 € » (Format → Nombre → Devise), réexportez et " +
        "réimportez avant de laisser les adhérents générer leur attestation."
    );
  }
  const sansEmail = adherents.filter((a) => !a.email).length;
  if (sansEmail > 0) {
    avertissements.push(`${sansEmail} adhérent(s) sans adresse email : ils ne pourront pas recevoir d'attestation.`);
  }

  return { adherents, rejets, avertissements };
}

/** Le dossier est-il réglé ? Seuls les dossiers « Payé » ouvrent droit à une attestation. */
export function isDossierPaye(statut: string | null): boolean {
  return (statut ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase() === "paye";
}

/** Saison sportive en cours, ex. « 2026/2027 » à partir du 1er août 2026. */
export function currentSaison(now = new Date()): string {
  const year = now.getFullYear();
  const start = now.getMonth() >= 7 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/** « 2026/2027 » ou « 2026-2027 » → « 2026/2027 », sinon null. */
export function normalizeSaison(value: string): string | null {
  const match = /^\s*(\d{4})\s*[/-]\s*(\d{4})\s*$/.exec(value);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;
  return `${match[1]}/${match[2]}`;
}
