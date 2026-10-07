import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { setParametre, DatabaseNotConfiguredError } from "@/lib/db";
import { putBlob, deleteBlobs, BlobNotConfiguredError } from "@/lib/blob";
import { getAttestationSettings, PARAM_SIGNATURE_PATH, PARAM_TRESORIER_NOM } from "@/lib/attestation";

/**
 * Réglages de l'attestation : nom du trésorier signataire et image de sa
 * signature. L'image est rangée dans le store Blob privé, jamais dans le dépôt
 * git (public). Réservé aux comptes `admin`.
 */
const SIGNATURE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const form = await request.formData();
  const tresorierNom = String(form.get("tresorierNom") ?? "").trim();
  const signature = form.get("signature");
  const hasSignature = signature instanceof File && signature.size > 0;

  if (!tresorierNom) {
    return NextResponse.json({ error: "Renseignez le prénom et le nom du trésorier." }, { status: 400 });
  }
  if (hasSignature && !SIGNATURE_TYPES.has(signature.type)) {
    return NextResponse.json({ error: "La signature doit être une image PNG ou JPG." }, { status: 400 });
  }
  if (hasSignature && signature.size > MAX_SIGNATURE_BYTES) {
    return NextResponse.json({ error: "Image de signature trop lourde (2 Mo max)." }, { status: 400 });
  }

  try {
    await setParametre(PARAM_TRESORIER_NOM, tresorierNom);
    if (hasSignature) {
      const previous = (await getAttestationSettings()).signaturePath;
      const extension = signature.type === "image/png" ? "png" : "jpg";
      const blob = await putBlob(
        `attestations/signature-${Date.now()}.${extension}`,
        Buffer.from(await signature.arrayBuffer()),
        { contentType: signature.type === "image/jpg" ? "image/jpeg" : signature.type }
      );
      await setParametre(PARAM_SIGNATURE_PATH, blob.pathname);
      if (previous) await deleteBlobs([previous]).catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError || error instanceof BlobNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Échec de l'enregistrement des réglages d'attestation :", error);
    return NextResponse.json({ error: "L'enregistrement a échoué. Réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
