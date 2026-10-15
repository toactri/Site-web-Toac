import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import { replaceCoupsDeMain, DatabaseNotConfiguredError } from "@/lib/db";
import { normalizeSaison, ImportFormatError } from "@/lib/adherentsImport";
import { parseReponsesCsv } from "@/lib/coupsDeMain";

/**
 * Import de l'onglet « Réponses » du formulaire d'adhésion (CSV) : remplace
 * les coups de main de la saison. Réservé aux super-administrateurs, comme
 * l'import de la liste des adhérents.
 */
export const maxDuration = 60;

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé au super-administrateur." }, { status: 403 });
  }

  const form = await request.formData();
  const saison = normalizeSaison(String(form.get("saison") ?? ""));
  const file = form.get("fichier");
  if (!saison) {
    return NextResponse.json({ error: "Saison invalide (format attendu : 2026/2027)." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choisissez le fichier CSV exporté du Google Sheets." }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux pour un export CSV (2 Mo max)." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseReponsesCsv(await file.text());
  } catch (error) {
    if (error instanceof ImportFormatError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  if (parsed.reponses.length === 0) {
    return NextResponse.json({ error: "Aucune réponse exploitable dans ce fichier : rien n'a été importé." }, { status: 400 });
  }

  try {
    const { importees, nonRetrouvees } = await replaceCoupsDeMain(saison, parsed.reponses);
    if (importees === 0) {
      return NextResponse.json(
        { error: `Aucune réponse ne correspond à un adhérent ${saison} : importez d'abord la liste des adhérents de cette saison.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, saison, importees, nonRetrouvees, rejets: parsed.rejets });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    console.error("Échec de l'import des coups de main :", error);
    return NextResponse.json({ error: "L'import a échoué. Réessayez plus tard." }, { status: 500 });
  }
}
