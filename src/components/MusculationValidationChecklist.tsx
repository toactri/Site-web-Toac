"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdherentMusculation } from "@/lib/db";
import { ExpirationDecharge } from "@/components/AdminMusculationTable";

/**
 * Liste des adhérents d'une saison (importés via Bureau → Attestations) avec
 * une case « validé musculation » : pour ceux dont la décharge et le
 * certificat médical ont été transmis sur une saison précédente (valables
 * 3 ans), sans leur faire refaire le formulaire en ligne. L'année de la
 * décharge fixe l'expiration (année + 3).
 */
export default function MusculationValidationChecklist({
  saison,
  saisons,
  adherents,
}: {
  saison: string | null;
  saisons: string[];
  adherents: AdherentMusculation[];
}) {
  const router = useRouter();
  const anneeCourante = new Date().getFullYear();
  const annees = Array.from({ length: 6 }, (_, i) => anneeCourante - i);
  const [search, setSearch] = useState("");
  const [anneeParDefaut, setAnneeParDefaut] = useState(anneeCourante - 1);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return adherents;
    return adherents.filter((a) => `${a.prenom} ${a.nom}`.toLowerCase().includes(query));
  }, [adherents, search]);

  const cochesCount = adherents.filter((a) => a.valide_bureau).length;

  async function save(a: AdherentMusculation, valide: boolean, annee: number | null) {
    setSavingId(a.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/musculation/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adherentId: a.id, valide, anneeDecharge: annee }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "L'enregistrement a échoué.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez plus tard.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <details className="mb-8 rounded-lg border border-toac-gray-200 bg-toac-gray-50 p-4">
      <summary className="cursor-pointer font-medium text-toac-blue-950">
        Cocher les adhérents déjà validés musculation (dossiers des saisons précédentes)
        {cochesCount > 0 && ` — ${cochesCount} coché(s)`}
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-toac-blue-900/80">
          Pour les adhérents dont la décharge et le certificat médical ont déjà été transmis au club (valables
          3 ans) : ils apparaissent comme validés sans refaire le formulaire. L&apos;année de la décharge fixe
          l&apos;expiration (2025 → valable jusqu&apos;en 2028).
        </p>

        {saisons.length === 0 ? (
          <p className="text-sm text-amber-800">
            Aucun adhérent importé : importez d&apos;abord la liste de la saison dans Bureau → Attestations.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-toac-blue-900">
                <span className="mb-1 block font-medium">Adhérents de la saison</span>
                <select
                  value={saison ?? ""}
                  onChange={(e) => router.push(`?saison=${encodeURIComponent(e.target.value)}`)}
                  className="rounded-md border border-toac-gray-200 bg-white px-3 py-2"
                >
                  {saisons.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-toac-blue-900">
                <span className="mb-1 block font-medium">Année de décharge à la coche</span>
                <select
                  value={anneeParDefaut}
                  onChange={(e) => setAnneeParDefaut(Number(e.target.value))}
                  className="rounded-md border border-toac-gray-200 bg-white px-3 py-2"
                >
                  {annees.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un nom…"
                className="w-full flex-1 rounded-md border border-toac-gray-200 bg-white px-3 py-2"
              />
            </div>

            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

            <ul className="divide-y divide-toac-gray-100 rounded-md border border-toac-gray-200 bg-white">
              {filtered.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={a.valide_bureau}
                      disabled={savingId === a.id}
                      onChange={(e) => save(a, e.target.checked, e.target.checked ? anneeParDefaut : null)}
                    />
                    <span>
                      <span className="font-medium uppercase text-toac-blue-950">{a.nom}</span> {a.prenom}
                    </span>
                  </label>
                  {a.decharge_en_ligne && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Décharge déposée en ligne
                    </span>
                  )}
                  {a.valide_bureau && (
                    <span className="flex items-center gap-2 text-xs text-toac-blue-900/70">
                      <select
                        aria-label={`Année de décharge de ${a.prenom} ${a.nom}`}
                        value={a.annee_decharge ?? ""}
                        disabled={savingId === a.id}
                        onChange={(e) => save(a, true, e.target.value ? Number(e.target.value) : null)}
                        className="rounded border border-toac-gray-200 bg-white px-1.5 py-0.5"
                      >
                        <option value="">Année ?</option>
                        {annees.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ExpirationDecharge annee={a.annee_decharge} />
                    </span>
                  )}
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-toac-blue-900/60">Aucun adhérent trouvé.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
