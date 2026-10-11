"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export interface LoginSuccess {
  name: string;
  role: "member" | "admin";
  /** Page demandée au moment de la demande de lien, le cas échéant. */
  next?: string | null;
}

interface LoginFormProps {
  onSuccess: (info: LoginSuccess) => void;
  /** Page où revenir après connexion : transmise dans le lien envoyé par email. */
  next?: string;
  compact?: boolean;
}

/**
 * Connexion à l'espace adhérents par email, sans mot de passe :
 * 1. l'adhérent saisit l'email de son adhésion et reçoit un lien + un code ;
 * 2. il clique le lien (page /connexion/lien) ou saisit le code ici.
 * S'il ne sait plus quelle adresse il a donnée, il se fait reconnaître par nom,
 * prénom et date de naissance : l'email part alors vers l'adresse du dossier.
 * Le compte bureau défini par variables d'environnement garde un accès par
 * identifiant et mot de passe.
 */
type Step =
  | { kind: "email" }
  | { kind: "code"; demande: string; message: ReactNode; viaEmail: boolean }
  | { kind: "retrouver" }
  | { kind: "bureau" };

const inputClass =
  "w-full rounded-md border border-toac-gray-200 px-3 py-2 text-toac-blue-950 outline-none focus:border-toac-blue-600 focus:ring-2 focus:ring-toac-blue-600/30";
const labelClass = "mb-1 block text-sm font-medium text-toac-blue-900";
const buttonClass =
  "w-full rounded-md bg-toac-pink-500 px-4 py-2.5 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60";
