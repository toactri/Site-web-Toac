import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { setMusculationValidation, deleteMusculationValidation, DatabaseNotConfiguredError } from "@/lib/db";

/**
 * Coche / décoche « validé musculation » pour un adhérent de la saison
 * (`{ adherentId, valide, anneeDecharge? }`), ou retire une validation par son
 * identifiant (`{ validationId }`). Réservé aux comptes `admin`.
 */
export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  try {
    if (body?.validationId !== undefined) {
      const id = Number(body.validationId);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
      }
      const row = await deleteMusculationValidation(id);
      if (!row) return NextResponse.json({ error: "Validation introuvable." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const adherentId = Number(body?.adherentId);
    if (!Number.isInteger(adherentId) || adherentId <= 0 || typeof body?.valide !== "boolean") {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    let annee: number | null = null;
    if (body.anneeDecharge !== undefined && body.anneeDecharge !== null && body.anneeDecharge !== "") {
      annee = Number(body.anneeDecharge);
      const now = new Date().getFullYear();
      if (!Number.isInteger(annee) || annee < now - 10 || annee > now) {
        return NextResponse.json({ error: "Année de décharge invalide." }, { status: 400 });
      }
    }
    const found = await setMusculationValidation(adherentId, body.valide, session.name || session.username, annee);
    if (!found) return NextResponse.json({ error: "Adhérent introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    throw error;
  }
}
