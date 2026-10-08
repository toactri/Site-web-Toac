import type { MusculationImportInput } from "@/lib/db";
import { parseCsv, parseDateNaissance, normalizeHeader, ImportFormatError } from "@/lib/adherentsImport";

/**
 * Lecture de la liste (CSV) des adhérents déjà validés pour la salle de
 * musculation sur une saison précédente : décharge et certificat médical
 * transmis au club, valables 3 ans. Utilisé par l'import de la vue bureau
 * (Bureau → Décharges musculation).
 *
 * Colonnes reconnues par leur en-tête :
 *  - « Nom » et « Prénom » (obligatoires) ;
 *  - « Date de naissance » (facultative, distingue les homonymes) ;
 *  - « Date décharge » / « Date certificat » / « Date dossier » (facultative,
 *    sert à afficher la fin de validité) ;
 *  - « Commentaire » (facultative).
 *
 * Séparateur virgule (Google Sheets) ou point-virgule (Excel français).
 */

const COLUMNS = {
  nom: ["nom"],
  prenom: ["prenom"],
  dateNaissance: ["datedenaissance", "naissance"],
  dateDossier: ["datedecharge", "datededecharge", "datecertificat", "datedecertificat", "datedossier", "datedudossier", "date"],
  commentaire: ["commentaire", "commentaires", "remarque", "remarques"],
} as const;

type ColumnKey = keyof typeof COLUMNS;

export interface MusculationImportResult {
  adherents: MusculationImportInput[];
  rejets: { ligne: number; nom: string; raison: string }[];
}

export function parseMusculationImportCsv(content: string): MusculationImportResult {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows = parseCsv(content, delimiter);

  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.includes("nom") && normalized.includes("prenom");
  });
  if (headerIndex === -1) {
    throw new ImportFormatError(
      "Ligne d'en-tête introuvable : le fichier doit contenir au moins les colonnes « Nom » et « Prénom »."
    );
  }

  const header = rows[headerIndex].map(normalizeHeader);
  const index = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    index[key] = header.findIndex((h) => (COLUMNS[key] as readonly string[]).includes(h));
  }

  const adherents: MusculationImportInput[] = [];
  const rejets: MusculationImportResult["rejets"] = [];
  const vus = new Set<string>();

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const ligne = headerIndex + i + 2;
    const cell = (key: ColumnKey) => (index[key] === -1 ? "" : (row[index[key]] ?? "").trim());
    const nom = cell("nom");
    const prenom = cell("prenom");
    if (!nom && !prenom) return;
    const label = `${prenom} ${nom}`.trim();

    if (!nom || !prenom) {
      rejets.push({ ligne, nom: label, raison: "nom ou prénom manquant" });
      return;
    }

    let dateNaissance = "";
    if (cell("dateNaissance")) {
      const parsed = parseDateNaissance(cell("dateNaissance"));
      if (!parsed) {
        rejets.push({ ligne, nom: label, raison: `date de naissance illisible (« ${cell("dateNaissance")} »)` });
        return;
      }
      dateNaissance = parsed;
    }

    let dateDossier: string | null = null;
    if (cell("dateDossier")) {
      dateDossier = parseDateNaissance(cell("dateDossier"));
      if (!dateDossier) {
        rejets.push({ ligne, nom: label, raison: `date de décharge illisible (« ${cell("dateDossier")} »)` });
        return;
      }
    }

    const cle = `${nom.toLowerCase()}|${prenom.toLowerCase()}|${dateNaissance}`;
    if (vus.has(cle)) {
      rejets.push({ ligne, nom: label, raison: "doublon dans le fichier" });
      return;
    }
    vus.add(cle);

    adherents.push({ nom, prenom, dateNaissance, dateDossier, commentaire: cell("commentaire") || null });
  });

  return { adherents, rejets };
}
