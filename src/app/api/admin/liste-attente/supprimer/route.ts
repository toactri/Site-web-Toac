import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { deleteListeAttente, DatabaseNotConfiguredError } from "@/lib/db";

/** Retrait définitif d'une personne de la liste d'attente. Réservé aux comptes `admin` (vue bureau). */
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
    if (!(await deleteListeAttente(id))) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error(error.message);
      return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
    }
    console.error(`Échec du retrait de la liste d'attente ${id} :`, error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
