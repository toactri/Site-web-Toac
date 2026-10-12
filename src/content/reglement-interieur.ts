// Contenu par défaut du règlement intérieur, utilisé pour :
// 1) l'affichage tant qu'aucun bloc CMS n'existe pour cette page ;
// 2) l'amorçage automatique des blocs CMS (voir EnsureCmsBlocks sur la
//    page) — chaque entrée devient un bloc "à emplacement fixe" (slot)
//    modifiable, ajoutable et supprimable depuis Dashboard → Pages, sans
//    intervention développeur.
export type ReglementArticle = {
  slot: string;
  heading: string;
  body: string;
};

export const REGLEMENT_PREAMBULE: ReglementArticle = {
  slot: "preambule",
  heading: "Préambule",
  body: `Le TOAC Triathlon est une association sportive affiliée à la Fédération Française de Triathlon (FFTri). Au-delà de la pratique sportive, le club a pour vocation de développer un esprit de convivialité, d'entraide et de respect, en permettant à chacun de progresser dans les meilleures conditions, quel que soit son niveau ou ses objectifs.

Le présent règlement intérieur complète les statuts de l'association. Il précise les règles de fonctionnement du club ainsi que les droits et obligations de chacun.

Toute adhésion au TOAC Triathlon implique l'acceptation sans réserve des statuts et du présent règlement intérieur.`,
};

