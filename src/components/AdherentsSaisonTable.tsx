"use client";

import { useMemo, useState } from "react";
import type { AdherentSaisonRow } from "@/lib/db";

/** Libellés courts du « Ton statut » du Sheets. */
function tarifCourt(statutTarif: string | null): string {
  const s = (statutTarif ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (!s) return "—";
  if (s.startsWith("aucun")) return "Plein";
  if (s.startsWith("ayant droit")) return "Ayant droit";
  return "Autre";
}

type Colonne = {
  key: string;
  label: string;
  valeur: (a: AdherentSaisonRow) => string;
  /** « texte » : filtre par saisie libre ; sinon liste des valeurs présentes. */
  filtre: "texte" | "liste";
};

const COLONNES: Colonne[] = [
  { key: "adherent", label: "Adhérent", valeur: (a) => `${a.nom} ${a.prenom}`, filtre: "texte" },
  { key: "genre", label: "Genre", valeur: (a) => a.sexe?.trim() || "—", filtre: "liste" },
  { key: "profil", label: "Profil", valeur: (a) => a.profil?.trim() || "—", filtre: "liste" },
  { key: "tarif", label: "Tarif", valeur: (a) => tarifCourt(a.statut_tarif), filtre: "liste" },
  { key: "licence", label: "Licence", valeur: (a) => a.licence_demandee?.trim() || "—", filtre: "liste" },
  { key: "tdl", label: "TDL", valeur: (a) => a.benevole_tdl?.trim() || "—", filtre: "liste" },
  { key: "muscu", label: "Muscu", valeur: (a) => (a.musculation ? "Oui" : "—"), filtre: "liste" },
  {
    key: "contact",
    label: "Contact",
    valeur: (a) => [a.email, a.telephone].filter(Boolean).join(" "),
    filtre: "texte",
  },
];

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/** Liste des adhérents de la saison importée, en lecture seule (le Google Sheets reste la référence). */
export default function AdherentsSaisonTable({ adherents }: { adherents: AdherentSaisonRow[] }) {
  const [filtres, setFiltres] = useState<Record<string, string>>({});
  const [tri, setTri] = useState<{ key: string; sens: 1 | -1 }>({ key: "adherent", sens: 1 });

  const options = useMemo(
    () =>
      Object.fromEntries(
        COLONNES.filter((c) => c.filtre === "liste").map((c) => [
          c.key,
          [...new Set(adherents.map(c.valeur))].sort(collator.compare),
        ])
      ) as Record<string, string[]>,
    [adherents]
  );

  const lignes = useMemo(() => {
    const filtrees = adherents.filter((a) =>
      COLONNES.every((c) => {
        const f = filtres[c.key];
        if (!f) return true;
        const v = c.valeur(a);
        return c.filtre === "texte" ? v.toLowerCase().includes(f.trim().toLowerCase()) : v === f;
      })
    );
    const colonne = COLONNES.find((c) => c.key === tri.key) ?? COLONNES[0];
    return filtrees.sort((x, y) => tri.sens * collator.compare(colonne.valeur(x), colonne.valeur(y)));
  }, [adherents, filtres, tri]);

  const actifs = Object.values(filtres).some(Boolean);
  const th = "px-3 py-2 text-left font-semibold text-toac-blue-950";
  const td = "px-3 py-2 text-toac-blue-900";
  const champ = "w-full min-w-20 rounded border border-toac-gray-200 bg-white px-2 py-1 text-xs font-normal";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-toac-blue-900/70">
        <span>
          {lignes.length} adhérent{lignes.length > 1 ? "s" : ""} affiché{lignes.length > 1 ? "s" : ""} sur{" "}
          {adherents.length}
        </span>
        {actifs ? (
          <button type="button" onClick={() => setFiltres({})} className="underline hover:text-toac-blue-950">
            Effacer les filtres
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-toac-gray-200 bg-toac-gray-50">
            <tr>
              {COLONNES.map((c) => (
                <th key={c.key} className={th} aria-sort={tri.key === c.key ? (tri.sens === 1 ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    onClick={() => setTri((t) => ({ key: c.key, sens: t.key === c.key ? (t.sens === 1 ? -1 : 1) : 1 }))}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {c.label}
                    <span className="text-xs text-toac-blue-900/50">
                      {tri.key === c.key ? (tri.sens === 1 ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
            <tr>
              {COLONNES.map((c) => (
                <th key={c.key} className="px-3 pb-2">
                  {c.filtre === "texte" ? (
                    <input
                      type="search"
                      value={filtres[c.key] ?? ""}
                      onChange={(e) => setFiltres((f) => ({ ...f, [c.key]: e.target.value }))}
                      placeholder="Filtrer…"
                      aria-label={`Filtrer ${c.label}`}
                      className={champ}
                    />
                  ) : (
                    <select
                      value={filtres[c.key] ?? ""}
                      onChange={(e) => setFiltres((f) => ({ ...f, [c.key]: e.target.value }))}
                      aria-label={`Filtrer ${c.label}`}
                      className={champ}
                    >
                      <option value="">Tous</option>
                      {options[c.key].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={COLONNES.length} className="px-3 py-6 text-center text-toac-blue-900/60">
                  Aucun adhérent ne correspond.
                </td>
              </tr>
            ) : (
              lignes.map((a) => (
                <tr key={a.id} className="border-b border-toac-gray-100 last:border-0">
                  <td className={`${td} font-medium`}>
                    {a.nom} {a.prenom}
                    {a.bureau?.toLowerCase() === "oui" ? (
                      <span className="ml-2 rounded bg-toac-blue-950 px-1.5 py-0.5 text-xs text-white">Bureau</span>
                    ) : null}
                  </td>
                  {COLONNES.slice(1, -1).map((c) => (
                    <td key={c.key} className={td}>{c.valeur(a)}</td>
                  ))}
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
