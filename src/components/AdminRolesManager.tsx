"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass } from "@/components/formStyles";
import type { MembreRole, RoleMembreRow } from "@/lib/db";

const LIBELLES = { bureau: "Bureau", coach: "Coach" } as const;
const SPORTS = [
  { cle: "natation", libelle: "Natation" },
  { cle: "velo", libelle: "Vélo" },
  { cle: "course", libelle: "Course à pied" },
  { cle: "muscu", libelle: "Musculation" },
];

const buttonClass =
  "rounded-md bg-toac-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-toac-blue-800 disabled:opacity-60";

async function envoyer(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>
): Promise<{ erreur: string | null; message: string | null }> {
  try {
    const response = await fetch("/api/admin/roles", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return { erreur: data?.error ?? "L'opération a échoué.", message: null };
    return { erreur: null, message: data?.message ?? null };
  } catch {
    return { erreur: "Erreur réseau. Réessayez plus tard.", message: null };
  }
}

/**
 * Rôles attribués avec leur fiche publique (page « Le bureau & les coachs ») :
 * ajout (accès + fiche en une fois), création ou rattachement de fiche, retrait
 * (accès + fiche). Super-administrateur uniquement.
 */
export default function AdminRolesManager({ roles }: { roles: RoleMembreRow[] }) {
  const router = useRouter();
  const [role, setRole] = useState<MembreRole>("bureau");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function apres({ erreur, message }: { erreur: string | null; message: string | null }) {
    if (erreur) {
      setError(erreur);
      return false;
    }
    setInfo(message);
    router.refresh();
    return true;
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setError(null);
    setInfo(null);
    const ok = apres(
      await envoyer("POST", {
        email: data.get("email"),
        role: data.get("role"),
        nom: data.get("nom"),
        fonction: data.get("fonction"),
        sports: data.getAll("sports"),
        fiche: data.get("fiche") === "on",
      })
    );
    setSending(false);
    if (ok) {
      form.reset();
      setRole("bureau");
    }
  }

  async function handleFiche(r: RoleMembreRow) {
    setError(null);
    setInfo(null);
    apres(await envoyer("PATCH", { email: r.email, role: r.role }));
  }

  async function handleRemove(r: RoleMembreRow) {
    const qui = r.nom ?? r.email;
    const detail = r.cms_fiche_id ? " et sa fiche sur la page « Le bureau & les coachs » sera supprimée" : "";
    if (!window.confirm(`Retirer le rôle ${LIBELLES[r.role]} à ${qui} ? L'accès est coupé immédiatement${detail}.`)) return;
    setError(null);
    setInfo(null);
    apres(await envoyer("DELETE", { email: r.email, role: r.role }));
  }

  const th = "px-3 py-2 text-left font-semibold text-toac-blue-950";
  const td = "px-3 py-2 text-toac-blue-900";

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="space-y-4 rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg uppercase text-toac-blue-950">Attribuer un rôle</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem]">
          <div>
            <label htmlFor="role-email" className={labelClass}>Email</label>
            <input id="role-email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="role-nom" className={labelClass}>Prénom et nom</label>
            <input
              id="role-nom"
              name="nom"
              placeholder="Obligatoire si la personne n'est pas adhérente"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="role-role" className={labelClass}>Rôle</label>
            <select
              id="role-role"
              name="role"
              required
              className={inputClass}
              value={role}
              onChange={(e) => setRole(e.target.value as MembreRole)}
            >
              <option value="bureau">Bureau</option>
              <option value="coach">Coach</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="role-fonction" className={labelClass}>
            {role === "bureau" ? "Fonction (affichée sur la fiche)" : "Précision (facultatif, affichée sur la fiche)"}
          </label>
          <input
            id="role-fonction"
            name="fonction"
            placeholder={role === "bureau" ? "Ex. : Trésorier / Partenaires" : "Ex. : BF2"}
            className={inputClass}
          />
        </div>
        {role === "coach" && (
          <fieldset>
            <legend className={labelClass}>Sports encadrés</legend>
            <div className="flex flex-wrap gap-4 text-sm text-toac-blue-900">
              {SPORTS.map((s) => (
                <label key={s.cle} className="inline-flex items-center gap-2">
                  <input type="checkbox" name="sports" value={s.cle} /> {s.libelle}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="flex items-start gap-2 text-sm text-toac-blue-900">
          <input type="checkbox" name="fiche" defaultChecked className="mt-1" />
          <span>
            Créer sa fiche sur la page « Le bureau &amp; les coachs » (ou relier celle qui existe déjà à son nom). La
            photo s&apos;ajoute ensuite en modifiant la fiche, comme aujourd&apos;hui.
          </span>
        </label>
        <button type="submit" disabled={sending} className={buttonClass}>
          {sending ? "Ajout…" : "Ajouter"}
        </button>
        <p className="text-xs text-toac-blue-900/60">
          Pour un adhérent, utilisez l&apos;email de son adhésion : son nom est repris automatiquement (renseignez « Prénom
          et nom » pour l&apos;écrire autrement sur la fiche). La personne se connecte ensuite avec cet email.
        </p>
      </form>

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      {info && <p role="status" className="text-sm font-medium text-amber-800">{info}</p>}

      <div className="overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200 bg-toac-gray-50">
            <tr>
              <th className={th}>Rôle</th>
              <th className={th}>Nom</th>
              <th className={th}>Email</th>
              <th className={th}>Fiche publique</th>
              <th className={th}>Ajouté par</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-toac-blue-900/60">Aucun rôle attribué.</td>
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
                  <td className={td}>
                    {r.cms_fiche_id ? (
                      <span className="text-emerald-700">✓ liée</span>
                    ) : (
                      <button type="button" onClick={() => handleFiche(r)} className="text-sm underline">
                        Créer / relier la fiche
                      </button>
                    )}
                  </td>
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
