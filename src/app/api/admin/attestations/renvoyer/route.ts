import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getAttestationById, DatabaseNotConfiguredError } from "@/lib/db";
import { BlobNotConfiguredError } from "@/lib/blob";
import { readBlobBytes, sendAttestationAndRecord } from "@/lib/attestation";

/**
 * Renvoie à l'adhérent le document déjà généré (même PDF, sans le régénérer),
 * après un échec d'envoi par exemple. Réservé aux comptes `admin`.
 */
export const maxDuration = 30;

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
    const attestation = await getAttestationById(id);
    if (!attestation) return NextResponse.json({ error: "Attestation introuvable." }, { status: 404 });

    const file = await readBlobBytes(attestation.document_path);
    if (!file) return NextResponse.json({ error: "Document introuvable dans le store." }, { status: 404 });

    const outcome = await sendAttestationAndRecord(attestation, file.bytes);
    if (outcome.statut !== "envoyee") {
      return NextResponse.json({ error: outcome.erreur ?? "L'envoi a échoué." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, email: attestation.email });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError || error instanceof BlobNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(`Échec du renvoi de l'attestation ${id} :`, error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
