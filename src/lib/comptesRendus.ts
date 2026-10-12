/**
 * Rubriques des comptes rendus de course : un sous-dossier du Drive du club
 * chacune. Partagé entre la page (liens vers les dossiers), le formulaire
 * d'envoi (liste des catégories) et la route qui range le PDF dans le Drive —
 * celle-ci n'accepte que ces identifiants de dossier.
 */

export const DOSSIER_DRIVE_ID = "1dOpD_dMQ8Th-eDHKImZizeLdHg2_UyV9";

export interface RubriqueCompteRendu {
  titre: string;
  detail: string;
  /** Identifiant du sous-dossier Google Drive. */
  id: string;
  /** Préfixe du nom de fichier, ex. « IM » pour « 26-IM-Tours-Rémi.pdf ». */
  prefixe: string;
}

export const RUBRIQUES: RubriqueCompteRendu[] = [
  { titre: "Ironman", detail: "Hawaï, Tours…", id: "1FTOuEh7bGVUxyMTCvj8XJLnTmqBAUzJB", prefixe: "IM" },
  { titre: "Embrunman", detail: "Le mythe haut-alpin.", id: "1B96bKMK0Z_ozSryVelFjOCemnNXWmm9v", prefixe: "Embrunman" },
  { titre: "Altriman", detail: "Half et Olympic.", id: "1W_XnJqoCv7ibJOuGw7qauDjyGNiKvyhf", prefixe: "Altriman" },
  { titre: "Saison triathlon", detail: "Bilans de toute une saison.", id: "1cNo-onJ19tPKIdzLHQKlXTTuRaeg63fB", prefixe: "Saison" },
  { titre: "Duathlons", detail: "", id: "1MqEt2dnKQ6ZwJnztfhkH-xD-EXrJqxVY", prefixe: "Duathlon" },
  { titre: "Marathons", detail: "Paris, Séville…", id: "1bnt9uZ7W8h6bcBS087AAp-DI4Zqu7Q8B", prefixe: "Marathon" },
  { titre: "Trails", detail: "", id: "1KliKRNCH3jAOmKxjeXePxP3OKg7g2Mx7", prefixe: "Trail" },
  { titre: "Swimrun", detail: "", id: "1hWlvojCx7sB_BCQ4iEJFKihIdg0_LOOw", prefixe: "Swimrun" },
  { titre: "Autres", detail: "XTri, paratriathlon, gazettes…", id: "1UxNcSsO9Kk3qic5lZ6-lCdr-rXMJDqMc", prefixe: "" },
];

/** Taille maximale d'un PDF envoyé (les CR illustrés de photos dépassent souvent 5 Mo). */
export const MAX_COMPTE_RENDU_BYTES = 20 * 1024 * 1024;

/** Préfixe des fichiers déposés temporairement dans le store Blob, avant transfert vers le Drive. */
export const BLOB_PREFIX = "comptes-rendus/";

/** Années proposées : de la saison en cours jusqu'à 2015. */
export function anneesProposees(now = new Date()): number[] {
  const annees: number[] = [];
  for (let a = now.getFullYear(); a >= 2015; a--) annees.push(a);
  return annees;
}

/**
 * Nom du fichier dans le Drive, sur la convention du dossier :
 * « 26-IM-Tours-Rémi.pdf ». Les caractères interdits ou gênants sont retirés,
 * les accents conservés.
 */
export function nomFichierCompteRendu(annee: number, prefixe: string, course: string, prenom: string): string {
  const propre = (s: string) => s.replace(/[\\/:*?"<>|#%]+/g, " ").replace(/\s+/g, " ").trim();
  const morceaux = [String(annee % 100).padStart(2, "0"), propre(prefixe), propre(course), propre(prenom)];
  return `${morceaux.filter(Boolean).join("-")}.pdf`;
}
