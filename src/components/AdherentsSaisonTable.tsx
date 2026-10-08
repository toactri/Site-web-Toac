"use client";

import { useMemo, useState } from "react";
import type { AdherentSaisonRow } from "@/lib/db";

/** Liste des adhérents de la saison importée, en lecture seule (le Google Sheets reste la référence). */
export default function AdherentsSaisonTable({ adherents }: { adherents: AdherentSaisonRow[] }) {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("all");
  const [profil, setProfil] = useState("all");

  const statuts = useMemo(
    () => [...new Set(adherents.map((a) => a.statut_dossier?.trim() || "Sans statut"))].sort(),
    [adherents]
  );
  const profils = useMemo(
    () => [...new Set(adherents.map((a) => a.profil?.trim()).filter((p): p is string => Boolean(p)))].sort(),
    [adherents]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return adherents.filter(
      (a) =>
        (!query || `${a.prenom} ${a.nom} ${a.email ?? ""}`.toLowerCase().includes(query)) &&
        (statut === "all" || (a.statut_dossier?.trim() || "Sans statut") === statut) &&
        (profil === "all" || a.profil?.trim() === profil)
    );
  }, [adherents, search, statut, profil]);

  const selectClass = "rounded-md border border-toac-gray-200 bg-white px-3 py-2 text-sm";
  const th = "px-3 py-2 text-left font-semibold text-toac-blue-950";
  const td = "px-3 py-2 text-toac-blue-900";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un adhérent…"
          className="min-w-0 flex-1 rounded-md border border-toac-gray-200 px-3 py-2 text-sm"
        />
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectClass}>
          <option value="all">Tous les statuts</option>
          {statuts.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={profil} onChange={(e) => setProfil(e.target.value)} className={selectClass}>
          <option value="all">Tous les profils</option>
          {profils.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <p className="mb-2 text-sm text-toac-blue-900/70">
        {filtered.length} adhérent{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur{" "}
        {adherents.length}
      </p>
      <div className="overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200 bg-toac-gray-50">
            <tr>
              <th className={th}>Adhérent</th>
              <th className={th}>Statut du dossier</th>
              <th className={th}>Profil</th>
              <th className={th}>Tarif</th>
              <th className={th}>Justif OK ?</th>
              <th className={th}>Licence</th>
              <th className={th}>TDL</th>
              <th className={th}>Muscu</th>
              <th className={th}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-toac-blue-900/60">
                  Aucun adhérent ne correspond.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b border-toac-gray-100 last:border-0">
                  <td className={`${td} font-medium`}>
                    {a.nom} {a.prenom}
                    {a.bureau?.toLowerCase() === "oui" ? (
                      <span className="ml-2 rounded bg-toac-blue-950 px-1.5 py-0.5 text-xs text-white">Bureau</span>
                    ) : null}
                  </td>
                  <td className={td}>{a.statut_dossier ?? "—"}</td>
                  <td className={td}>{a.profil ?? "—"}</td>
                  <td className={td}>{a.statut_tarif ?? "—"}</td>
                  <td className={td}>{a.justif_ok ?? "—"}</td>
                  <td className={td}>{a.licence_demandee ?? "—"}</td>
                  <td className={td}>{a.benevole_tdl ?? "—"}</td>
                  <td className={td}>{a.musculation ? "Oui" : "—"}</td>
                  <td className={`${td} text-xs`}>
                    {a.email ? <a href={`mailto:${a.email}`} className="underline">{a.email}</a> : null}
                    {a.telephone ? <div>{a.telephone}</div> : null}
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
