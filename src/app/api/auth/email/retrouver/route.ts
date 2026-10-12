import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DatabaseNotConfiguredError, findAdherentSaison, getLatestSaison } from "@/lib/db";
import { parseDateNaissance } from "@/lib/adherentsImport";
import { maskEmail } from "@/lib/attestation";
import {
  CONTACT_BUREAU,
  identityFromAdherentRow,
  safeNextPath,
  startEmailLogin,
} from "@/lib/emailLogin";

/**
 * Adhérent qui ne sait plus quelle adresse il a donnée à l'adhésion (ou dont
 * l'email saisi n'a rien donné) : il se fait reconnaître par nom, prénom et
 * date de naissance. Le lien et le code partent vers l'email du dossier, que
 * le demandeur ne choisit pas ; la page n'en affiche qu'une version masquée.
 */
export async function POST(request: NextRequest) {
  let body: { nom?: unknown; prenom?: unknown; dateNaissance?: unknown; next?: unknown; hp_note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
  const dateNaissance = parseDateNaissance(typeof body.dateNaissance === "string" ? body.dateNaissance : "");
  if (!nom || !prenom || !dateNaissance) {
    return NextResponse.json(
      { error: "Merci de renseigner votre nom, votre prénom et votre date de naissance." },
      { status: 400 }
    );
  }
  if (typeof body.hp_note === "string" && body.hp_note.trim()) {
    return NextResponse.json({ error: "Demande refusée." }, { status: 400 });
  }

  try {
    const saison = await getLatestSaison();
    const adherent = saison ? await findAdherentSaison(saison, { nom, prenom, dateNaissance }) : null;
    if (!adherent) {
      return NextResponse.json(
        {
          error:
            `Aucune adhésion${saison ? ` ${saison}` : ""} ne correspond à ces nom, prénom et date de naissance. ` +
            `Vérifiez l'orthographe (la même que lors de votre inscription) ou contactez le bureau via le ${CONTACT_BUREAU}.`,
        },
        { status: 404 }
      );
    }
    const identity = identityFromAdherentRow(adherent);
    if (!identity) {
      return NextResponse.json(
        { error: `Aucune adresse email n'est associée à votre adhésion. Contactez le bureau via le ${CONTACT_BUREAU}.` },
        { status: 409 }
      );
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
    return NextResponse.json({
      ok: true,
      demande: outcome.demande,
      email: maskEmail(identity.email),
      dejaEnvoye: outcome.kind === "limite",
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: `La connexion n'est pas encore ouverte. Contactez le bureau via le ${CONTACT_BUREAU}.` },
        { status: 503 }
      );
    }
    console.error("[connexion] Échec de la recherche par identité :", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
