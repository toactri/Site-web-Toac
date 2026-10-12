import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Conseils nutrition",
  robots: { index: false, follow: false },
};

// Retour d'expérience nutrition rédigé par Julien pour les adhérents (mis à jour
// après l'Ascend Xtri, septembre 2026), et documents du drive du club.
// Les PDF sont ouverts en aperçu Google Drive : lecture seule pour les adhérents.

const DOCUMENTS_DRIVE = [
  {
    titre: "Alimentation & Triathlon — TOAC Tri (2024)",
    detail: "Présentation du club sur l'alimentation du triathlète.",
    href: "https://drive.google.com/file/d/1ziZqSg6_dVVa2LnSiU0NAn43dwJC4Wqx/view",
  },
  {
    titre: "FF Tri — Fiche info : bonnes pratiques 2025",
    detail: "Fiche de la Fédération française de triathlon.",
    href: "https://drive.google.com/file/d/1VI-VgsrP9mRN0VAXC6uQ0p4WIaxuvdcS/view",
  },
];

const REPERES = [
  { situation: "Effort court", glucides: "Peu ou pas de ravitaillement nécessaire" },
  { situation: "1–2 h", glucides: "~30–60 g/h" },
  { situation: "> 2h30–3 h", glucides: "~60 g/h et plus si entraîné" },
  { situation: "> 5 h", glucides: "70–80 g/h maximum pour moi actuellement" },
];

const DOSAGES = [
  { contenant: "Flasque CAP 500 ml", melange: "~48 g", cuilleres: "3", glucides: "~47 g" },
  { contenant: "Bidon vélo 800 ml", melange: "~80 g", cuilleres: "5", glucides: "~78 g" },
  { contenant: "Bidon vélo 950 ml", melange: "~96 g", cuilleres: "6", glucides: "~94 g" },
];

const SOMMAIRE = [
  { id: "principe", label: "Le principe" },
  { id: "mix", label: "Le mix maison" },
  { id: "gels", label: "Les gels" },
  { id: "logistique", label: "Logistique" },
  { id: "recup", label: "Récupération" },
  { id: "materiel", label: "Matériel" },
  { id: "pourquoi", label: "Pourquoi maison" },
  { id: "longue-distance", label: "Longue distance" },
  { id: "resume", label: "En résumé" },
];

const ETAPES_COURSE = [
  { nom: "Début vélo", items: ["Barres", "Bananes", "Solide"] },
  { nom: "Milieu vélo", items: ["Boisson", "Gels", "Compotes"] },
  { nom: "Fin vélo", items: ["Boisson", "Gels fluides", "Compotes"] },
  { nom: "CAP / trail", items: ["Boisson", "Gels", "Bananes ravito"] },
];

const FORMES_GLUCIDES = [
  { aliment: "Boisson", avantage: "Facile à consommer régulièrement" },
  { aliment: "Gel", avantage: "Très concentré, petit volume" },
  { aliment: "Compote", avantage: "Semi-liquide, facile à avaler" },
  { aliment: "Banane", avantage: "Aliment naturel, texture différente" },
  { aliment: "Barre", avantage: "Intéressante surtout au début" },
  { aliment: "Aliment salé", avantage: "Permet de casser le goût sucré" },
];

const MATERIEL = [
  { quoi: "Maltodextrine, whey", ou: "Bulk, en gros" },
  { quoi: "Fructose, gomme de guar", ou: "HSN" },
  { quoi: "Flacons de gels 100 ml", ou: "Flacons souples type voyage", href: "https://amzn.eu/d/0dGqgEda" },
  { quoi: "Remplissage", ou: "Seringue alimentaire" },
  { quoi: "Pesée", ou: "Balance au 0,01 g (indispensable pour le guar, 0,4 g/gel)" },
];

