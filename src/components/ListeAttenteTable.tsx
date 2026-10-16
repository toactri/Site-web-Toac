"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListeAttenteRow } from "@/lib/db";
import { ageAt } from "@/lib/age";

const thClass = "px-3 py-2 text-left font-semibold text-toac-blue-950";
const tdClass = "px-3 py-1.5 align-top text-toac-blue-900";

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

type Filtre = "tous" | "tdl" | "non-tdl";

/** Inscrits de la liste d'attente, par ordre d'arrivée, avec recherche et filtre TDL. */
export default function ListeAttenteTable({ inscrits }: { inscrits: ListeAttenteRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Rang = ordre d'arrivée sur la liste complète, indépendant des filtres.
  const lignes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inscrits
      .map((i, index) => ({ ...i, rang: index + 1 }))
      .filter((i) => filtre === "tous" || i.benevole_tdl === (filtre === "tdl"))
      .filter((i) => !query || `${i.prenom} ${i.nom} ${i.email} ${i.telephone}`.toLowerCase().includes(query));
  }, [inscrits, search, filtre]);

  async function retirer(i: ListeAttenteRow) {
    if (!window.confirm(`Retirer définitivement ${i.prenom} ${i.nom} de la liste d'attente ?`)) return;
    setBusyId(i.id);
    setErreur(null);
    try {
      const response = await fetch("/api/admin/liste-attente/supprimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: i.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) setErreur(data?.error ?? "Le retrait a échoué.");
      else router.refresh();
    } catch {
      setErreur("Erreur réseau. Réessayez plus tard.");
    } finally {
      setBusyId(null);
    }
  }

  const emails = lignes.map((i) => i.email).join(", ");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, email, téléphone)"
          className="w-full max-w-xs rounded-md border border-toac-gray-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as Filtre)}
          className="rounded-md border border-toac-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="tous">Tous</option>
          <option value="tdl">Dispo bénévolat TDL</option>
          <option value="non-tdl">Non dispo TDL</option>
        </select>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(emails)}
          className="rounded-md border border-toac-blue-800/40 px-3 py-2 text-sm text-toac-blue-900 hover:bg-toac-blue-950 hover:text-white"
        >
          Copier les {lignes.length} emails
        </button>
      </div>
      {erreur && <p className="mb-3 text-sm text-red-700">{erreur}</p>}

      <div className="overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200 bg-toac-gray-50">
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Inscrit le</th>
              <th className={thClass}>Nom</th>
              <th className={thClass}>Genre</th>
              <th className={thClass}>Âge</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Statut</th>
              <th className={thClass}>TDL</th>
              <th className={thClass}>Origine</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {lignes.map((i) => (
              <tr key={i.id} className="border-b border-toac-gray-100 last:border-0">
                <td className={`${tdClass} tabular-nums`}>{i.rang}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{dateCourte(i.cree_le)}</td>
                <td className={`${tdClass} font-medium`}>
                  {i.nom.toUpperCase()} {i.prenom}
                  {i.suspect && (
                    <span
                      title={`Bloqué par l'anti-spam : ${i.suspect}`}
                      className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800"
                    >
                      Suspect
                    </span>
                  )}
                </td>
                <td className={tdClass}>{i.genre}</td>
                <td className={`${tdClass} tabular-nums`}>{ageAt(i.date_naissance) ?? "—"}</td>
                <td className={tdClass}>
                  <a href={`mailto:${i.email}`} className="underline">{i.email}</a>
                  <div className="text-toac-blue-900/70">{i.telephone}</div>
                  {i.confirmation_statut && i.confirmation_statut !== "envoyee" && (
                    <div className="text-xs text-red-700" title={i.confirmation_erreur ?? undefined}>
                      Email de confirmation non envoyé
                    </div>
                  )}
                </td>
                <td className={tdClass}>{i.statut}</td>
                <td className={tdClass}>
                  {i.benevole_tdl ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800">Oui</span>
                  ) : (
                    <span className="text-toac-blue-900/60">Non</span>
                  )}
                </td>
                <td className={`${tdClass} text-xs text-toac-blue-900/70`}>
                  {i.origine === "site" ? "Site" : `Google Form 26/27${i.statut_dossier_precedent ? ` (${i.statut_dossier_precedent})` : ""}`}
                </td>
                <td className={tdClass}>
                  <button
                    type="button"
                    disabled={busyId === i.id}
                    onClick={() => retirer(i)}
                    className="text-xs text-red-700 underline disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={10} className={`${tdClass} py-4 text-center text-toac-blue-900/60`}>
                  Aucun inscrit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
