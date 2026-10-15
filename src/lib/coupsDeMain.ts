import { parseCsv, parseDateNaissance, ImportFormatError } from "@/lib/adherentsImport";
import type { CoupDeMainAdherentRow, CoupDeMainReponse } from "@/lib/db";

/**
 * Coups de main proposés par les adhérents : lecture de l'onglet « Réponses »
 * du formulaire d'adhésion et indicateurs de la page Bureau → Coups de main.
 */

/** Option du formulaire qui signifie « pas de coup de main ». */
export const OPTION_SANS_AIDE = "Je préfère profiter des entraînements";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const SANS_AIDE = normalize(OPTION_SANS_AIDE);

/**
 * Actions cochées dans la cellule « Je souhaite donner un coup de main sur : »
 * (Google Forms les sépare par « , »), sans l'option « Je préfère profiter des
 * entraînements » ni les valeurs vides.
 */
export function parseActions(cellule: string): string[] {
  return [
    ...new Set(
      cellule
        .split(/,\s*/)
        .map((a) => a.trim())
        .filter((a) => a && !normalize(a).startsWith(SANS_AIDE))
    ),
  ];
}

export function parseReponsesCsv(content: string): { reponses: CoupDeMainReponse[]; rejets: string[] } {
  const rows = parseCsv(content);
  const header = (rows[0] ?? []).map(normalize);
  const col = (predicate: (h: string) => boolean) => header.findIndex(predicate);
  const iNom = col((h) => h === "nom");
  const iPrenom = col((h) => h === "prenom");
  const iNaissance = col((h) => h === "datedenaissance");
  const iActions = col((h) => h.includes("coupdemain"));
  const manquantes = [
    iNom === -1 && "Nom",
    iPrenom === -1 && "Prénom",
    iNaissance === -1 && "Date de naissance",
    iActions === -1 && "Je souhaite donner un coup de main sur :",
  ].filter(Boolean);
  if (manquantes.length > 0) {
    throw new ImportFormatError(
      `Colonnes introuvables : ${manquantes.map((c) => `« ${c} »`).join(", ")}. Exportez bien l'onglet « Réponses » au format CSV.`
    );
  }

  const reponses: CoupDeMainReponse[] = [];
  const rejets: string[] = [];
  for (const row of rows.slice(1)) {
    const nom = (row[iNom] ?? "").trim();
    const prenom = (row[iPrenom] ?? "").trim();
    if (!nom && !prenom) continue;
    const dateNaissance = parseDateNaissance(row[iNaissance]);
    if (!nom || !prenom || !dateNaissance) {
      rejets.push(`${prenom} ${nom}`.trim() || "(sans nom)");
      continue;
    }
    reponses.push({ nom, prenom, dateNaissance, actions: parseActions(row[iActions] ?? "") });
  }
  return { reponses, rejets };
}

// ─── Indicateurs ─────────────────────────────────────────────────────────

export interface Repartition {
  libelle: string;
  effectif: number;
  pourcentage: number;
}

export interface Correlation {
  groupe: string;
  effectif: number;
  motives: number;
  pourcentageMotives: number;
  moyenneActions: number;
}

export interface CoupsDeMainStats {
  adherents: number;
  repondants: number;
  motives: number;
  /** Actions du formulaire, de la plus choisie à la moins choisie. */
  actions: string[];
  parAction: Repartition[];
  parNombre: Repartition[];
  correlations: { titre: string; lignes: Correlation[] }[];
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function age(dateNaissance: string, aujourdHui = new Date()): number | null {
  const [y, m, d] = dateNaissance.split("-").map(Number);
  if (!y || !m || !d) return null;
  let a = aujourdHui.getFullYear() - y;
  if (aujourdHui.getMonth() + 1 < m || (aujourdHui.getMonth() + 1 === m && aujourdHui.getDate() < d)) a--;
  return a;
}

const TRANCHES_AGE = [
  { libelle: "Moins de 25 ans", max: 24 },
  { libelle: "25 – 34 ans", max: 34 },
  { libelle: "35 – 44 ans", max: 44 },
  { libelle: "45 – 54 ans", max: 54 },
  { libelle: "55 ans et plus", max: Infinity },
];

export function trancheAge(dateNaissance: string): string {
  const a = age(dateNaissance);
  if (a === null) return "Inconnu";
  return TRANCHES_AGE.find((t) => a <= t.max)!.libelle;
}

function correlation(
  repondants: (CoupDeMainAdherentRow & { actions: string[] })[],
  groupe: (a: CoupDeMainAdherentRow) => string,
  ordre?: string[]
): Correlation[] {
  const groupes = new Map<string, (CoupDeMainAdherentRow & { actions: string[] })[]>();
  for (const a of repondants) {
    const g = groupe(a);
    groupes.set(g, [...(groupes.get(g) ?? []), a]);
  }
  const cles = ordre
    ? ordre.filter((o) => groupes.has(o)).concat([...groupes.keys()].filter((k) => !ordre.includes(k)))
    : [...groupes.keys()].sort((x, y) => groupes.get(y)!.length - groupes.get(x)!.length);
  return cles.map((g) => {
    const membres = groupes.get(g)!;
    const motives = membres.filter((a) => a.actions.length > 0).length;
    const total = membres.reduce((s, a) => s + a.actions.length, 0);
    return {
      groupe: g,
      effectif: membres.length,
      motives,
      pourcentageMotives: pct(motives, membres.length),
      moyenneActions: membres.length > 0 ? Math.round((total / membres.length) * 10) / 10 : 0,
    };
  });
}

/** Indicateurs calculés sur les adhérents de la saison qui ont une réponse importée. */
export function coupsDeMainStats(adherents: CoupDeMainAdherentRow[]): CoupsDeMainStats {
  const repondants = adherents.filter((a): a is CoupDeMainAdherentRow & { actions: string[] } => a.actions !== null);
  const n = repondants.length;

  const compte = new Map<string, number>();
  for (const a of repondants) for (const action of a.actions) compte.set(action, (compte.get(action) ?? 0) + 1);
  const actions = [...compte.keys()].sort((x, y) => compte.get(y)! - compte.get(x)! || x.localeCompare(y, "fr"));

  const max = Math.max(0, ...repondants.map((a) => a.actions.length));
  const parNombre = Array.from({ length: max + 1 }, (_, k) => {
    const effectif = repondants.filter((a) => a.actions.length === k).length;
    return {
      libelle: k === 0 ? "0 (pas de coup de main)" : `${k} action${k > 1 ? "s" : ""}`,
      effectif,
      pourcentage: pct(effectif, n),
    };
  });

  return {
    adherents: adherents.length,
    repondants: n,
    motives: repondants.filter((a) => a.actions.length > 0).length,
    actions,
    parAction: actions.map((a) => ({ libelle: a, effectif: compte.get(a)!, pourcentage: pct(compte.get(a)!, n) })),
    parNombre,
    correlations: [
      { titre: "Statut (tarif)", lignes: correlation(repondants, (a) => a.statut_tarif?.trim() || "Non renseigné") },
      { titre: "Profil", lignes: correlation(repondants, (a) => a.profil?.trim() || "Non renseigné") },
      {
        titre: "Âge",
        lignes: correlation(
          repondants,
          (a) => trancheAge(a.date_naissance),
          TRANCHES_AGE.map((t) => t.libelle)
        ),
      },
      { titre: "Genre", lignes: correlation(repondants, (a) => a.sexe?.trim() || "Non renseigné") },
    ],
  };
}
