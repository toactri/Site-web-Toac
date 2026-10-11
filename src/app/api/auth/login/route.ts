import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticate, buildSessionTokenForAccount } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { error: "Identifiant et mot de passe requis." },
      { status: 400 }
    );
  }

  const account = await authenticate(username, password);
  if (!account) {
    return NextResponse.json(
      { error: "Identifiant ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const token = buildSessionTokenForAccount(account);
  const response = NextResponse.json({
    name: account.name,
    role: account.role,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(account.role));
  return response;
}
