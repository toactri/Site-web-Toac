import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginWithLien } from "@/lib/emailLogin";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Connexion par le lien reçu par email. Appelée en POST depuis la page
 * /connexion/lien, au clic sur « Me connecter » : certains antivirus de
 * messagerie ouvrent les liens des emails pour les analyser, ce qui
 * consommerait un lien à usage unique s'il connectait dès l'ouverture.
 */
export async function POST(request: NextRequest) {
  let body: { t?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const session = await loginWithLien(typeof body.t === "string" ? body.t : "");
    if (!session) {
      return NextResponse.json(
        { error: "Ce lien a expiré ou a déjà servi. Demandez un nouveau lien de connexion." },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ name: session.name, role: session.role, next: session.suivant });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.role));
    return response;
  } catch (error) {
    console.error("[connexion] Échec de la connexion par lien :", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
