import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Lancement TDL 2027",
  robots: { index: false, follow: false },
};

// Contenu de la présentation de la réunion de lancement du 12 octobre 2026.
// Réservé aux adhérents : noms des responsables et infos internes au club.

const CHIFFRES_2026 = [
  { valeur: "1 732", label: "inscrits" },
  { valeur: "1 606", label: "finishers" },
  { valeur: "13", label: "épreuves" },
  { valeur: "190", label: "bénévoles" },
];

const OBJECTIFS = [
  { titre: "Fluidité avant volume", detail: "bien accueillir ceux qui viennent." },
  { titre: "Une organisation qui se transmet", detail: "fiches de poste écrites." },
  { titre: "Budget et partenaires solides", detail: "au-delà de Nailloux Outlet et Trek." },
  { titre: "Communication régulière", detail: "et inscriptions ouvertes tôt." },
  { titre: "Un événement écoresponsable", detail: "" },
];

const CALENDRIER = [
  {
    periode: "Oct. – nov.",
    detail: "Programme, plafond et tarifs arrêtés. Ouverture des inscriptions au plus tard le 1er novembre.",
  },
  { periode: "Déc. – janv.", detail: "Pôles constitués, partenaires, budget, communication." },
  { periode: "Fév. – mars", detail: "Plans, autorisations, commandes de matériel." },
  { periode: "Avril – mai", detail: "Marquage des parcours, dossards, plan d'installation arrêté." },
  { periode: "Juin, J-10 à J-1", detail: "Camions, installation, impressions." },
  { periode: "Jour J et après", detail: "Week-end des 5 et 6 juin, rangement, retours de matériel, REX." },
];

type Pole = { nom: string; mission: string; responsable: string; aPourvoir?: boolean };

const FAMILLES: { nom: string; sousTitre: string; poles: Pole[] }[] = [
  {
    nom: "Pilotage",
    sousTitre: "Faire tenir l'ensemble",
    poles: [
      {
        nom: "Administration",
        mission: "Autorisations, assurances, budget, dossiers officiels",
        responsable: "Erwan Lejean, Gabriel Messaut",
      },
      { nom: "Bénévoles", mission: "Recrutement, planning, accueil", responsable: "Lucas Busser" },
      {
        nom: "Inscriptions",
        mission: "Ouverture, suivi des inscrits, dossards, retrait",
        responsable: "Julien Derville, Anne Larribe",
      },
      {
        nom: "Logistique",
        mission: "Matériel, camions, installation/rangement",
        responsable: "Wil Alias, David Pivetta, Thierry Diaz",
      },
    ],
  },
  {
    nom: "Parcours",
    sousTitre: "Les épreuves et le site",
    poles: [
      { nom: "Lac / natation", mission: "Balisage, sécurité, mise à l'eau", responsable: "Sébastien Parrain" },
      { nom: "Vélo", mission: "Parcours, signalisation, signaleurs", responsable: "À pourvoir", aPourvoir: true },
      { nom: "Course à pied", mission: "Parcours, balisage, postes", responsable: "Thibaut Laussu" },
      { nom: "Parc à vélos", mission: "Implantation, entrée / sortie, contrôles", responsable: "Gabriel Messaut" },
      {
        nom: "Swimrun",
        mission: "Parcours, sécurité, relais d'équipes",
        responsable: "Julien Dubois + relais à trouver",
        aPourvoir: true,
      },
      {
        nom: "Parking",
        mission: "Parking, circulation et toilettes sèches en rotation",
        responsable: "À pourvoir",
        aPourvoir: true,
      },
    ],
  },
  {
    nom: "Expérience",
    sousTitre: "Faire vivre l'événement",
    poles: [
      {
        nom: "Communication",
        mission: "Réseaux, site, guide du participant, animation",
        responsable: "Chloé Vermorel",
      },
      {
        nom: "Partenaires / Dotations",
        mission: "Recherche et suivi des partenaires, dotations",
        responsable: "Erwan Lejean, Ambre Mahinc",
      },
      {
        nom: "Catering",
        mission: "Buvette, repas bénévoles, food-trucks, ravitaillements",
        responsable: "Lionel Kervadec, Cyrille Blanchardon",
      },
      { nom: "Photo", mission: "Couverture photo des épreuves", responsable: "Gauthier Le Chenadec" },
    ],
  },
];

