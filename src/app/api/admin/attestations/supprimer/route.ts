import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { deleteAttestation, DatabaseNotConfiguredError } from "@/lib/db";
import { deleteBlobs } from "@/lib/blob";

/** Suppression définitive d'une attestation et de son PDF. Réservé aux comptes `admin`. */
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
    const deleted = await deleteAttestation(id);
    if (!deleted) return NextResponse.json({ error: "Attestation introuvable." }, { status: 404 });
    await deleteBlobs([deleted.document_path]).catch((error) =>
      console.error("Échec de la suppression du PDF d'attestation :", error)
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(`Échec de la suppression de l'attestation ${id} :`, error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
