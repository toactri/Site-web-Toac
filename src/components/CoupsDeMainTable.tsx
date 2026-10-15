"use client";

import { useMemo, useState } from "react";

export interface CoupDeMainLigne {
  id: number;
  nom: string;
  prenom: string;
  actions: string[];
}

type Colonne = {
  key: string;
  label: string;
  valeur: (a: CoupDeMainLigne) => string;
  filtre: "texte" | "liste";
};

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/**
 * Adhérents ayant répondu, avec une colonne par action proposée : filtres et
 * tri par colonne, comme la liste des adhérents de la vue bureau.
 */
export default function CoupsDeMainTable({ lignes: toutes, actions }: { lignes: CoupDeMainLigne[]; actions: string[] }) {
  const colonnes: Colonne[] = useMemo(
    () => [
      { key: "nom", label: "Nom", valeur: (a) => a.nom, filtre: "texte" },
      { key: "prenom", label: "Prénom", valeur: (a) => a.prenom, filtre: "texte" },
      { key: "nombre", label: "Nb", valeur: (a) => String(a.actions.length), filtre: "liste" },
      ...actions.map(
        (action): Colonne => ({
          key: `action:${action}`,
          label: action,
          valeur: (a) => (a.actions.includes(action) ? "Oui" : "—"),
          filtre: "liste",
        })
      ),
    ],
    [actions]
  );
  const [filtres, setFiltres] = useState<Record<string, string>>({});
  const [tri, setTri] = useState<{ key: string; sens: 1 | -1 }>({ key: "nombre", sens: -1 });

  const options = useMemo(
    () =>
      Object.fromEntries(
        colonnes
          .filter((c) => c.filtre === "liste")
          .map((c) => [c.key, [...new Set(toutes.map(c.valeur))].sort(collator.compare)])
      ) as Record<string, string[]>,
    [colonnes, toutes]
  );

  const lignes = useMemo(() => {
    const filtrees = toutes.filter((a) =>
      colonnes.every((c) => {
        const f = filtres[c.key];
        if (!f) return true;
        const v = c.valeur(a);
        return c.filtre === "texte" ? v.toLowerCase().includes(f.trim().toLowerCase()) : v === f;
      })
    );
    const colonne = colonnes.find((c) => c.key === tri.key) ?? colonnes[0];
    return filtrees.sort(
      (x, y) =>
        tri.sens * collator.compare(colonne.valeur(x), colonne.valeur(y)) ||
        collator.compare(`${x.nom} ${x.prenom}`, `${y.nom} ${y.prenom}`)
    );
  }, [toutes, colonnes, filtres, tri]);

  const actifs = Object.values(filtres).some(Boolean);
  const th = "px-3 py-2 text-left align-bottom font-semibold text-toac-blue-950";
  const td = "px-3 py-2 text-toac-blue-900";
  const champ = "w-full min-w-16 rounded border border-toac-gray-200 bg-white px-2 py-1 text-xs font-normal";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-toac-blue-900/70">
        <span>
          {lignes.length} adhérent{lignes.length > 1 ? "s" : ""} affiché{lignes.length > 1 ? "s" : ""} sur {toutes.length}
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
              {colonnes.map((c) => (
                <th
                  key={c.key}
                  className={th}
                  aria-sort={tri.key === c.key ? (tri.sens === 1 ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => setTri((t) => ({ key: c.key, sens: t.key === c.key ? (t.sens === 1 ? -1 : 1) : 1 }))}
                    className="inline-flex items-end gap-1 text-left hover:underline"
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
              {colonnes.map((c) => (
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
                <td colSpan={colonnes.length} className="px-3 py-6 text-center text-toac-blue-900/60">
                  Aucun adhérent ne correspond.
                </td>
              </tr>
            ) : (
              lignes.map((a) => (
                <tr key={a.id} className="border-b border-toac-gray-100 last:border-0">
                  <td className={`${td} font-medium`}>{a.nom}</td>
                  <td className={td}>{a.prenom}</td>
                  <td className={`${td} tabular-nums`}>{a.actions.length}</td>
                  {actions.map((action) => (
                    <td key={action} className={`${td} text-center`}>
                      {a.actions.includes(action) ? (
                        <span className="font-semibold text-emerald-700" aria-label="Oui">✓</span>
                      ) : (
                        <span className="text-toac-blue-900/30" aria-label="Non">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
