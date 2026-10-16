"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass } from "@/components/formStyles";
import type { RoleMembreRow } from "@/lib/db";

const LIBELLES = { bureau: "Bureau", coach: "Coach" } as const;

const buttonClass =
  "rounded-md bg-toac-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-toac-blue-800 disabled:opacity-60";

async function envoyer(method: "POST" | "DELETE", body: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch("/api/admin/roles", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const data = await response.json().catch(() => null);
    return data?.error ?? "L'opération a échoué.";
  } catch {
    return "Erreur réseau. Réessayez plus tard.";
  }
}

/** Liste des rôles attribués, ajout et retrait (super-administrateur). */
export default function AdminRolesManager({ roles }: { roles: RoleMembreRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setSending(true);
    setError(null);
    const erreur = await envoyer("POST", data);
    setSending(false);
    if (erreur) {
      setError(erreur);
      return;
    }
    form.reset();
    router.refresh();
  }

  async function handleRemove(r: RoleMembreRow) {
    const qui = r.nom ?? r.email;
    if (!window.confirm(`Retirer le rôle ${LIBELLES[r.role]} à ${qui} ? L'accès est coupé immédiatement.`)) return;
    setError(null);
    const erreur = await envoyer("DELETE", { email: r.email, role: r.role });
    if (erreur) {
      setError(erreur);
      return;
    }
    router.refresh();
  }

  const th = "px-3 py-2 text-left font-semibold text-toac-blue-950";
  const td = "px-3 py-2 text-toac-blue-900";

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Attribuer un rôle</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
          <div>
            <label htmlFor="role-email" className={labelClass}>Email</label>
            <input id="role-email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="role-nom" className={labelClass}>Prénom et nom</label>
            <input id="role-nom" name="nom" placeholder="Si la personne n'est pas adhérente" className={inputClass} />
          </div>
          <div>
            <label htmlFor="role-role" className={labelClass}>Rôle</label>
            <select id="role-role" name="role" required className={inputClass} defaultValue="bureau">
              <option value="bureau">Bureau</option>
              <option value="coach">Coach</option>
            </select>
          </div>
          <button type="submit" disabled={sending} className={buttonClass}>
            {sending ? "Ajout…" : "Ajouter"}
          </button>
        </div>
        <p className="mt-2 text-xs text-toac-blue-900/60">
          Pour un adhérent, utilisez l&apos;email de son adhésion : son nom est repris automatiquement. La personne se
          connecte ensuite sur la page de connexion avec cet email.
        </p>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200 bg-toac-gray-50">
            <tr>
              <th className={th}>Rôle</th>
              <th className={th}>Nom</th>
              <th className={th}>Email</th>
              <th className={th}>Ajouté par</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-toac-blue-900/60">Aucun rôle attribué.</td>
              </tr>
            ) : (
              roles.map((r) => (
                <tr key={`${r.email}-${r.role}`} className="border-b border-toac-gray-100 last:border-0">
                  <td className={td}>
                    <span className="rounded bg-toac-blue-950 px-1.5 py-0.5 text-xs text-white">{LIBELLES[r.role]}</span>
                  </td>
                  <td className={`${td} font-medium`}>
                    {r.nom ?? "—"}
                    {!r.adherent && <span className="ml-2 text-xs font-normal text-toac-blue-900/50">non adhérent</span>}
                  </td>
                  <td className={`${td} text-toac-blue-900/70`}>{r.email}</td>
                  <td className={`${td} text-xs text-toac-blue-900/60`}>
                    {r.ajoute_par}, le{" "}
                    {new Date(r.ajoute_le).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                  </td>
                  <td className={`${td} text-right`}>
                    <button type="button" onClick={() => handleRemove(r)} className="text-sm text-red-700 underline">
                      Retirer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
