import "server-only";
import type { SessionPayload } from "@/lib/session";

/**
 * Membres du bureau autorisés à cocher « validé musculation » (dossiers des
 * saisons précédentes) : les autres membres du bureau voient la liste des
 * validés, mais pas la fonction.
 *
 * Par défaut, les deux responsables désignés, reconnus à leur nom de session
 * (« Prénom Nom » de leur fiche adhérent quand ils se connectent par email).
 * MUSCULATION_VALIDATEURS (noms ou emails, séparés par des virgules) remplace
 * cette liste sans toucher au code — utile si un nom change ou pour ajouter
 * quelqu'un. Les emails ne sont pas mis ici : le dépôt est public.
 */
const VALIDATEURS_PAR_DEFAUT = ["Julien Derville", "Gabriel Messaut"];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function validateurs(): Set<string> {
  const env = process.env.MUSCULATION_VALIDATEURS?.trim();
  const liste = env ? env.split(",") : VALIDATEURS_PAR_DEFAUT;
  return new Set(liste.map(normalize).filter(Boolean));
}

export function canValidateMusculation(session: Pick<SessionPayload, "role" | "name" | "username"> | null): boolean {
  if (session?.role !== "admin") return false;
  const autorises = validateurs();
  return autorises.has(normalize(session.name ?? "")) || autorises.has(normalize(session.username ?? ""));
}