export const REGLEMENT_ARTICLES: ReglementArticle[] = [
  {
    slot: "article-1",
    heading: "Article 1 – Objet du règlement intérieur",
    body: `Le présent règlement a pour objet de définir les modalités de fonctionnement du TOAC Triathlon. Il précise notamment :
- les conditions d'adhésion au club ;
- les règles de participation aux entraînements et aux activités proposées ;
- les droits et devoirs des adhérents ;
- les modalités de participation à la vie associative ;
- les règles permettant de garantir la sécurité, le respect et la convivialité au sein du club.

Les modalités pratiques d'organisation (créneaux d'entraînement, composition des groupes, calendrier des événements, montants, etc.) sont précisées chaque saison en annexe par le Bureau ou le Conseil d'Administration, sans nécessiter une modification du présent règlement.`,
  },
  {
    slot: "article-2",
    heading: "Article 2 – Adhésion au club",
    body: `L'adhésion au TOAC Triathlon est valable jusqu'au 31/08 de l'année suivante.

Elle devient effective après :
- la pré-inscription incluant l'acceptation du règlement intérieur du club ;
- la validation de la licence FFTri ;
- le paiement sur la plateforme FFTri des éléments suivants : la licence FFTri, la formule d'assurance, et la part club — montant calculé en fonction du profil de l'adhérent et incluant la cotisation au club (tarif réduit pour les étudiants, demandeurs d'emploi, ayant-droit Airbus Opérations), le dépôt de garantie bénévolat (en cas de nouvelle adhésion — voir Article 8 et Annexe 2), et la trifonction officielle du club (en cas de nouvelle adhésion — modèle d'entrée de gamme).

Les modalités d'essayage et de remise de la trifonction sont communiquées au cours de la saison. Les adhérents qui souhaitent un modèle plus haut de gamme peuvent l'indiquer après les essayages et régler le complément correspondant.

L'adhésion donne notamment accès :
- aux entraînements proposés par le club selon les modalités définies chaque saison ;
- à l'encadrement assuré par les entraîneurs et intervenants du club ;
- aux événements sportifs et conviviaux organisés par l'association ;
- aux informations et services proposés aux adhérents.`,
  },
  {
    slot: "article-3",
    heading: "Article 3 – Les valeurs du TOAC Triathlon",
    body: `Le TOAC Triathlon est avant tout un club associatif. Son fonctionnement repose sur l'implication de ses bénévoles et sur la participation de chacun à la vie du club.

Chaque adhérent contribue, à son niveau, à faire vivre les valeurs de l'association :
- le respect des personnes ;
- la convivialité ;
- la solidarité ;
- l'entraide ;
- le fair-play ;
- le dépassement de soi ;
- la bienveillance.

Les entraînements, les compétitions et les événements organisés par le club doivent rester des moments de plaisir, de partage et de progression. Chaque adhérent est invité à participer à la vie du club, tant lors des activités sportives que des événements associatifs.`,
  },
  {
    slot: "article-4",
    heading: "Article 4 – Respect des personnes et comportement attendu",
    body: `Chaque adhérent s'engage à adopter en toute circonstance un comportement respectueux envers :
- les autres adhérents ;
- les entraîneurs ;
- les bénévoles ;
- les arbitres ;
- les partenaires ;
- les représentants du club ;
- les salariés et agents des équipements sportifs utilisés.

Les comportements suivants sont incompatibles avec les valeurs du club :
- les propos injurieux ou diffamatoires ;
- les comportements agressifs ou intimidants ;
- toute forme de discrimination ou de harcèlement ;
- les atteintes volontaires à l'image ou au bon fonctionnement de l'association ;
- tout comportement portant préjudice à la sécurité ou à la convivialité du groupe.

Chaque adhérent est également tenu de respecter le matériel mis à disposition ainsi que les installations utilisées par le club.`,
  },
  {
    slot: "article-5",
    heading: "Article 5 – Communication avec les adhérents",
    body: `Les informations relatives à la vie du club sont diffusées principalement par courrier électronique et/ou via les outils numériques utilisés par le TOAC Triathlon.

Chaque adhérent s'engage à maintenir ses coordonnées à jour et à consulter régulièrement ces supports afin de prendre connaissance des informations importantes concernant :
- les entraînements ;
- les événements du club ;
- les compétitions ;
- les convocations ;
- les évolutions du fonctionnement de l'association.

L'absence de consultation de ces supports ne saurait exonérer un adhérent du respect des informations qui y sont diffusées.`,
  },
  {
    slot: "article-6",
    heading: "Article 6 – Les entraînements et modalités d'inscription",
    body: `Le TOAC Triathlon propose des entraînements dans les différentes disciplines du triathlon selon les créneaux définis chaque saison.

Les horaires, lieux, groupes d'entraînement et modalités d'organisation sont communiqués aux adhérents en début de saison et peuvent être adaptés en cours d'année en fonction des contraintes d'organisation ou de disponibilité des infrastructures.

Les adhérents s'engagent à :
- respecter les horaires des entraînements ;
- appliquer les consignes données par les entraîneurs et les responsables de séance ;
- adopter une attitude respectueuse envers l'ensemble des participants ;
- utiliser le matériel et les installations avec soin.

Pour des raisons de sécurité ou d'organisation, le club peut limiter le nombre de participants sur certains entraînements et mettre en place une inscription préalable obligatoire sur certains créneaux.

Lorsqu'une inscription préalable est requise, l'adhérent s'engage à respecter les modalités communiquées par le club et à se désinscrire dès que possible en cas d'empêchement, afin de permettre à un autre membre de bénéficier de la place disponible.

Les absences répétées sans désinscription préalable (« no-shows ») pourront entraîner une suspension temporaire de l'accès aux créneaux concernés, selon les modalités précisées chaque saison en annexe par discipline (cf. Annexe 1 pour la natation).`,
  },
  {
    slot: "article-7",
    heading: "Article 7 – Organisation des entraînements de natation",
    body: `Les créneaux de natation constituent une ressource limitée dont l'utilisation doit permettre à chacun de s'entraîner dans les meilleures conditions de sécurité et de progression.

Afin d'assurer un fonctionnement équilibré, le Bureau peut mettre en place, selon les besoins :
- des groupes de niveau établis à partir de tests chronométriques ou de l'observation des entraîneurs ;
- des limitations du nombre de nageurs sur certains créneaux, selon la configuration des bassins utilisés ;
- un système d'inscription préalable aux séances ;
- des règles de priorité d'accès à certains créneaux ;
- toute autre mesure destinée à améliorer la sécurité, la qualité des entraînements ou le confort des adhérents.

Les modalités pratiques (créneaux, composition des groupes, capacités d'accueil, règles d'inscription et sanctions applicables en cas d'absence non signalée) sont précisées chaque saison en Annexe 1 du présent règlement et peuvent être adaptées en cours d'année par le Bureau.

Les adhérents s'engagent à respecter ces modalités.`,
  },
  {
    slot: "article-8",
    heading: "Article 8 – Engagement bénévole",
    body: `Le TOAC Triathlon organise chaque année les Triathlons du Lauragais, un événement majeur de la vie du club qui mobilise plus de 200 bénévoles.

En adhérant au club, chaque membre s'engage à participer au minimum une journée par saison à la vie de l'association, idéalement lors du week-end des Triathlons du Lauragais.

Le club encourage naturellement toute aide apportée en amont ou après les Triathlons du Lauragais. Toutefois, le besoin en bénévoles est particulièrement important pendant le déroulement de l'événement lui-même : les adhérents sont donc invités à privilégier leur participation durant ce week-end.

En cas d'empêchement exceptionnel (contraintes professionnelles, familiales, médicales ou toute autre situation jugée légitime par le Bureau), une autre journée de bénévolat pourra être proposée d'un commun accord. En revanche, la participation à une autre manifestation sportive organisée le même week-end ne constitue pas, à elle seule, un motif justifiant cette dérogation.

Afin de garantir cet engagement, un dépôt de garantie est demandé à chaque adhérent lors de sa première adhésion. Son montant, ses modalités de conservation et de remboursement, ainsi que les conséquences du non-respect de l'engagement bénévole, sont précisés en Annexe 2 du présent règlement.`,
  },
  {
    slot: "article-9",
    heading: "Article 9 – Participation à la vie du club",
    body: `Le TOAC Triathlon est une association reposant en grande partie sur l'engagement de ses bénévoles.

Au-delà de la pratique sportive, chaque adhérent est invité à contribuer, selon ses disponibilités et ses compétences, à la vie de l'association. Cette participation peut notamment prendre la forme :
- d'une aide lors des événements organisés par le club ;
- d'une participation à l'organisation des compétitions ;
- d'un soutien logistique ;
- d'une implication dans les actions de communication ;
- de l'encadrement ou de l'animation d'activités ;
- de toute autre contribution utile au fonctionnement de l'association.`,
  },
  {
    slot: "article-10",
    heading: "Article 10 – Matériel et installations",
    body: `Chaque adhérent est responsable du matériel personnel qu'il utilise lors des entraînements et des compétitions. Il lui appartient de vérifier régulièrement l'état de son matériel afin de garantir sa sécurité ainsi que celle des autres participants.

Chaque adhérent s'engage également à respecter :
- le matériel appartenant au club ;
- le matériel prêté par les partenaires ;
- les installations sportives et les locaux mis à disposition lors des entraînements et événements.

Lorsqu'un équipement est mis à disposition par le club, les adhérents s'engagent à l'utiliser conformément à sa destination et à en prendre soin.

Toute dégradation volontaire ou résultant d'une utilisation manifestement inappropriée pourra donner lieu à une demande de réparation financière et/ou à une sanction disciplinaire (cf. Article 16).`,
  },
  {
    slot: "article-11",
    heading: "Article 11 – Sécurité",
    body: `La sécurité constitue une priorité pour le TOAC Triathlon.

Chaque adhérent est responsable de sa propre sécurité ainsi que de son comportement lors des entraînements et activités organisés par le club. Il s'engage notamment à :
- respecter le Code de la route lors des sorties cyclistes ;
- porter les équipements de sécurité adaptés à chaque discipline (casque obligatoire à vélo notamment) ;
- appliquer les consignes données par les entraîneurs et les responsables de séance ;
- signaler toute situation présentant un risque pour les personnes ou les biens.

Le club se réserve le droit d'interdire l'accès à une séance à toute personne dont le comportement mettrait en danger sa sécurité ou celle des autres.`,
  },
  {
    slot: "article-12",
    heading: "Article 12 – Droit à l'image",
    body: `Dans le cadre des activités du club, des photographies ou vidéos peuvent être réalisées afin d'illustrer les supports de communication du TOAC Triathlon.

L'autorisation d'utilisation de l'image est recueillie lors de la demande d'adhésion.

Chaque adhérent peut demander à tout moment le retrait d'une photographie le concernant, dans la mesure où cela reste techniquement possible.

Le club s'engage à utiliser ces images dans le respect des personnes et exclusivement dans le cadre de ses activités.`,
  },
  {
    slot: "article-13",
    heading: "Article 13 – Protection des données personnelles",
    body: `Dans le cadre de la gestion de ses adhérents et de son fonctionnement associatif, le TOAC Triathlon est amené à collecter et à traiter des données à caractère personnel (identité, coordonnées, informations relatives à la licence FFTri, etc.).

Ce traitement est effectué conformément au Règlement (UE) 2016/679 du 27 avril 2016 (« RGPD ») et à la loi n° 78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés.

**Finalités du traitement**
Les données collectées sont utilisées exclusivement aux fins suivantes :
- gestion administrative des adhésions et des licences ;
- organisation des entraînements et des événements du club ;
- communication avec les adhérents ;
- respect des obligations légales et réglementaires applicables à l'association.

**Destinataires**
Les données sont destinées aux membres du Bureau et du Conseil d'Administration en charge de la gestion du club, ainsi qu'à la FFTri dans le cadre de la délivrance de la licence. Elles ne sont ni cédées ni vendues à des tiers à des fins commerciales.

**Durée de conservation**
Les données sont conservées pendant la durée de l'adhésion, augmentée de la durée nécessaire au respect des obligations légales et comptables de l'association.

**Droits des adhérents**
Conformément à la réglementation applicable, chaque adhérent dispose d'un droit d'accès, de rectification, d'effacement et de limitation du traitement de ses données, ainsi que d'un droit d'opposition pour motif légitime. Ces droits peuvent être exercés par écrit auprès du Bureau du TOAC Triathlon, via le [formulaire de contact](/contact) du site.

En cas de difficulté, l'adhérent dispose également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL).`,
  },
  {
    slot: "article-14",
    heading: "Article 14 – Assurances",
    body: `Chaque adhérent du TOAC Triathlon est titulaire d'une licence délivrée par la Fédération Française de Triathlon (FFTri), condition indispensable à son adhésion (cf. Article 2).

À ce titre, il bénéficie du programme d'assurances souscrit par la FFTri auprès de la MAIF, par l'intermédiaire du courtier AIAC, dans le cadre des dispositions des articles L. 321-1, L. 321-4, L. 321-5 et L. 321-6 du Code du sport. Ce programme répond aux obligations d'assurance de responsabilité civile et d'information relative aux accidents corporels que peuvent subir les adhérents licenciés.

Lors de la prise de sa licence, chaque adhérent choisit lui-même, sous sa propre responsabilité, le niveau de garantie individuelle accident correspondant à sa pratique et à ses besoins, parmi les options proposées par la FFTri. Le TOAC Triathlon n'intervient pas dans ce choix et invite chaque adhérent à consulter attentivement les notices d'assurance en vigueur avant de valider sa licence, disponibles à l'adresse suivante : [fftri.com/assurance-2026-notices-dassurance](https://www.fftri.com/assurance-2026-notices-dassurance/).`,
  },
  {
    slot: "article-15",
    heading: "Article 15 – Démission et retrait volontaire",
    body: `Tout adhérent souhaitant quitter le club en cours de saison en informe le Bureau par écrit dans les meilleurs délais.

Sauf décision exceptionnelle du Bureau, aucun remboursement de cotisation, même partiel ou au prorata, n'est effectué en cas de départ en cours de saison.

Le départ en cours de saison ne dispense pas l'adhérent de son engagement bénévole au titre de la saison en cours (cf. Article 8), sauf dérogation accordée par le Bureau en cas de situation exceptionnelle (mobilité professionnelle imposée, déménagement contraint, motif médical ou familial grave, ou toute autre situation jugée légitime).

Le sort du dépôt de garantie en cas de départ est précisé en Annexe 2 du présent règlement.`,
  },
  {
    slot: "article-16",
    heading: "Article 16 – Procédure disciplinaire",
    body: `Tout manquement aux statuts, au présent règlement intérieur ou aux décisions régulièrement prises par les instances dirigeantes du club peut donner lieu à une procédure disciplinaire.

Selon la gravité des faits, les mesures suivantes pourront être envisagées :
- un rappel des règles ;
- un avertissement écrit ;
- une suspension temporaire de certaines activités du club ;
- une proposition de radiation conformément aux statuts de l'association.

Avant toute décision susceptible d'entraîner une sanction, l'adhérent concerné est invité à présenter ses observations, conformément aux dispositions prévues par les statuts.`,
  },
  {
    slot: "article-17",
    heading: "Article 17 – Application du règlement intérieur",
    body: `Le présent règlement intérieur est adopté par le Conseil d'Administration du TOAC Triathlon.

Il est communiqué à chaque adhérent lors de sa demande d'adhésion.

Toute adhésion au club vaut acceptation pleine et entière du présent règlement.

Le Bureau est chargé de son application et peut préciser, lorsque cela est nécessaire, les modalités pratiques de fonctionnement du club, dans le respect des statuts et du présent règlement intérieur.`,
  },
  {
    slot: "annexe-1",
    heading: "Annexe 1 – Organisation des entraînements de natation",
    body: `Cette annexe précise chaque saison les modalités pratiques d'application de l'Article 7 et de l'Article 6. Elle peut être mise à jour par le Bureau sans modification du règlement intérieur en cours d'année et selon les besoins opérationnels afin de garantir le bon fonctionnement des activités.

**1. Créneaux actuels**
| Jour | Horaire | Lignes d'eau | Bassin | Nageurs max/ligne | Capacité maximum |
| --- | --- | --- | --- | --- | --- |
| Lundi | 7h00 | 4 lignes | 25 m | 8 | 32 |
| Mardi | 21h00 | 3 lignes | 50 m | 12 | 36 |
| Jeudi | 7h00 | 3 lignes | 25 m | 8 | 24 |
| Vendredi | 7h00 | 5 lignes (partagées avec le TOAC Natation) | 25 m | 6 | 30 |

**2. Évolutions prévues à compter de la rentrée 2026/2027**
- Tests chronométriques sur 400 m, organisés deux fois par saison (un en septembre, un en janvier) ; possibilité pour l'adhérent d'effectuer le test chronométrique de son côté et de fournir le chrono au club ensuite.
- Constitution de 4 groupes de niveau (groupes 1 à 4), établis en fonction de la vitesse de nage de chaque adhérent.
- Inscription obligatoire aux séances via l'outil IDO (suivi par Damien).
- Si le nombre de nageurs présents est supérieur à la capacité maximum définie, les nageurs non inscrits seront priés de quitter le bassin.
- Règle d'assiduité : toute absence à 2 séances sans désinscription préalable (« no-show ») entraîne une suspension temporaire de l'accès au créneau concerné pendant 2 semaines.
- Toute désinscription doit être effectuée 24h avant le début de la séance, sinon elle sera considérée comme un no-show.
- Alternance des groupes sur les créneaux à capacité limitée : les groupes 1 et 2 s'entraînent les semaines paires, les groupes 3 et 4 les semaines impaires. Pour la saison 2026-2027, cette alternance va être mise en place sur la séance du jeudi.

Ces modalités sont précisées et mises à jour chaque saison par le Bureau, sans qu'une modification du règlement intérieur ne soit nécessaire.`,
  },
  {
    slot: "annexe-2",
    heading: "Annexe 2 – Engagement bénévole et dépôt de garantie",
    body: `Cette annexe précise chaque saison les modalités pratiques d'application de l'Article 8 et de l'Article 15. Elle peut être mise à jour par le Bureau sans modification du règlement intérieur.

**1. Montant du dépôt de garantie**
Le montant du dépôt de garantie est fixé chaque saison par le Conseil d'Administration. Pour la saison 2026/2027 : 100 €.

**2. Fonctionnement**
- Le dépôt de garantie est versé lors de la première adhésion au club et intégré à la cotisation.
- Il est conservé par le club tant que l'adhérent reste membre et respecte son engagement bénévole (cf. Article 8).
- Il n'est pas demandé lors des renouvellements, sauf dans le cas prévu au paragraphe 3 ci-dessous.
- Il est remboursé uniquement en cas de départ définitif du club, et sous réserve que l'engagement bénévole de la dernière saison ait été respecté.
- En cas de départ volontaire en cours de saison sans motif exceptionnel reconnu par le Bureau (cf. Article 15), le dépôt de garantie n'est pas remboursé.

**3. Sanction en cas de non-respect de l'engagement bénévole**
Un adhérent qui n'a pas honoré son engagement bénévole sur une saison, sans motif légitime reconnu par le Bureau, fait l'objet d'une sanction financière : le dépôt de garantie n'est pas remboursé et est considéré comme définitivement acquis au club.

Si cet adhérent souhaite renouveler son adhésion la saison suivante, il est alors considéré comme un nouvel adhérent à la fois concernant la date de traitement de sa demande de licence et au regard du dépôt de garantie : un nouveau dépôt lui est demandé, dans les mêmes conditions qu'une première adhésion.`,
  },
];