const ROLE_RESPONSABLE = [
  {
    temps: "Avant",
    points: [
      "Définir les fiches de poste et les transmettre à son équipe avant l'événement.",
      "Mettre à jour le fichier de suivi avant chaque réunion.",
      "Gérer le budget : devis, factures.",
    ],
  },
  {
    temps: "Pendant",
    points: ["Donner les consignes, talkie en main.", "Compléter les fiches de poste par un brief le jour J."],
  },
  {
    temps: "Après",
    points: [
      "Faire le retour d'expérience de son pôle.",
      "Organiser le retour du matériel.",
      "Mettre à jour les fiches de poste pour l'année suivante.",
    ],
  },
];

const PROFILS = [
  {
    titre: "Responsable de pôle",
    points: ["Clairement identifié.", "Organise son pôle et prépare les fiches de poste."],
  },
  {
    titre: "Membre de pôle",
    points: [
      "Aide concrètement le responsable en amont de l'épreuve.",
      "S'engage sur des actions et les mène à bout.",
      "Redevient bénévole pendant le week-end.",
    ],
  },
  {
    titre: "Bénévole",
    points: [
      "Donne ses disponibilités.",
      "Est affecté à des missions en amont ou pendant l'épreuve.",
      "Ne choisit pas son pôle.",
    ],
  },
];

const MISSIONS_AMONT = [
  { mission: "Signalisation et marquage des parcours", quand: "Fin mai", pole: "Vélo, Course à pied" },
  { mission: "Tri, préparation et distribution des dossards", quand: "Fin mai", pole: "Inscriptions" },
  {
    mission: "Aller chercher et rendre du matériel (Ligue, clubs, partenaires)",
    quand: "Avant et après l'événement",
    pole: "Logistique",
  },
  { mission: "Posts, mailings, site, guide du participant", quand: "Toute l'année", pole: "Communication" },
  { mission: "Démarcher partenaires et fournisseurs", quand: "Oct. – mars", pole: "Partenaires / Dotations" },
  { mission: "Aller chercher la sciure", quand: "Mars – mai", pole: "Logistique, Parking" },
  { mission: "Impressions et listings à J-2", quand: "Semaine de l'événement", pole: "Inscriptions, Administration" },
];

function SectionTitle({ children, sousTitre }: { children: React.ReactNode; sousTitre?: string }) {
  return (
    <div className="mt-14">
      <h2 className="section-title font-display text-2xl uppercase text-toac-blue-950">{children}</h2>
      {sousTitre && <p className="mt-1 text-sm font-semibold text-toac-pink-600">{sousTitre}</p>}
    </div>
  );
}

