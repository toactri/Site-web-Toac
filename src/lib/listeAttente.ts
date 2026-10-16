import type { ListeAttenteRow } from "@/lib/db";
import { ageAt } from "@/lib/age";

/**
 * Liste d'attente de la saison suivante, ouverte sur la page Adhésion une
 * fois le club complet. Changer LISTE_ATTENTE_SAISON suffit à ouvrir une
 * nouvelle liste : les inscrits des saisons précédentes restent en base.
 */
export const LISTE_ATTENTE_SAISON = "2027/2028";

export const GENRES = ["Femme", "Homme"] as const;

export const STATUTS = [
  "Ayant-droit Airbus Opérations",
  "Étudiant",
  "Demandeur d'emploi",
  "Autre",
] as const;

/** Statuts ouvrant droit au tarif réduit (y compris le libellé groupé du Google Form 2026/2027). */
const STATUTS_TARIF_REDUIT = [
  "Ayant-droit Airbus Opérations",
  "Étudiant",
  "Demandeur d'emploi",
  "Étudiant / Demandeur d'emploi",
];

export interface StatLigne {
  libelle: string;
  valeur: number | null;
  /** 0–100, null si non applicable. */
  pourcentage: number | null;
}

export interface StatColonne {
  titre: string;
  lignes: StatLigne[];
}

function pct(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 100) : null;
}

function ageMoyen(inscrits: ListeAttenteRow[], now: Date): number | null {
  const ages = inscrits.map((i) => ageAt(i.date_naissance, now)).filter((a): a is number => a !== null);
  return ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;
}

function colonne(titre: string, inscrits: ListeAttenteRow[], now: Date): StatColonne {
  const total = inscrits.length;
  const ligne = (libelle: string, filtre: (i: ListeAttenteRow) => boolean): StatLigne => {
    const n = inscrits.filter(filtre).length;
    return { libelle, valeur: n, pourcentage: pct(n, total) };
  };
  return {
    titre,
    lignes: [
      { libelle: "Inscrits", valeur: total, pourcentage: null },
      ligne("Dispo bénévolat TDL", (i) => i.benevole_tdl),
      ligne("Femmes", (i) => i.genre === "Femme"),
      ligne("Tarif réduit", (i) => STATUTS_TARIF_REDUIT.includes(i.statut)),
      ligne("Ayant-droit Airbus Opérations", (i) => i.statut === "Ayant-droit Airbus Opérations"),
      ligne("Étudiant / Demandeur d'emploi", (i) => i.statut !== "Ayant-droit Airbus Opérations" && STATUTS_TARIF_REDUIT.includes(i.statut)),
      { libelle: "Âge moyen", valeur: ageMoyen(inscrits, now), pourcentage: null },
    ],
  };
}

/** Indicateurs de la vue bureau : global, puis selon la disponibilité TDL (critère de priorité). */
export function statsListeAttente(inscrits: ListeAttenteRow[], now = new Date()): StatColonne[] {
  return [
    colonne("Global", inscrits, now),
    colonne("Dispo TDL", inscrits.filter((i) => i.benevole_tdl), now),
    colonne("Non dispo TDL", inscrits.filter((i) => !i.benevole_tdl), now),
  ];
}
