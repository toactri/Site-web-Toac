import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { deleteMusculationImport, DatabaseNotConfiguredError } from "@/lib/db";

/** Retire un adhérent de la liste des validations musculation importées. Réservé aux comptes `admin`. */
export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    const row = await deleteMusculationImport(id);
    if (!row) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
