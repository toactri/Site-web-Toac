import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";

/** Statut de connexion minimal, sans donnée sensible, pour piloter l'UI (Navbar). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({
    loggedIn: true,
    name: session.name,
    role: session.role,
    // Affiche l'entrée « Admin » du menu Bureau ; les pages concernées le
    // vérifient elles-mêmes côté serveur.
    superAdmin: isSuperAdmin(session),
  });
}
