import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { insertPartnerSignup, DatabaseNotConfiguredError } from "@/lib/db";
import { buildErrorHtml } from "@/lib/errorHtml";
import { notifyStaffAndRecord } from "@/lib/partnerSignupNotify";
import { checkFormSubmission } from "@/lib/formGuard";

/**
 * Demande d'activation des avantages d'un partenaire (ex. Alltricks) : un
 * adhérent indique son identité + l'email de son compte partenaire, à
 * rattacher manuellement par le bureau — voir Bureau → Partenaires.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();

  const partenaire = String(form.get("partenaire") ?? "").trim();
  const nom = String(form.get("nom") ?? "").trim();
  const prenom = String(form.get("prenom") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const consentement = form.get("consentement") === "on";
  const backHref = partenaire ? `/partenaires/${partenaire}` : "/partenaires";

  function htmlError(message: string) {
    return new NextResponse(buildErrorHtml(message, backHref), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (!partenaire || !nom || !prenom || !email) {
    return htmlError("Merci de renseigner votre nom, prénom et email.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return htmlError("Merci de renseigner une adresse email valide.");
  }
  if (!consentement) {
    return htmlError("Merci de donner votre consentement pour continuer.");
  }

  // Robot probable : même redirection qu'un envoi réussi pour ne pas lui
  // signaler le blocage, mais rien n'est enregistré ni envoyé.
  const guard = checkFormSubmission(form, { nom, prenom });
  if (guard.kind === "spam") {
    console.info("[partenaires] Demande bloquée (anti-spam) :", guard.reason, { partenaire, email });
    return NextResponse.redirect(new URL(`${backHref}?merci=1`, request.url), 303);
  }
  if (guard.kind === "reload") {
    console.info("[partenaires] Demande refusée :", guard.reason, { partenaire, email });
    return htmlError("Le formulaire a expiré. Recharge la page puis renvoie ta demande.");
  }

  let signup;
  try {
    signup = await insertPartnerSignup({
      partenaire,
      nom,
      prenom,
      email,
      consentement,
      token: crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error(error.message);
      return htmlError(
        "Le formulaire n'est pas encore relié à une base de données côté serveur. Contactez le bureau directement en attendant."
      );
    }
    console.error("Échec de l'enregistrement de la demande partenaire :", error);
    return htmlError("Une erreur est survenue. Réessayez plus tard.");
  }

  // Un échec d'envoi ne doit pas empêcher l'adhérent de voir sa demande
  // confirmée : la notification est tentée et consignée, jamais bloquante.
  await notifyStaffAndRecord(signup, request.nextUrl.origin);

  return NextResponse.redirect(new URL(`${backHref}?merci=1`, request.url), 303);
}