const PRINCIPES = [
  "Je raisonne en glucides/h — je commence autour de 30–60 g/h et j'augmente progressivement si nécessaire.",
  "Je ne cherche pas forcément 90–100 g/h. Ma limite actuelle est plutôt 70–80 g/h sur les efforts > 5 h.",
  "Malto + fructose, ratio 2:1 par défaut. Le 1:0,8, plus riche en fructose, est testé et bien toléré.",
  "Une grosse partie des glucides passe par la boisson, particulièrement à vélo.",
  "Gels, compotes et bananes restent mes solutions faciles à avaler quand durée et chaleur augmentent.",
  "Je réserve davantage le solide au début : la mastication devient souvent un problème avant la digestion.",
  "Sur très longue distance, je prépare surtout la deuxième moitié de course — c'est là que la nutrition devient vraiment stratégique.",
];

function Section({ id, numero, titre, children }: { id: string; numero: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <span className="text-xs font-semibold uppercase tracking-widest text-toac-pink-600">Partie {numero}</span>
      <h2 className="mt-1 border-b border-toac-gray-200 pb-3 font-display text-2xl uppercase text-toac-blue-950">
        {titre}
      </h2>
      <div className="mt-4 space-y-4 text-toac-blue-900/90">{children}</div>
    </section>
  );
}

