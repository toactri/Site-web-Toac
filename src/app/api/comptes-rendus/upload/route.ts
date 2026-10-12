import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";
import { resolveBlobToken } from "@/lib/blob";
import { BLOB_PREFIX, MAX_COMPTE_RENDU_BYTES } from "@/lib/comptesRendus";

/**
 * Délivre au navigateur un jeton d'envoi direct vers le store Blob (privé).
 * Les CR illustrés dépassent souvent les 4,5 Mo qu'accepte une fonction
 * Vercel : le PDF part donc directement du navigateur vers le store, puis
 * /api/comptes-rendus le transfère dans le Drive du club.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const blobToken = resolveBlobToken();
  if (!blobToken) {
    return NextResponse.json({ error: "Stockage non configuré." }, { status: 503 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: blobToken.token,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session) throw new Error("Connexion requise.");
        if (!pathname.startsWith(BLOB_PREFIX) || pathname.includes("..")) {
          throw new Error("Chemin non autorisé.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_COMPTE_RENDU_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
