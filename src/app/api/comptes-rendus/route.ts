import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBlobStream, deleteBlobs, BlobNotConfiguredError } from "@/lib/blob";
import {
  BLOB_PREFIX,
  MAX_COMPTE_RENDU_BYTES,
  RUBRIQUES,
  anneesProposees,
  nomFichierCompteRendu,
} from "@/lib/comptesRendus";

// Relecture du PDF dans le store puis envoi au script Google : quelques
// secondes pour un fichier de 20 Mo, mais un script Apps Script à froid peut
// en prendre une dizaine de plus.
export const maxDuration = 60;

/**
 * Range un compte rendu, déjà déposé dans le store Blob par le navigateur, dans
 * le sous-dossier Drive de sa rubrique.
 *
 * L'écriture dans le Drive passe par un script Google Apps Script publié en
 * application web par un compte du club (voir docs/comptes-rendus-apps-script.gs) :
 * pas de projet Google Cloud ni de compte de service à gérer. Le script n'accepte
 * que les requêtes portant le secret partagé `CR_DRIVE_UPLOAD_SECRET`.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const scriptUrl = process.env.CR_DRIVE_UPLOAD_URL?.trim();
  const secret = process.env.CR_DRIVE_UPLOAD_SECRET?.trim();
  if (!scriptUrl || !secret) {
    return NextResponse.json(
      { error: "L'envoi en ligne n'est pas encore configuré. Envoyez votre CR à contact@toac-triathlon.com." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    pathname?: unknown;
    rubrique?: unknown;
    annee?: unknown;
    course?: unknown;
    prenom?: unknown;
  } | null;
  const pathname = typeof body?.pathname === "string" ? body.pathname : "";
  const rubrique = RUBRIQUES.find((r) => r.id === body?.rubrique);
  const annee = Number(body?.annee);
  const course = typeof body?.course === "string" ? body.course.trim().slice(0, 80) : "";
  const prenom = typeof body?.prenom === "string" ? body.prenom.trim().slice(0, 60) : "";

  if (!pathname.startsWith(BLOB_PREFIX) || pathname.includes("..")) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 400 });
  }
  if (!rubrique || !anneesProposees().includes(annee) || !course || !prenom) {
    await deleteBlobs([pathname]).catch(() => undefined);
    return NextResponse.json({ error: "Merci de renseigner tous les champs." }, { status: 400 });
  }

  try {
    const blob = await getBlobStream(pathname);
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: "Fichier introuvable, recommencez l'envoi." }, { status: 400 });
    }
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
    if (bytes.length > MAX_COMPTE_RENDU_BYTES || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "Le fichier doit être un PDF de moins de 20 Mo." }, { status: 400 });
    }

    const nom = nomFichierCompteRendu(annee, rubrique.prefixe, course, prenom);
    // Apps Script ne lit que le corps brut d'un POST : JSON en text/plain.
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret,
        folderId: rubrique.id,
        name: nom,
        description: `Déposé depuis le site par ${session.name} (${session.username})`,
        data: bytes.toString("base64"),
      }),
      redirect: "follow",
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    if (!response.ok || !result?.ok) {
      console.error("Échec du dépôt du CR dans le Drive :", response.status, result?.error);
      return NextResponse.json({ error: "Échec du dépôt dans le Drive. Réessayez plus tard." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, url: result.url, nom });
  } catch (error) {
    if (error instanceof BlobNotConfiguredError) {
      return NextResponse.json({ error: "Stockage non configuré." }, { status: 503 });
    }
    console.error("Échec de l'envoi du compte rendu :", error);
    return NextResponse.json({ error: "Échec de l'envoi. Réessayez plus tard." }, { status: 502 });
  } finally {
    // Le store ne sert que de transit : le PDF vit dans le Drive.
    await deleteBlobs([pathname]).catch(() => undefined);
  }
}