function Carte({ titre, points, accent }: { titre: string; points: string[]; accent?: boolean }) {
  return (
    <div
      className={`rounded-md border border-toac-gray-200 border-t-4 bg-white p-4 shadow-sm ${
        accent ? "border-t-toac-pink-500" : "border-t-toac-blue-950"
      }`}
    >
      <h3 className={`font-semibold ${accent ? "text-toac-pink-600" : "text-toac-blue-950"}`}>{titre}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-toac-blue-900/90">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function Tdl2027Page() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/tdl-2027");

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/espace-adherents/documents" className="text-sm text-toac-blue-700 underline">
        ← Documents & infos internes
      </Link>

      {/* En-tête */}
      <div className="mt-6 rounded-lg bg-toac-blue-950 p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">
          Réunion de lancement · 12 octobre 2026
        </p>
        <div className="mt-6 h-1.5 w-20 bg-toac-pink-500" />
        <h1 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">Triathlons du Lauragais 2027</h1>
        <p className="mt-3 text-white/80">16e édition · 5 et 6 juin 2027 · lac de la Thésauque, Nailloux</p>
      </div>

      {/* Bilan 2026 */}
      <SectionTitle sousTitre="Un record, grâce à vous">Édition 2026</SectionTitle>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CHIFFRES_2026.map((c) => (
          <div key={c.label} className="border-t-4 border-toac-pink-500 pt-2">
            <div className="font-display text-3xl text-toac-blue-950">{c.valeur}</div>
            <div className="text-sm text-toac-blue-900/70">{c.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-toac-blue-900/90">110 clubs · 54 départements · 11 régions · 204 enfants</p>
      <p className="mt-1 text-sm font-bold text-toac-blue-950">+80 % d&apos;inscrits par rapport à 2025</p>

      <SectionTitle sousTitre="Ce que le TDL apporte au club">Sans bénévoles, pas de TDL</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Carte
          titre="Il fait vivre le club"
          points={[
            "Sans TDL, pas de sorties club, pas de financement des tenues et des stages.",
            "Les bénéfices sont réinvestis dans le matériel et dans les adhérents.",
          ]}
        />
        <Carte
          accent
          titre="Ce qu'on vous rend"
          points={[
            "En 2026 : 100 à 300 € de bons d'achat pour chaque bénévole, sur la boutique du club et les stages.",
            "Les repas des bénévoles sont offerts pendant tout le week-end, et le samedi soir : bar ouvert et concert live.",
          ]}
        />
      </div>

      <SectionTitle sousTitre="Ce qu'on garde, ce qu'on améliore">Retour sur 2026</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Carte
          titre="Ce qui a marché"
          points={[
            "Inscriptions ouvertes en novembre : 420 inscrits fin janvier 2026 (vs 120 en 2025).",
            "Communication régulière sur les réseaux.",
            "Un triathlon porté par l'effet Paris 2024.",
          ]}
        />
        <Carte
          accent
          titre="À améliorer"
          points={[
            "Rangement du dimanche : équipes et camions.",
            "Plan d'installation arrêté plus tôt.",
            "Électricité : abonnement et électricien.",
            "Parking saturé : covoiturage à encourager.",
          ]}
        />
      </div>

      {/* Édition 2027 */}
      <SectionTitle sousTitre="Samedi 5 et dimanche 6 juin 2027">L&apos;édition 2027</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Carte
          titre="Acquis"
          points={[
            "Lac de la Thésauque, Nailloux.",
            "Programme 2026 reconduit : 13 épreuves sur deux jours.",
            "Capacité : environ 690 vélos par période et 590 places de parking.",
            "Label D3 : probablement pas en 2027.",
          ]}
        />
        <Carte
          accent
          titre="À définir"
          points={[
            "Programme du samedi.",
            "Plafond de dossards.",
            "Tarifs et date d'ouverture des inscriptions.",
            "Médaille : oui ou non.",
          ]}
        />
      </div>

      <SectionTitle sousTitre="Mieux plutôt que plus">Nos objectifs</SectionTitle>
      <ol className="mt-4 divide-y divide-toac-gray-200 rounded-md border border-toac-gray-200 bg-white shadow-sm">
        {OBJECTIFS.map((o, i) => (
          <li key={o.titre} className="flex items-baseline gap-4 px-4 py-3 text-sm text-toac-blue-900/90">
            <span className="font-display text-xl text-toac-pink-600">{i + 1}</span>
            <span>
              <strong className="text-toac-blue-950">{o.titre}</strong>
              {o.detail && <> : {o.detail}</>}
            </span>
          </li>
        ))}
      </ol>

      <SectionTitle sousTitre="Jusqu'au jour J, en six temps">Calendrier</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {CALENDRIER.map((c, i) => (
          <Carte key={c.periode} titre={c.periode} points={[c.detail]} accent={i >= 3} />
        ))}
      </div>
      <p className="mt-3 text-sm text-toac-blue-900/70">
        Réunion de coordination chaque premier lundi du mois. Jalons indicatifs.
      </p>

      {/* Pôles */}
      <SectionTitle sousTitre="Trois familles">14 pôles</SectionTitle>
      {FAMILLES.map((f) => (
        <div key={f.nom} className="mt-6">
          <h3 className="font-display text-lg uppercase text-toac-blue-950">
            {f.nom} <span className="text-sm normal-case text-toac-blue-900/60">· {f.sousTitre}</span>
          </h3>
          <div className="mt-2 overflow-x-auto rounded-md border border-toac-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-toac-blue-950 text-toac-pink-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Pôle</th>
                  <th className="px-3 py-2 font-semibold">Mission</th>
                  <th className="px-3 py-2 font-semibold">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toac-gray-200 text-toac-blue-900/90">
                {f.poles.map((p) => (
                  <tr key={p.nom}>
                    <td className="px-3 py-2 font-semibold text-toac-blue-950">{p.nom}</td>
                    <td className="px-3 py-2">{p.mission}</td>
                    <td className={`px-3 py-2 ${p.aPourvoir ? "font-semibold text-toac-pink-600" : ""}`}>
                      {p.responsable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Rôles */}
      <SectionTitle sousTitre="Son rôle, en trois temps">Responsable de pôle</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {ROLE_RESPONSABLE.map((r, i) => (
          <Carte key={r.temps} titre={r.temps} points={r.points} accent={i === 0} />
        ))}
      </div>

      <SectionTitle sousTitre="Les trois sont bénévoles">Trois profils</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {PROFILS.map((p, i) => (
          <Carte key={p.titre} titre={p.titre} points={p.points} accent={i === 0} />
        ))}
      </div>

      <SectionTitle sousTitre="S'investir avant le week-end">Missions en amont</SectionTitle>
      <div className="mt-4 overflow-x-auto rounded-md border border-toac-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-toac-blue-950 text-toac-pink-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mission</th>
              <th className="px-3 py-2 font-semibold">Quand</th>
              <th className="px-3 py-2 font-semibold">Pôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toac-gray-200 text-toac-blue-900/90">
            {MISSIONS_AMONT.map((m) => (
              <tr key={m.mission}>
                <td className="px-3 py-2">{m.mission}</td>
                <td className="px-3 py-2">{m.quand}</td>
                <td className="px-3 py-2">{m.pole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-toac-blue-900/70">
        Absent le week-end ? Dépôt de garantie : voir le{" "}
        <Link href="/reglement-interieur" className="text-toac-blue-700 underline">
          règlement intérieur du club
        </Link>
        .
      </p>

      {/* Appel */}
      <div className="mt-14 rounded-lg bg-toac-blue-950 p-6 text-white sm:p-8">
        <div className="h-1.5 w-20 bg-toac-pink-500" />
        <h2 className="mt-4 font-display text-2xl uppercase">On cherche</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border-t-4 border-toac-pink-500 bg-white/10 p-4">
            <p className="font-semibold">Deux responsables de pôle</p>
            <p className="mt-1 font-display text-xl uppercase">Vélo · Parking</p>
          </div>
          <div className="rounded-md border-t-4 border-toac-pink-500 bg-white/10 p-4">
            <p className="font-semibold">Un futur responsable</p>
            <p className="mt-1 font-display text-xl uppercase">Swimrun</p>
            <p className="mt-1 text-sm text-white/70">Pour seconder Julien Dubois.</p>
          </div>
        </div>
      </div>

      <SectionTitle sousTitre="Un message WhatsApp à Erwan">Se positionner</SectionTitle>
      <div className="mt-4 rounded-md border border-toac-gray-200 border-t-4 border-t-toac-pink-500 bg-white p-4 text-sm text-toac-blue-900/90 shadow-sm">
        <p className="font-semibold text-toac-blue-950">
          Tu veux être responsable ou membre d&apos;un pôle, ou prendre une mission en amont ?
        </p>
        <p className="mt-2">Écris-lui en précisant :</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>le pôle ou la mission qui t&apos;intéresse ;</li>
          <li>tes disponibilités les 5 et 6 juin.</li>
        </ol>
      </div>
    </div>
  );
}
