import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import {
  addRoleMembre,
  findAdherentSaisonByEmail,
  getLatestSaison,
  getRolesMembre,
  listRolesMembres,
  removeRoleMembre,
  setRoleFiche,
  DatabaseNotConfiguredError,
  type MembreRole,
} from "@/lib/db";
import { isPlausibleEmail, normalizeEmail } from "@/lib/emailLogin";
import { creerOuRelierFiche, supprimerFiche, FichesNonConfigureesError } from "@/lib/cmsFiches";

/**
 * Rôles bureau / coach et fiche publique associée (page « Le bureau & les
 * coachs »), réservés aux super-administrateurs (Bureau → Rôles et accès) :
 *  - POST : attribue le rôle et crée (ou relie, si elle existe déjà) la fiche ;
 *  - PATCH : crée ou relie la fiche d'un rôle existant qui n'en a pas ;
 *  - DELETE : retire le rôle et supprime sa fiche.
 */

const ROLES: MembreRole[] = ["bureau", "coach"];
const SPORTS = ["natation", "velo", "course", "muscu"];

interface Corps {
  email: string;
  role: MembreRole | null;
  nom: string;
  fonction: string;
  sports: string[];
  fiche: boolean;
}

async function lireCorps(request: NextRequest): Promise<Corps> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    email: typeof body?.email === "string" ? normalizeEmail(body.email) : "",
    role: ROLES.find((r) => r === body?.role) ?? null,
    nom: texte(body?.nom, 80),
    fonction: texte(body?.fonction, 160),
    sports: Array.isArray(body?.sports) ? SPORTS.filter((s) => (body!.sports as unknown[]).includes(s)) : [],
    fiche: body?.fiche !== false,
  };
}

async function refuserSiPasSuperAdmin() {
  const session = await getSession().catch(() => null);
  if (!isSuperAdmin(session)) {
    return { erreur: NextResponse.json({ error: "Accès réservé au super-administrateur." }, { status: 403 }) };
  }
  return { session: session! };
}

function erreurServeur(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
  }
  console.error("[roles] Échec :", error);
  return NextResponse.json({ error: "L'opération a échoué. Réessayez plus tard." }, { status: 500 });
}

/** Nom de la fiche : celui saisi s'il y en a un, sinon prénom et nom de l'adhésion. */
async function identitePourFiche(email: string, nomSaisi: string) {
  const saison = await getLatestSaison();
  const adherent = saison ? await findAdherentSaisonByEmail(saison, email) : null;
  if (nomSaisi) return { adherent, prenom: null, nom: nomSaisi };
  if (adherent) return { adherent, prenom: adherent.prenom, nom: adherent.nom };
  const { nom } = await getRolesMembre(email);
  return { adherent, prenom: null, nom: nom ?? "" };
}

/** Crée ou relie la fiche ; renvoie un message à afficher si elle n'a pas pu l'être. */
async function lierFiche(c: Corps, nomSaisi: string): Promise<{ message: string | null }> {
  const { prenom, nom } = await identitePourFiche(c.email, nomSaisi);
  if (!nom) return { message: "Fiche non créée : nom inconnu." };
  try {
    const { id, creee } = await creerOuRelierFiche({
      role: c.role!,
      prenom,
      nom,
      description: c.fonction,
      sports: c.role === "coach" ? c.sports : [],
    });
    await setRoleFiche(c.email, c.role!, id);
    return { message: creee ? null : "Fiche existante reliée (son contenu n'a pas été modifié)." };
  } catch (error) {
    if (error instanceof FichesNonConfigureesError) return { message: error.message };
    console.error("[roles] Fiche CMS :", error);
    return { message: "Accès créé, mais la fiche n'a pas pu être créée dans le CMS : réessayez avec « Créer la fiche »." };
  }
}

export async function POST(request: NextRequest) {
  const auth = await refuserSiPasSuperAdmin();
  if (auth.erreur) return auth.erreur;
  const c = await lireCorps(request);
  if (!isPlausibleEmail(c.email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!c.role) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });

  try {
    const { adherent } = await identitePourFiche(c.email, c.nom);
    const existant = await getRolesMembre(c.email);
    // Un adhérent est reconnu par son email ; pour une personne extérieure au
    // club, le nom saisi sert à l'afficher (vue bureau, emails, fiche).
    if (!adherent && !c.nom && !existant.nom) {
      return NextResponse.json(
        { error: "Cet email n'est pas celui d'un adhérent de la saison : indiquez le prénom et le nom de la personne." },
        { status: 400 }
      );
    }
    await addRoleMembre(c.email, c.role, adherent ? null : c.nom || null, auth.session.name || auth.session.username);
    const { message } = c.fiche ? await lierFiche(c, c.nom) : { message: null };
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return erreurServeur(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await refuserSiPasSuperAdmin();
  if (auth.erreur) return auth.erreur;
  const c = await lireCorps(request);
  if (!c.email || !c.role) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  try {
    const role = (await listRolesMembres()).find((r) => r.email === c.email && r.role === c.role);
    if (!role) return NextResponse.json({ error: "Rôle introuvable." }, { status: 404 });
    const { message } = await lierFiche(c, "");
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return erreurServeur(error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await refuserSiPasSuperAdmin();
  if (auth.erreur) return auth.erreur;
  const c = await lireCorps(request);
  if (!c.email || !c.role) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  try {
    const retire = await removeRoleMembre(c.email, c.role);
    let message: string | null = null;
    if (retire?.cmsFicheId && c.fiche) {
      try {
        await supprimerFiche(retire.cmsFicheId);
      } catch (error) {
        console.error("[roles] Suppression de fiche :", error);
        message = "Accès retiré, mais la fiche n'a pas pu être supprimée du CMS : supprimez-la depuis le dashboard.";
      }
    }
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return erreurServeur(error);
  }
}
