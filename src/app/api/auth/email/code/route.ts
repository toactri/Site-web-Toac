import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginWithCode } from "@/lib/emailLogin";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/** Connexion par le code à 6 chiffres reçu par email. */
export async function POST(request: NextRequest) {
  let body: { demande?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const demande = typeof body.demande === "string" ? body.demande : "";
  const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";

  try {
    const session = await loginWithCode(demande, code);
    if (!session) {
      return NextResponse.json(
        { error: "Code incorrect ou expiré. Vérifiez le dernier email reçu, ou demandez un nouveau code." },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ name: session.name, role: session.role, next: session.suivant });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.role));
    return response;
  } catch (error) {
    console.error("[connexion] Échec de la vérification du code :", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
