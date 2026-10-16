"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import LoginForm from "./LoginForm";

interface AuthState {
  loggedIn: boolean;
  name?: string;
  role?: "member" | "admin";
  superAdmin?: boolean;
}

interface AuthContextValue {
  auth: AuthState;
  requireAuth: (next: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false });
  const [modalNext, setModalNext] = useState<string | null>(null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    setAuth(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setAuth(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requireAuth = useCallback(
    (next: string) => {
      if (auth.loggedIn) return true;
      setModalNext(next);
      return false;
    },
    [auth.loggedIn]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ loggedIn: false });
    router.push("/");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ auth, requireAuth, logout }}>
      {children}
      {modalNext !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-toac-blue-950/70 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalNext(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-fade-in-up">
            <div className="mb-4 flex items-start justify-between">
              <h2 id="login-modal-title" className="font-display text-xl uppercase text-toac-blue-950">
                Espace Adhérents
              </h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setModalNext(null)}
                className="text-2xl leading-none text-toac-blue-900/60 hover:text-toac-blue-950"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-sm text-toac-blue-900/80">
              Cette section est réservée aux adhérents. Connectez-vous avec l&apos;adresse email utilisée pour votre adhésion au club.
            </p>
            <LoginForm
              next={modalNext || undefined}
              onSuccess={async (info) => {
                await refresh();
                const next = info.next ?? modalNext;
                setModalNext(null);
                // refresh : la page serveur se réaffiche avec la session (ex. fiche
                // partenaire qui dévoile l'avantage), même si next est la page courante.
                if (next) router.push(next);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