const linkClass = "text-sm font-medium text-toac-blue-700 underline hover:text-toac-blue-950";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export default function LoginForm({ onSuccess, next, compact }: LoginFormProps) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goTo(nextStep: Step) {
    setError(null);
    setStep(nextStep);
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await action();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  function handleEmail(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await postJson("/api/auth/email/demande", { email, next, hp_note: honeypot });
      if (!ok) {
        setError(String(data.error ?? "Envoi impossible."));
        return;
      }
      setCode("");
      goTo({
        kind: "code",
        demande: String(data.demande),
        viaEmail: true,
        message: (
          <>
            Si <strong>{email.trim()}</strong> est bien l&apos;adresse de votre adhésion au club, vous allez recevoir un
            email avec un lien et un code de connexion. Pensez à regarder dans vos courriers indésirables.
          </>
        ),
      });
    });
  }

  function handleRetrouver(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await postJson("/api/auth/email/retrouver", {
        nom,
        prenom,
        dateNaissance,
        next,
        hp_note: honeypot,
      });
      if (!ok) {
        setError(String(data.error ?? "Recherche impossible."));
        return;
      }
      setCode("");
      goTo({
        kind: "code",
        demande: String(data.demande),
        viaEmail: false,
        message: data.dejaEnvoye ? (
          <>
            Votre adhésion est bien retrouvée. Un email de connexion vient déjà d&apos;être envoyé à l&apos;adresse de
            votre adhésion, <strong>{String(data.email)}</strong> : il reste valable quelques minutes.
          </>
        ) : (
          <>
            Votre adhésion est bien retrouvée : nous venons d&apos;envoyer un email de connexion à l&apos;adresse de
            votre adhésion, <strong>{String(data.email)}</strong>. Pensez à regarder dans vos courriers indésirables.
          </>
        ),
      });
    });
  }

  function handleCode(event: FormEvent) {
    event.preventDefault();
    if (step.kind !== "code") return;
    run(async () => {
      const { ok, data } = await postJson("/api/auth/email/code", { demande: step.demande, code });
      if (!ok) {
        setError(String(data.error ?? "Code incorrect."));
        return;
      }
      onSuccess({
        name: String(data.name),
        role: data.role === "admin" ? "admin" : "member",
        next: typeof data.next === "string" ? data.next : null,
      });
    });
  }

  function handleBureau(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await postJson("/api/auth/login", { username, password });
      if (!ok) {
        setError(String(data.error ?? "Connexion impossible."));
        return;
      }
      onSuccess({ name: String(data.name), role: data.role === "admin" ? "admin" : "member" });
    });
  }

  const spacing = compact ? "space-y-4" : "space-y-5";
  const errorBlock = error && (
    <p role="alert" className="text-sm font-medium text-red-600">
      {error}
    </p>
  );
  // Champ piège invisible (anti-robots) : un humain ne le voit ni ne le remplit.
  const honeypotField = (
    <input
      type="text"
      name="hp_note"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
      className="hidden"
    />
  );

  if (step.kind === "code") {
    return (
      <form onSubmit={handleCode} className={spacing}>
        <p className="text-sm text-toac-blue-900/80">{step.message}</p>
        <div>
          <label htmlFor="login-code" className={labelClass}>
            Code reçu par email
          </label>
          <input
            id="login-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} text-center font-display text-2xl tracking-[0.4em]`}
          />
          <p className="mt-1 text-xs text-toac-blue-900/60">Vous pouvez aussi cliquer sur le lien de l&apos;email.</p>
        </div>
        {errorBlock}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Vérification…" : "Me connecter"}
        </button>
        <div className="space-y-2 text-center">
          {step.viaEmail && (
            <p className="text-sm text-toac-blue-900/80">
              Rien reçu ?{" "}
              <button type="button" onClick={() => goTo({ kind: "retrouver" })} className={linkClass}>
                Retrouver l&apos;adresse email de mon adhésion
              </button>
            </p>
          )}
          <p>
            <button type="button" onClick={() => goTo({ kind: "email" })} className={linkClass}>
              ← Saisir une autre adresse
            </button>
          </p>
        </div>
      </form>
    );
  }

  if (step.kind === "retrouver") {
    return (
      <form onSubmit={handleRetrouver} className={spacing}>
        <p className="text-sm text-toac-blue-900/80">
          Indiquez votre nom, votre prénom et votre date de naissance, tels que donnés lors de votre adhésion. Si nous
          retrouvons votre adhésion, nous enverrons le lien de connexion à l&apos;adresse email qui y figure.
        </p>
        <div>
          <label htmlFor="login-nom" className={labelClass}>
            Nom
          </label>
          <input
            id="login-nom"
            autoComplete="family-name"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="login-prenom" className={labelClass}>
            Prénom
          </label>
          <input
            id="login-prenom"
            autoComplete="given-name"
            required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="login-naissance" className={labelClass}>
            Date de naissance
          </label>
          <input
            id="login-naissance"
            type="date"
            autoComplete="bday"
            required
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className={inputClass}
          />
        </div>
        {honeypotField}
        {errorBlock}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Recherche…" : "Retrouver mon adhésion"}
        </button>
        <p className="text-center">
          <button type="button" onClick={() => goTo({ kind: "email" })} className={linkClass}>
            ← Revenir à la saisie de l&apos;email
          </button>
        </p>
      </form>
    );
  }

  if (step.kind === "bureau") {
    return (
      <form onSubmit={handleBureau} className={spacing}>
        <div>
          <label htmlFor="username" className={labelClass}>
            Identifiant bureau
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {errorBlock}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        <p className="text-center">
          <button type="button" onClick={() => goTo({ kind: "email" })} className={linkClass}>
            ← Connexion adhérent par email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmail} className={spacing}>
      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email utilisé pour votre adhésion au club
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-toac-blue-900/60">
          Pas de mot de passe : vous recevrez un lien et un code de connexion à cette adresse.
        </p>
      </div>
      {honeypotField}
      {errorBlock}
      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
      <div className="space-y-2 text-center">
        <p>
          <button type="button" onClick={() => goTo({ kind: "retrouver" })} className={linkClass}>
            Vous ne savez plus quelle adresse vous avez utilisée ?
          </button>
        </p>
        <p>
          <button
            type="button"
            onClick={() => goTo({ kind: "bureau" })}
            className="text-xs text-toac-blue-900/50 underline hover:text-toac-blue-900"
          >
            Accès bureau par identifiant
          </button>
        </p>
      </div>
    </form>
  );
}
