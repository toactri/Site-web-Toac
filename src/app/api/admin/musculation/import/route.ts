import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { upsertMusculationImports, DatabaseNotConfiguredError } from "@/lib/db";
import { ImportFormatError } from "@/lib/adherentsImport";
import { parseMusculationImportCsv } from "@/lib/musculationImport";

/**
 * Import (CSV) des adhérents déjà validés pour la musculation sur une saison
 * précédente. Complète la liste existante sans retirer personne. Réservé aux
 * comptes `admin`.
 */
const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("fichier");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choisissez le fichier CSV à importer." }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux pour un export CSV (2 Mo max)." }, { status: 400 });
  }

  let result;
  try {
    result = parseMusculationImportCsv(await file.text());
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

  let counts;
  try {
    counts = await upsertMusculationImports(result.adherents);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    console.error("Échec de l'import des validations musculation :", error);
    return NextResponse.json({ error: "L'import a échoué. Réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...counts, rejets: result.rejets });
}
