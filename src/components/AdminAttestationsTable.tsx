"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttestationRow } from "@/lib/db";
import { documentHref } from "@/lib/documentUrl";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function euros(centimes: number): string {
  return `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: centimes % 100 ? 2 : 0 })} €`;
}

function EnvoiEtat({ a }: { a: AttestationRow }) {
  if (a.envoi_statut === "envoyee") {
    return <span className="text-emerald-700">✓ Envoyée le {formatDate(a.envoi_le)}</span>;
  }
  if (a.envoi_statut === "echec" || a.envoi_statut === "ignoree") {
    return (
      <span className="text-red-700" title={a.envoi_erreur ?? undefined}>
        ✕ {a.envoi_statut === "echec" ? "Envoi en échec" : "Non envoyée"} — {a.envoi_erreur}
      </span>
    );
  }
  return <span className="text-toac-blue-900/60">Envoi non tracé</span>;
}

export default function AdminAttestationsTable({ attestations }: { attestations: AttestationRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return attestations;
    return attestations.filter((a) => `${a.prenom} ${a.nom} ${a.email}`.toLowerCase().includes(query));
  }, [attestations, search]);

  async function post(a: AttestationRow, action: "renvoyer" | "supprimer") {
    if (
      action === "supprimer" &&
      !window.confirm(`Supprimer définitivement l'attestation de ${a.prenom} ${a.nom} ?`)
    ) {
      return;
    }
    setBusyId(a.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/attestations/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage({ id: a.id, ok: false, text: data?.error ?? "L'opération a échoué." });
      } else if (action === "renvoyer") {
        setMessage({ id: a.id, ok: true, text: `Renvoyée à ${data?.email}` });
      }
      router.refresh();
    } catch {
      setMessage({ id: a.id, ok: false, text: "Erreur réseau. Réessayez plus tard." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un nom ou un email…"
        className="mb-4 w-full rounded-md border border-toac-gray-200 px-3 py-2 outline-none focus:border-toac-blue-600 focus:ring-2 focus:ring-toac-blue-600/30"
      />
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="rounded-lg border border-toac-gray-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium text-toac-blue-950">
                {a.prenom} {a.nom} <span className="font-normal text-toac-blue-900/60">· {a.saison}</span>
              </div>
              <div className="text-xs text-toac-blue-900/60">
                Générée le {formatDate(a.genere_le)}
                {a.demandes > 1 && ` · ${a.demandes} demandes`}
              </div>
            </div>
            <div className="mt-1 text-toac-blue-900/80">
              Licence {euros(a.licence_centimes)} + cotisation {euros(a.cotisation_centimes)} ={" "}
              <strong>{euros(a.licence_centimes + a.cotisation_centimes)}</strong> · {a.email}
            </div>
            <div className="mt-1 text-xs">
              <EnvoiEtat a={a} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={documentHref(a.document_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-toac-blue-800 px-3 py-1.5 text-xs font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
              >
                Voir/télécharger →
              </a>
              <button
                type="button"
                onClick={() => post(a, "renvoyer")}
                disabled={busyId === a.id}
                className="rounded-md border border-toac-gray-200 px-3 py-1.5 text-xs font-medium text-toac-blue-900 hover:bg-toac-gray-100 disabled:opacity-60"
              >
                {busyId === a.id ? "…" : "Renvoyer à l'adhérent"}
              </button>
              <button
                type="button"
                onClick={() => post(a, "supprimer")}
                disabled={busyId === a.id}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Supprimer
              </button>
            </div>
            {message?.id === a.id && (
              <p role="status" className={`mt-2 text-xs font-medium ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
                {message.text}
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-toac-gray-200 bg-white p-6 text-center text-toac-blue-900/60 shadow-sm">
            Aucune attestation générée pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
