import type { AdherentSaisonRow } from "@/lib/db";

/**
 * Indicateurs de la vue bureau, calculés comme dans l'onglet « Tableau de
 * bord » du Google Sheets d'adhésion :
 *  - anciens = profil « Toaciste » ou « Retour », nouveaux = « Nouveau » ou
 *    « Mutant » ;
 *  - tableau « Adhérents » : dossiers « Payé » uniquement ;
 *  - pourcentages rapportés au nombre de dossiers de la même colonne
 *    (sauf la ligne Dossiers : part des anciens / nouveaux dans le global) ;
 *  - financier : « attendu » = dossiers hors Abandonné / Refusé / Remboursé,
 *    « réglé » = dossiers Payé.
 */

type Adherent = AdherentSaisonRow;

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const PROFILS_ANCIENS = ["toaciste", "retour"];
const PROFILS_NOUVEAUX = ["nouveau", "mutant"];
const STATUTS_EXCLUS = ["abandonne", "refuse", "rembourse"];
const CP_TOULOUSE = ["31000", "31100", "31200", "31300", "31400", "31500"];

export const isAncien = (a: Adherent) => PROFILS_ANCIENS.includes(norm(a.profil));
export const isNouveau = (a: Adherent) => PROFILS_NOUVEAUX.includes(norm(a.profil));
export const isPaye = (a: Adherent) => norm(a.statut_dossier) === "paye";

function ageMoyen(adherents: Adherent[], now: Date): number | null {
  const ages = adherents
    .map((a) => Date.parse(a.date_naissance))
    .filter((t) => !Number.isNaN(t))
    .map((t) => (now.getTime() - t) / (365.25 * 86_400_000));
  if (ages.length === 0) return null;
  return Math.round(ages.reduce((s, x) => s + x, 0) / ages.length);
}

export interface KpiCellule {
  valeur: number | null;
  /** Pourcentage 0–100 arrondi, null si non applicable. */
  pourcentage: number | null;
}

export interface KpiLigne {
  libelle: string;
  global: KpiCellule;
  anciens: KpiCellule;
  nouveaux: KpiCellule;
}

const LIGNES: { libelle: string; filtre: (a: Adherent) => boolean }[] = [
  { libelle: "TDL", filtre: (a) => norm(a.benevole_tdl) === "oui" },
  { libelle: "Femmes", filtre: (a) => norm(a.sexe) === "femme" },
  { libelle: "Tarif réduit", filtre: (a) => norm(a.reduc_demandee) === "oui" },
  { libelle: "Ayant droit Airbus Opérations", filtre: (a) => norm(a.statut_tarif) === "ayant droit airbus operations" },
  { libelle: "Étudiant / Demandeur d'emploi", filtre: (a) => norm(a.statut_tarif) === "etudiant / demandeur d'emploi" },
  { libelle: "Toulousains", filtre: (a) => CP_TOULOUSE.includes((a.code_postal ?? "").trim()) },
  { libelle: "Licence Compétition", filtre: (a) => norm(a.licence_demandee) === "competition" },
  { libelle: "Licence Loisir", filtre: (a) => norm(a.licence_demandee) === "loisir" },
  { libelle: "Musculation (validés)", filtre: (a) => a.musculation === true },
];

function pct(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 100) : null;
}

export function kpiAdherents(adherents: Adherent[], now = new Date()): KpiLigne[] {
  const groupes = {
    global: adherents,
    anciens: adherents.filter(isAncien),
    nouveaux: adherents.filter(isNouveau),
  };
  const total = groupes.global.length;
  const lignes: KpiLigne[] = [
    {
      libelle: "Dossiers",
      global: { valeur: total, pourcentage: null },
      anciens: { valeur: groupes.anciens.length, pourcentage: pct(groupes.anciens.length, total) },
      nouveaux: { valeur: groupes.nouveaux.length, pourcentage: pct(groupes.nouveaux.length, total) },
    },
  ];
  for (const { libelle, filtre } of LIGNES) {
    const cellule = (groupe: Adherent[]): KpiCellule => {
      const n = groupe.filter(filtre).length;
      return { valeur: n, pourcentage: pct(n, groupe.length) };
    };
    lignes.push({
      libelle,
      global: cellule(groupes.global),
      anciens: cellule(groupes.anciens),
      nouveaux: cellule(groupes.nouveaux),
    });
  }
  lignes.push({
    libelle: "Âge moyen",
    global: { valeur: ageMoyen(groupes.global, now), pourcentage: null },
    anciens: { valeur: ageMoyen(groupes.anciens, now), pourcentage: null },
    nouveaux: { valeur: ageMoyen(groupes.nouveaux, now), pourcentage: null },
  });
  return lignes;
}

export interface KpiFinancier {
  libelle: string;
  /** Montants en centimes. */
  attendu: number;
  regle: number;
}

export function kpiFinancier(adherents: Adherent[]): KpiFinancier[] {
  const attendus = adherents.filter((a) => !STATUTS_EXCLUS.includes(norm(a.statut_dossier)));
  const regles = adherents.filter(isPaye);
  const somme = (groupe: Adherent[], champ: (a: Adherent) => number | null) =>
    groupe.reduce((s, a) => s + (champ(a) ?? 0), 0);
  const ligne = (libelle: string, champ: (a: Adherent) => number | null): KpiFinancier => ({
    libelle,
    attendu: somme(attendus, champ),
    regle: somme(regles, champ),
  });
  return [
    ligne("Part club", (a) => a.part_club_centimes),
    ligne("Cotisations nettes", (a) => (a.cotiz_brute_centimes ?? 0) - (a.reduc_centimes ?? 0)),
    ligne("Cotisations brutes", (a) => a.cotiz_brute_centimes),
    ligne("Réductions", (a) => a.reduc_centimes),
    ligne("Dépôts", (a) => a.depot_centimes),
    ligne("Trifonctions", (a) => a.trifonction_centimes),
  ];
}

/** Nombre de dossiers par statut (« Statut du dossier »), du plus fréquent au moins fréquent. */
export function kpiStatuts(adherents: Adherent[]): { statut: string; total: number }[] {
  const compte = new Map<string, number>();
  for (const a of adherents) {
    const statut = (a.statut_dossier ?? "").trim() || "Sans statut";
    compte.set(statut, (compte.get(statut) ?? 0) + 1);
  }
  return [...compte.entries()].map(([statut, total]) => ({ statut, total })).sort((a, b) => b.total - a.total);
}
