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

const SPORT_LABELS: Record<string, string> = {
  natation: "Natation",
  course: "CAP",
  velo: "Vélo",
  muscu: "Musculation",
};

function timeRange(s: CmsTrainingSession): string {
  return s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time);
}

/**
 * Créneaux d'un lieu (sessions dont location_anchor = ancre de la fiche lieu),
 * en liste Markdown regroupée par horaire : "- Lundi, jeudi, vendredi — 7h – 8h30".
 * Le sport est précisé quand le lieu en accueille plusieurs. Null si aucun.
 */
export function locationSlotsList(sessions: CmsTrainingSession[] | null, anchor: string | null): string | null {
  if (!anchor) return null;
  const atLocation = (sessions ?? []).filter((s) => s.location_anchor === anchor);
  if (!atLocation.length) return null;

  const multiSport = new Set(atLocation.map((s) => s.sport)).size > 1;
  const groups = new Map<string, { sport: string; range: string; days: Set<string> }>();
  for (const s of atLocation) {
    const range = timeRange(s);
    const key = `${s.sport}|${range}`;
    if (!groups.has(key)) groups.set(key, { sport: s.sport, range, days: new Set() });
    groups.get(key)!.days.add(s.day);
  }

  const firstDay = (days: Set<string>) => Math.min(...[...days].map((d) => DAY_ORDER.indexOf(d)));
  return [...groups.values()]
    .sort((a, b) => firstDay(a.days) - firstDay(b.days) || a.range.localeCompare(b.range))
    .map((g) => {
      const days = DAY_ORDER.filter((d) => g.days.has(d)).join(", ");
      const label = multiSport ? ` (${SPORT_LABELS[g.sport] ?? g.sport})` : "";
      return `- ${days.charAt(0).toUpperCase()}${days.slice(1)} — ${g.range}${label}`;
    })
    .join("\n");
}

/** Tableau Markdown "Jour | Horaire | Lieu" des créneaux d'un sport. Null si aucun. */
export function sportSlotsTableWithLocation(sessions: CmsTrainingSession[] | null, sport: string): string | null {
  const ofSport = (sessions ?? [])
    .filter((s) => s.sport === sport)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start_time.localeCompare(b.start_time));
  if (!ofSport.length) return null;
  const rows = ofSport.map(
    (s) => `| ${s.day.charAt(0).toUpperCase()}${s.day.slice(1)} | ${timeRange(s)} | ${s.location} |`
  );
  return ["| Jour | Horaire | Lieu |", "| --- | --- | --- |", ...rows].join("\n");
}
