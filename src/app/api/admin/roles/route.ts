import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import {
  addRoleMembre,
  findAdherentSaisonByEmail,
  getLatestSaison,
  getRolesMembre,
  removeRoleMembre,
  DatabaseNotConfiguredError,
  type MembreRole,
} from "@/lib/db";
import { isPlausibleEmail, normalizeEmail } from "@/lib/emailLogin";

/**
 * Attribution (POST) et retrait (DELETE) des rôles bureau / coach, réservés
 * aux super-administrateurs (Bureau → Rôles et accès).
 */

const ROLES: MembreRole[] = ["bureau", "coach"];

async function lireCorps(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; role?: unknown; nom?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const role = ROLES.find((r) => r === body?.role) ?? null;
  const nom = typeof body?.nom === "string" ? body.nom.trim().slice(0, 80) : "";
  return { email, role, nom };
}

function erreurServeur(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Base de données non configurée côté serveur." }, { status: 503 });
  }
  console.error("[roles] Échec :", error);
  return NextResponse.json({ error: "L'opération a échoué. Réessayez plus tard." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé au super-administrateur." }, { status: 403 });
  }
  const { email, role, nom } = await lireCorps(request);
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });

  try {
    const saison = await getLatestSaison();
    const adherent = saison ? await findAdherentSaisonByEmail(saison, email) : null;
    const existant = await getRolesMembre(email);
    // Un adhérent est reconnu par son email ; pour une personne extérieure au
    // club, le nom saisi sert à l'afficher (vue bureau, emails de connexion).
    if (!adherent && !nom && !existant.nom) {
      return NextResponse.json(
        { error: "Cet email n'est pas celui d'un adhérent de la saison : indiquez le prénom et le nom de la personne." },
        { status: 400 }
      );
    }
    await addRoleMembre(email, role, adherent ? null : nom || null, session!.name || session!.username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erreurServeur(error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession().catch(() => null);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé au super-administrateur." }, { status: 403 });
  }
  const { email, role } = await lireCorps(request);
  if (!email || !role) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  try {
    await removeRoleMembre(email, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erreurServeur(error);
  }
}
