import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { replaceAdherentsSaison, DatabaseNotConfiguredError } from "@/lib/db";
import { parseDossiersAdhesionCsv, normalizeSaison, ImportFormatError } from "@/lib/adherentsImport";

/**
 * Import de l'onglet « Dossiers adhésion » (CSV) dans la base : remplace tous
 * les adhérents de la saison indiquée. Réservé aux comptes `admin`.
 */
export const maxDuration = 60;

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
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

  let result;
  try {
    result = parseDossiersAdhesionCsv(await file.text());
  } catch (error) {
    if (error instanceof ImportFormatError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  if (result.adherents.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne exploitable dans ce fichier : rien n'a été importé.", rejets: result.rejets },
      { status: 400 }
    );
  }

  try {
    await replaceAdherentsSaison(saison, result.adherents);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    console.error("Échec de l'import des adhérents :", error);
    return NextResponse.json({ error: "L'import a échoué. Réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    saison,
    importes: result.adherents.length,
    rejets: result.rejets,
    avertissements: result.avertissements,
  });
}
