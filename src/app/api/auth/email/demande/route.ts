import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DatabaseNotConfiguredError } from "@/lib/db";
import {
  CONTACT_BUREAU,
  fakeDemande,
  isPlausibleEmail,
  resolveIdentityByEmail,
  safeNextPath,
  startEmailLogin,
} from "@/lib/emailLogin";

/**
 * Étape 1 de la connexion : l'adhérent saisit l'email de son adhésion. La
 * réponse est la même que l'email soit connu ou non (avec un identifiant de
 * demande factice dans le second cas) : la page ne permet pas de tester si
 * quelqu'un est adhérent. L'adhérent qui ne reçoit rien peut retrouver
 * l'adresse de son dossier par nom, prénom et date de naissance.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; next?: unknown; hp_note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Saisissez une adresse email valide." }, { status: 400 });
  }
  // Champ piège invisible : un robot le remplit, on fait comme si de rien n'était.
  if (typeof body.hp_note === "string" && body.hp_note.trim()) {
    return NextResponse.json({ ok: true, demande: fakeDemande() });
  }

  try {
    const identity = await resolveIdentityByEmail(email);
    if (!identity) {
      return NextResponse.json({ ok: true, demande: fakeDemande() });
    }

    const outcome = await startEmailLogin(identity, {
      origin: request.nextUrl.origin,
      suivant: safeNextPath(body.next),
    });
    if (outcome.kind === "echec") {
      return NextResponse.json(
        { error: `L'email de connexion n'a pas pu être envoyé. Réessayez plus tard ou contactez le bureau via le ${CONTACT_BUREAU}.` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, demande: outcome.demande });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: `La connexion n'est pas encore ouverte. Contactez le bureau via le ${CONTACT_BUREAU}.` },
        { status: 503 }
      );
    }
    console.error("[connexion] Échec de la demande par email :", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
