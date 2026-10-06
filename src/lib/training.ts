// Mise en forme des données structurées du planning (dashboard → Planning)
// et des encadrants (dashboard → Catalogue → Encadrement sportif), pour que
// les pages de sport les affichent au lieu de recopies tapées dans un bloc.

import type { CmsCatalogSection, CmsProduct, CmsTrainingSession } from "@/lib/cms";

const DAY_ORDER = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** "07:00:00" → "7h", "09:30:00" → "9h30". */
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hours = String(parseInt(h, 10) || 0);
  return m && m !== "00" ? `${hours}h${m}` : `${hours}h`;
}

/** "7h – 9h, 13h – 14h et 18h – 19h" */
function joinRanges(ranges: string[]): string {
  if (ranges.length <= 1) return ranges.join("");
  return `${ranges.slice(0, -1).join(", ")} et ${ranges[ranges.length - 1]}`;
}

/**
 * Tableau Markdown "Jour | Horaires" des créneaux d'un sport, rendu ensuite
 * par renderRichText comme les tableaux saisis dans les blocs. Null si le
 * planning n'a aucun créneau pour ce sport.
 */
export function weeklySlotsTable(sessions: CmsTrainingSession[] | null, sport: string): string | null {
  const ofSport = (sessions ?? []).filter((s) => s.sport === sport);
  if (!ofSport.length) return null;

  const rows = DAY_ORDER.flatMap((day) => {
    const ranges = ofSport
      .filter((s) => s.day === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((s) => (s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time)));
    if (!ranges.length) return [];
    return [`| ${day.charAt(0).toUpperCase()}${day.slice(1)} | ${joinRanges(ranges)} |`];
  });

  return ["| Jour | Horaires |", "| --- | --- |", ...rows].join("\n");
}

export const COACHES_SECTION_NAME = "Encadrement sportif";

/** Encadrants d'un sport, dans l'ordre de la rubrique "Encadrement sportif". */
export function coachesForSport(catalog: CmsCatalogSection[] | null, sport: string): CmsProduct[] {
  const coaches = catalog?.find((s) => s.name === COACHES_SECTION_NAME)?.products ?? [];
  return coaches.filter((c) => c.sports?.includes(sport));
}