function Encadre({ tag, attention, children }: { tag: string; attention?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-r-lg border-l-4 px-4 py-3 text-sm ${
        attention ? "border-amber-500 bg-amber-50" : "border-toac-pink-500 bg-toac-gray-50"
      }`}
    >
      <span
        className={`block text-xs font-bold uppercase tracking-wider ${
          attention ? "text-amber-700" : "text-toac-pink-600"
        }`}
      >
        {tag}
      </span>
      <div className="mt-1 text-toac-blue-950">{children}</div>
    </div>
  );
}

function Recette({ titre, lignes, pied }: { titre?: string; lignes: [string, string][]; pied?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
      {titre && <h3 className="mb-3 font-display text-sm uppercase text-toac-blue-700">{titre}</h3>}
      <ul className="divide-y divide-dashed divide-toac-gray-200 text-sm">
        {lignes.map(([nom, qte]) => (
          <li key={nom} className="flex justify-between gap-3 py-2">
            <span>{nom}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-toac-blue-950">{qte}</span>
          </li>
        ))}
      </ul>
      {pied && <p className="mt-3 border-t border-toac-gray-200 pt-3 text-xs text-toac-blue-900/70">{pied}</p>}
    </div>
  );
}

const th = "border-b border-toac-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-toac-blue-900/60";
const td = "border-b border-toac-gray-200 px-3 py-2";

export default async function NutritionPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/nutrition");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Conseils nutrition</h1>

      <h2 className="mt-10 font-display text-lg uppercase text-toac-blue-950">Documents du club</h2>
      <ul className="mt-4 space-y-2">
        {DOCUMENTS_DRIVE.map((doc) => (
          <li key={doc.href}>
            <a
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-toac-gray-200 bg-white px-4 py-3 text-sm shadow-sm hover:bg-toac-gray-50"
            >
              <span className="font-medium text-toac-blue-950">📄 {doc.titre}</span>
              <span className="block text-toac-blue-900/70">{doc.detail} PDF, lecture seule.</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-14 rounded-lg border border-toac-gray-200 border-l-4 border-l-toac-pink-500 bg-white p-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-widest text-toac-pink-600">
          Nutrition d&apos;effort — retour d&apos;expérience
        </span>
        <p className="mt-1 font-display text-3xl uppercase text-toac-blue-950">Nourrir l&apos;effort</p>
        <p className="mt-3 text-toac-blue-900/80">
          Ma méthode et mes recettes maison pour le vélo, la course à pied, le trail et le triathlon. Ce n&apos;est
          pas une prescription médicale ni un protocole universel — les besoins varient selon le poids,
          l&apos;intensité, la durée, la chaleur et la tolérance digestive de chacun. Tout ce qui est prévu pour une
          course doit d&apos;abord être testé à l&apos;entraînement.
        </p>
        <p className="mt-4 text-sm text-toac-blue-900/60">
          <strong className="text-toac-blue-950">Julien</strong> · rédigé pour les adhérents du club · validé sur
          l&apos;Ascend Xtri (25/07/2026)
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-toac-gray-200 bg-toac-gray-200 sm:grid-cols-4">
        {[
          { k: "Effort court", v: "—", s: "peu ou pas de ravito" },
          { k: "1–2 h", v: "30–60", s: "g glucides/h" },
          { k: "2h30–3 h", v: "60+", s: "g/h si entraîné" },
          { k: "> 5 h", v: "70–80", s: "g/h, mon max actuel" },
        ].map((stat) => (
          <div key={stat.k} className="bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-toac-blue-900/60">{stat.k}</dt>
            <dd className="mt-1 font-display text-2xl text-toac-blue-950">{stat.v}</dd>
            <dd className="text-xs text-toac-blue-900/60">{stat.s}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Sommaire" className="mt-8 flex flex-wrap gap-2 rounded-lg bg-toac-gray-50 p-3">
        {SOMMAIRE.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-md border border-toac-gray-200 bg-white px-3 py-1.5 text-xs text-toac-blue-900 hover:border-toac-pink-500 hover:text-toac-pink-600"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section id="principe" numero="I" titre="Nourrir l'effort">
        <p>
          Pour les sports d&apos;endurance, je raisonne d&apos;abord en <strong>grammes de glucides par heure</strong>,
          puis je choisis les aliments qui permettent d&apos;atteindre cet objectif.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-xs uppercase tracking-wide text-toac-blue-900/60">
              Mes repères personnels
            </caption>
            <thead>
              <tr>
                <th className={th}>Situation</th>
                <th className={th}>Glucides</th>
              </tr>
            </thead>
            <tbody>
              {REPERES.map((r) => (
                <tr key={r.situation}>
                  <td className={td}>{r.situation}</td>
                  <td className={td}>{r.glucides}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Certains adhérents entraînés peuvent monter à <strong>90–100 g/h</strong>, et certains athlètes
          professionnels vont encore au-delà. Mais 90 ou 100 g/h n&apos;est pas un objectif obligatoire : il faut
          d&apos;abord être capable de bien digérer 50–60 g/h, puis augmenter progressivement si cela apporte quelque
          chose.
        </p>
        <p>
          Personnellement, je suis parti d&apos;environ 30–40 g/h à l&apos;entraînement et je suis progressivement
          monté à 60 g/h sans problème. Je teste maintenant la possibilité de monter vers 70–80 g/h sur les très
          longues sorties.
        </p>
      </Section>

      <Section id="mix" numero="II" titre="Le mix maison : maltodextrine + fructose">
        <p>
          J&apos;utilise de la <strong>maltodextrine</strong> (source de glucose) et du <strong>fructose</strong>, avec
          un ratio de départ <strong>2:1</strong>. Le mélange de plusieurs glucides permet d&apos;utiliser
          différentes voies d&apos;absorption intestinale — particulièrement intéressant pour absorber de grandes
          quantités de glucides sur les efforts longs.
        </p>
        <p>
          Je suis parti sur 2 parts de maltodextrine pour 1 part de fructose parce que c&apos;est simple, facile à
          calculer, facile à préparer, et bien toléré. Ce n&apos;est pas forcément le ratio optimal pour tout le monde.
        </p>
        <Encadre tag="Mise à jour — testé et validé">
          J&apos;ai testé un ratio plus riche en fructose, <strong>1:0,8</strong>, dans l&apos;idée d&apos;augmenter
          encore l&apos;apport glucidique sans problème digestif. Résultat : bien toléré, aucun souci. Je garde le 2:1
          comme référence par défaut, mais le 1:0,8 est une option validée si vous cherchez à pousser l&apos;apport
          horaire.
        </Encadre>
        <p>
          L&apos;objectif de ma boisson maison : des glucides, du sodium, de l&apos;eau, et une concentration
          suffisamment élevée pour être intéressante sur les longues sorties, mais suffisamment agréable à boire. Je
          la choisis volontairement plus concentrée que certaines boissons commerciales : je l&apos;utilise comme une
          vraie source de glucides, pas seulement comme boisson d&apos;hydratation.
        </p>
        <Recette
          titre="Recette — mélange de base (1,5 kg)"
          lignes={[
            ["Maltodextrine", "1 000 g"],
            ["Fructose", "500 g"],
            ["Sel fin", "27 g"],
          ]}
          pied="≈ 100 g de glucides/L en bidon · ≈ 600–700 mg de sodium/L. Les besoins en sodium et en liquide sont individuels — le but n'est pas de reproduire exactement les pertes de sueur avec une recette universelle."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-xs uppercase tracking-wide text-toac-blue-900/60">
              Dosages par contenant (cuillère doseuse = 16 g)
            </caption>
            <thead>
              <tr>
                <th className={th}>Contenant</th>
                <th className={`${th} text-right`}>Mélange</th>
                <th className={`${th} text-right`}>Cuillères</th>
                <th className={`${th} text-right`}>Glucides</th>
              </tr>
            </thead>
            <tbody>
              {DOSAGES.map((d) => (
                <tr key={d.contenant}>
                  <td className={td}>{d.contenant}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.melange}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.cuilleres}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.glucides}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          À vélo, je privilégie les bidons : portés par le vélo, faciles à boire régulièrement, et permettent
          d&apos;emporter beaucoup de glucides sans mastication. En CAP/trail, je privilégie les flasques : moins de
          volume, moins de poids, complétées par gels, compotes et ravitaillements.
        </p>
      </Section>

      <Section id="gels" numero="III" titre="Les gels maison">
        <p>C&apos;est la solution qui permet d&apos;emporter beaucoup de glucides dans très peu de volume.</p>
        <Recette
          titre="Recette — 1 gel de 100 ml"
          lignes={[
            ["Maltodextrine", "40 g"],
            ["Fructose", "20 g"],
            ["Gomme de guar", "0,4 g"],
            ["Jus de citron + sel + eau", "qs"],
          ]}
          pied="≈ 60 g de glucides par flacon. C'est un gel concentré — préférable à consommer avec de l'eau, surtout s'il fait chaud."
        />
        <p>
          La gomme de guar donne au mélange sa texture de gel. Je préfère une texture relativement fluide, proche
          d&apos;un sirop épais, plutôt qu&apos;une pâte — plus agréable après plusieurs heures d&apos;effort, quand la
          bouche devient sèche, la salivation diminue et la mastication devient difficile.
        </p>
        <Recette
          titre="Pour 4 gels de 100 ml"
          lignes={[
            ["Maltodextrine", "160 g"],
            ["Fructose", "80 g"],
            ["Gomme de guar", "1,6 g"],
            ["Jus de citron", "~20 ml"],
          ]}
        />
        <ol className="list-decimal space-y-1 pl-6 text-sm marker:font-semibold marker:text-toac-pink-600">
          <li>Faire chauffer 200–250 ml d&apos;eau, ajouter progressivement malto + fructose, mélanger jusqu&apos;à dissolution.</li>
          <li>Ajouter citron et sel.</li>
          <li>Ajouter la gomme de guar progressivement, en fouettant.</li>
          <li>Attendre 5–10 minutes, vérifier la texture, ajuster avec un peu d&apos;eau si nécessaire.</li>
          <li>Remplir les flacons à la seringue alimentaire, tapoter pour faire remonter les bulles, fermer.</li>
        </ol>
        <p>
          La gomme de guar continue à épaissir pendant quelques minutes : mieux vaut attendre avant d&apos;en
          rajouter. J&apos;utilise des{" "}
          <a href="https://amzn.eu/d/0dGqgEda" target="_blank" rel="noopener noreferrer" className="text-toac-pink-600 underline">
            flacons souples de 100 ml type voyage
          </a>
          , avec une ouverture assez large pour faciliter remplissage et nettoyage.
        </p>
        <Encadre tag="Conservation" attention>
          Je préfère préparer de petites séries plutôt que stocker des dizaines de gels. Au réfrigérateur, dans des
          flacons propres et fermés : utilisation rapide, idéalement dans la semaine. Si l&apos;aspect, l&apos;odeur
          ou le goût changent : poubelle. Un gel maison n&apos;a pas le contrôle microbiologique d&apos;un gel
          industriel.
        </Encadre>
      </Section>

      <Section id="logistique" numero="IV" titre="Stocker les poudres">
        <p>
          Pour les grosses sorties, je prépare à l&apos;avance des doses sèches (maltodextrine, fructose,
          éventuellement sel), et j&apos;ajoute simplement l&apos;eau le jour J. Les <strong>sachets ziplock</strong>{" "}
          sont particulièrement pratiques : un sachet = une recharge de bidon. On peut alors s&apos;arrêter à un café,
          une fontaine ou un point d&apos;eau, remplir le bidon et verser la dose.
        </p>
      </Section>

      <Section id="recup" numero="V" titre="Récupération après une grosse sortie">
        <p>Après un gros entraînement ou une course, j&apos;utilise une combinaison protéines + glucides.</p>
        <Recette
          titre="Shaker de récupération (500 ml)"
          lignes={[
            ["Whey", "30 g"],
            ["Maltodextrine", "60 g"],
            ["Eau", "qs"],
          ]}
          pied="Si je sais que je ne pourrai pas manger rapidement, j'augmente l'apport en glucides."
        />
        <p>
          Les protéines apportent les acides aminés nécessaires à la réparation musculaire ; les glucides permettent
          de reconstituer les réserves de glycogène. J&apos;aime prendre mon shaker dans les 30 minutes suivant
          l&apos;arrivée quand c&apos;est possible — mais la fenêtre des 30 minutes n&apos;est pas une porte qui se
          ferme : si on ne peut pas manger immédiatement, l&apos;essentiel reste d&apos;avoir un apport suffisant sur
          les heures qui suivent.
        </p>
      </Section>

      <Section id="materiel" numero="VI" titre="Matériel et fournisseurs">
        <ul className="divide-y divide-toac-gray-200 text-sm">
          {MATERIEL.map((m) => (
            <li key={m.quoi} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
              <span className="font-semibold text-toac-blue-950">{m.quoi}</span>
              {m.href ? (
                <a href={m.href} target="_blank" rel="noopener noreferrer" className="text-toac-pink-600 underline">
                  {m.ou}
                </a>
              ) : (
                <span className="text-toac-blue-900/70">{m.ou}</span>
              )}
            </li>
          ))}
        </ul>
        <p>
          L&apos;intérêt de cette approche est de dissocier les matières premières, la recette et le contenant —
          plutôt que d&apos;acheter systématiquement des produits sportifs individuels.
        </p>
      </Section>

      <Section id="pourquoi" numero="VII" titre="Pourquoi faire soi-même ?">
        <p>
          Ce n&apos;est pas forcément meilleur qu&apos;un produit du commerce. Les avantages pour moi : le{" "}
          <strong>prix</strong> (matières premières en gros bien moins chères) ; la <strong>personnalisation</strong>{" "}
          (ratio, concentration, goût, sel, texture) ; la <strong>logistique</strong> (je prépare exactement ce dont
          j&apos;ai besoin) ; et l&apos;<strong>adaptation aux longues distances</strong> (des sachets calibrés pour
          une sortie de 8 ou 10 h).
        </p>
      </Section>

      <Section id="longue-distance" numero="VIII" titre="Longue distance : quand la nutrition devient limitante">
        <p>
          Sur une sortie de 1h30 ou 2h, la stratégie reste simple. Sur une épreuve de <strong>8–15 h</strong>, la
          question change complètement : ce n&apos;est plus « combien de glucides puis-je absorber ? » mais « serai-je
          encore capable de manger et de digérer après 8, 10 ou 12 heures ? ».
        </p>
        <h3 className="pt-2 font-semibold text-toac-blue-950">Pourquoi la digestion se complique</h3>
        <p>
          Pendant un effort intense, l&apos;organisme priorise muscles, cœur, respiration, régulation thermique et
          pression artérielle — le système digestif passe au second plan, avec moins de débit sanguin disponible.
          Déshydratation, chaleur, intensité, fatigue et accumulation de glucides dans l&apos;intestin s&apos;ajoutent
          avec la durée. On peut parfaitement tolérer 70 g/h pendant 3 h et commencer à avoir du mal à manger à la
          8ᵉ heure — sans que ce soit un signe de « mauvais estomac ».
        </p>
        <h3 className="pt-2 font-semibold text-toac-blue-950">Mon retour d&apos;expérience</h3>
        <p>
          J&apos;atteins 60 g/h sans problème digestif particulier, et probablement 70–80 g/h — ma limite actuelle
          au-delà de 5 h. Mais après 3–4 h, surtout au-delà de 30 °C, un autre problème apparaît avant même la
          digestion : <strong>la mastication devient difficile</strong>. La bouche s&apos;assèche, la salive diminue,
          et une barre type Clif devient beaucoup moins agréable à manger.
        </p>
        <Encadre tag="Validé sur le terrain — Ascend Xtri, 25/07/2026">
          Triathlon XXL dans les Pyrénées (3,8 km nat / 180 km vélo, 5000 m D+ / 42 km CAP, 2800 m D+). La stratégie
          nutrition s&apos;est globalement bien passée sur toute la course. Le seul point noir : les barres, difficiles
          à mâcher au bout de 2–3h — exactement le problème de mastication décrit ci-dessus, et un argument de plus
          pour basculer tôt vers le semi-liquide et le liquide.
        </Encadre>
        <h3 className="pt-2 font-semibold text-toac-blue-950">Solide → semi-liquide → liquide</h3>
        <p>C&apos;est pourquoi je préfère passer progressivement d&apos;une forme à l&apos;autre au fil de la course.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ETAPES_COURSE.map((e) => (
            <div key={e.nom} className="rounded-lg border border-toac-gray-200 bg-white p-3 text-sm shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-toac-pink-600">{e.nom}</h4>
              <ul className="mt-2 list-disc pl-4">
                {e.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="pt-2 font-semibold text-toac-blue-950">Multiplier les formes de glucides</h3>
        <p>
          Je ne cherche pas à faire 10 heures avec uniquement des gels — mauvaise stratégie pour moi. Je préfère
          plusieurs solutions qui apportent toutes des glucides :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Aliment</th>
                <th className={th}>Avantage</th>
              </tr>
            </thead>
            <tbody>
              {FORMES_GLUCIDES.map((f) => (
                <tr key={f.aliment}>
                  <td className={td}>{f.aliment}</td>
                  <td className={td}>{f.avantage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Sur 8–10 h de vélo, je vise environ 60–80 g/h selon l&apos;intensité, la chaleur et ma tolérance — sans
          chercher à répéter exactement la même chose chaque heure : la cible est le total de glucides sur
          l&apos;heure, pas une recette identique pendant 10 heures.
        </p>
        <h3 className="pt-2 font-semibold text-toac-blue-950">Plusieurs plans B</h3>
        <p>
          Pour une épreuve très longue, je pense qu&apos;il faut préparer plusieurs solutions de repli. Si après 8h
          « je ne peux plus avaler mes barres », ce n&apos;est pas grave si j&apos;ai des gels, des compotes, de la
          boisson et des bananes aux ravitaillements. Si les gels commencent à écœurer : boisson + compote + banane.
          Si le goût sucré devient difficile : aliment salé ou banane. La stratégie doit rester assez flexible pour
          continuer à nourrir l&apos;effort même quand les préférences changent.
        </p>
      </Section>

      <Section id="resume" numero="IX" titre="En résumé">
        <ol className="grid gap-3 sm:grid-cols-2">
          {PRINCIPES.map((p, i) => (
            <li key={p} className="rounded-lg border border-toac-gray-200 bg-white p-4 text-sm shadow-sm">
              <span className="block font-display text-toac-pink-600">{String(i + 1).padStart(2, "0")}</span>
              {p}
            </li>
          ))}
        </ol>
        <p className="border-y border-toac-gray-200 py-6 font-display text-xl uppercase text-toac-blue-950">
          Sur 2 heures, il faut penser à manger.
          <br />
          Sur 10 heures, il faut penser à <span className="text-toac-pink-600">pouvoir continuer</span> à manger.
        </p>
      </Section>

      <p className="mt-10 text-xs text-toac-blue-900/50">
        Julien · REX nutrition club · dernière mise à jour après l&apos;Ascend Xtri, septembre 2026
      </p>
    </div>
  );
}
