# Site web du TOAC Triathlon

Refonte complète du site du TOAC Triathlon (Toulouse), avec Next.js (App Router) + Tailwind CSS,
et un espace adhérents protégé côté serveur.

## 1. Lancer le projet en local

```bash
npm install
cp .env.example .env.local   # puis renseignez au moins SESSION_SECRET (voir plus bas)
npm run dev
```

Le site est disponible sur http://localhost:3000.

Générer un `SESSION_SECRET` aléatoire :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Compte de démonstration (espace adhérents)

Tant que vous n'avez pas importé vos propres comptes (voir § 4), deux comptes de démo sont disponibles
(définis dans `src/data/accounts.sample.json`, données factices) :

| Identifiant | Mot de passe      | Rôle   |
| ----------- | ----------------- | ------ |
| `demo`      | `toac-demo-2026`  | membre |
| `bureau`    | `toac-admin-2026` | admin (vue bureau, tous les dossiers) |

⚠️ Changez ces mots de passe / remplacez ces comptes avant la mise en production.

## 2. Déployer sur Vercel

1. Poussez ce dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com), importez le dépôt (le framework Next.js est détecté automatiquement).
3. Dans **Settings → Environment Variables**, renseignez toutes les variables listées dans `.env.example`
   (`SESSION_SECRET`, et éventuellement `BREVO_API_KEY` / `BREVO_FROM_EMAIL`).
4. Déployez. Le plan gratuit ("Hobby") de Vercel suffit pour ce site.

Aucune donnée adhérent n'est stockée dans le dépôt : elles vivent dans la base Postgres (§ 4 et § 5bis).

## 3. Remplacer les placeholders

| Placeholder | Emplacement | Action |
| --- | --- | --- |
| ~~`LOGO_TOAC`~~ | `public/logo-toac.png` | ✅ Fait — logo officiel intégré dans la Navbar et le Footer. |
| Photos (📷) | `src/components/ImagePlaceholder.tsx`, utilisé sur toutes les pages | Remplacer chaque `<ImagePlaceholder>` par un `<Image>` `next/image` pointant vers les vraies photos du club. |
| `URL_INSCRIPTION_TDL` | `src/app/triathlons-du-lauragais/page.tsx` (lien "S'inscrire à la course") | Remplacer le `href="#"` par l'URL d'inscription officielle. |
| `LIEN_COMMANDE_TENUES` | `src/app/le-club/vie-du-club/page.tsx` | Remplacer par le lien réel de commande des tenues. |
| Documents PDF | `src/app/espace-adherents/documents/page.tsx` | Remplacer les `href="#"` par les vrais fichiers (à héberger dans `public/documents/` par ex.). |
| Coordonnées des lieux | `src/content/lieux.ts` | Les latitudes/longitudes sont des approximations ; à vérifier/ajuster précisément si besoin. |
| `DATABASE_URL` | `.env` (Vercel ou local) | Voir § 5bis. |
| `BREVO_API_KEY` | `.env` | Voir § 6. |

## 4. Adhérents et connexion à l'espace adhérents

Les adhérents de la saison vivent dans la table `adherents_saison`, alimentée par l'import de l'onglet
« Dossiers adhésion » du Google Sheets dans **Espace Adhérents → Bureau → Imports** (un import
remplace toute la saison). Cette table sert à la fois à la vue bureau (liste et indicateurs), aux
attestations de paiement, au suivi musculation et à la page **Suivi de mon dossier** de chaque adhérent.

### Connexion des adhérents : par email, sans compte

Aucun compte à créer : l'adhérent saisit sur `/connexion` l'email utilisé pour son adhésion et reçoit un
lien + un code à 6 chiffres (15 min, usage unique, envoyés par Brevo). S'il ne sait plus quelle adresse il a
donnée, il se fait reconnaître par nom, prénom et date de naissance : l'email part vers l'adresse de son
dossier, affichée masquée. Un adhérent absent de la saison la plus récente ne peut plus se connecter.

Les rôles **bureau** (vue bureau) et **coach** s'attribuent sur le site, dans **Bureau → Rôles et accès**
(super-administrateur uniquement) : un email et, pour une personne qui n'est pas adhérente, son nom. Ces
personnes se connectent de la même façon, adhérentes ou non. Les rôles sont relus à chaque page : un retrait
coupe l'accès immédiatement, un ajout s'applique sans reconnexion. L'ancienne variable `ADMIN_EMAILS` est
reprise une seule fois dans la base puis ignorée. Le compte `ADMIN_USERNAME` / `ADMIN_PASSWORD` reste disponible en secours (lien « Accès bureau
par identifiant » de la page de connexion).

Les adresses de `SUPER_ADMIN_EMAILS` ont en plus accès aux réglages sensibles de **Bureau → Imports** :
l'import de la liste des adhérents, l'import des réponses « coups de main » et le trésorier signataire avec sa
signature. Les autres membres du bureau voient la page sans les formulaires, et les routes correspondantes (ainsi que l'image de
signature) leur répondent « accès refusé ». Une adresse super-administrateur a toujours accès à la vue bureau
et gère les rôles ; le compte `ADMIN_USERNAME` n'est jamais super-administrateur.

### Comptes locaux (développement)

`npm run accounts -- list|add|passwd|remove` gère `src/data/accounts.json` (ignoré par git, absent en
production) ; `src/data/accounts.sample.json` contient des comptes de démo factices.

## 5. Paiement en ligne (retiré)

Le parcours d'adhésion + paiement Monetico a été retiré du site en octobre 2026 : l'inscription passe par
un Google Form et le paiement par l'espace FFTRI. Le code complet reste récupérable dans l'historique git
(commit `c2b5880`, dernier état avant suppression) ; voir aussi le document d'archive « Paiement en ligne —
archive 2026 et réflexion 2027 ».

### Justificatif tarif réduit (Vercel Blob)

Le fichier uploadé (carte étudiant, attestation Pôle emploi, badge Airbus…) est stocké sur Vercel Blob et
lié au dossier adhérent.

1. Dans votre projet Vercel → onglet **Storage** → **Create Database** → **Blob** (offre gratuite).
2. Vercel ajoute automatiquement `BLOB_READ_WRITE_TOKEN` à votre projet.

Sans cette variable, le formulaire fonctionne quand même : le justificatif n'est simplement pas conservé
(seule la case "tarif réduit demandé" est enregistrée).

## 5bis. Base de données — commandes, adhésions & dossiers

Le site enregistre automatiquement, dans une vraie base de données, ce qui demandait auparavant une
manipulation manuelle :

- **Les commandes Monetico** : à chaque paiement, Monetico notifie le site en arrière-plan
  (`/api/monetico/retour`) ; cette notification est désormais enregistrée dans une table `commandes`
  au lieu de simplement être journalisée. Fini le fichier Excel à ouvrir/copier-coller depuis l'email
  Monetico : tout est consultable dans **Espace Adhérents → Bureau → Commandes Monetico**.
- **Les demandes d'adhésion** : la page **Nous rejoindre** propose désormais un formulaire d'adhésion
  directement sur le site (à la place du Google Form externe). Chaque envoi est enregistré dans une
  table `inscriptions`, consultable dans **Espace Adhérents → Bureau → Demandes d'adhésion**.
- **Les adhérents de la saison** : table `adherents_saison`, alimentée par l'import du Google Sheets
  (§ 4), consultable dans **Espace Adhérents → Bureau**.

### Mise en place (5 minutes, gratuit)

1. Sur [vercel.com](https://vercel.com), dans votre projet → onglet **Storage** → **Create Database** →
   choisissez un Postgres (Neon, offre gratuite). Vercel y ajoute automatiquement une variable
   `DATABASE_URL` (ou `POSTGRES_URL`) à votre projet.
   - Alternative sans Vercel : créez un projet gratuit sur [neon.tech](https://neon.tech) ou
     [supabase.com](https://supabase.com) et copiez la chaîne de connexion Postgres fournie.
2. Renseignez `DATABASE_URL` dans vos variables d'environnement (Vercel : **Settings → Environment
   Variables** ; en local : `.env.local`).
3. C'est tout : les tables sont créées automatiquement au
   premier appel, aucune migration à lancer à la main.

Tant que `DATABASE_URL` n'est pas configurée, le site continue de fonctionner normalement (paiement,
formulaire d'adhésion), mais les pages **Bureau** affichent un message d'installation au lieu du tableau, et rien n'est
conservé.

## 6. Formulaire de contact (emails)

Sans configuration, les messages du formulaire de contact sont simplement journalisés côté serveur (mode
démo, visible dans les logs Vercel). Pour un envoi réel par email :

1. Dans votre compte [Brevo](https://www.brevo.com), créez une clé API (**SMTP & API → API Keys**).
2. Vérifiez un expéditeur (**Senders, Domains & Dedicated IPs → Senders**) — l'adresse utilisée dans
   `BREVO_FROM_EMAIL` doit être un expéditeur validé, sinon Brevo refuse l'envoi.
3. Renseignez `BREVO_API_KEY` et `BREVO_FROM_EMAIL` dans les variables d'environnement Vercel.

## 6bis. Décharge musculation

La page **Entraînements → Musculation** (`/musculation`) propose un formulaire qui reprend
les champs de la décharge papier du TOAC Omnisports (nom, prénom, adresse, autorisation parentale si
mineur…), avec upload du certificat médical et d'une image de signature.

Parcours :

1. À l'envoi, le serveur génère **un seul PDF** : la décharge papier reconstituée (en-tête logos, champs
   du formulaire, signature uploadée incrustée) en page 1, puis le certificat médical transmis en pages
   suivantes — un certificat en image devient une page, un certificat déjà en PDF voit ses pages
   reprises. Le bloc « autorisation parentale » n'apparaît, dans le formulaire comme dans le PDF, que si
   la date de naissance saisie correspond à une personne de moins de 18 ans (calcul refait côté serveur,
   `src/lib/age.ts`). Ce PDF et le certificat brut sont déposés sur **Vercel Blob** (§ 5 ci-dessus —
   nommage `nom-prenom-decharge.pdf` / `nom-prenom-certif.<ext>`), et un dossier est enregistré en base
   (table `musculation_decharges`, statut `en_attente`).
   L'en-tête vient de `public/images/decharge-entete.png` (voir `public/images/README.txt`) ; si ce
   fichier manque, le PDF sort sans logos plutôt que d'échouer.
2. L'adhérent est redirigé vers une page de relecture (`/musculation/valider/<token>`) qui affiche le PDF
   dans une iframe, puis « Valider ce document ». À la validation le dossier passe au statut `valide`, la
   page confirme l'envoi, et **un email part automatiquement** vers les adresses de
   `MUSCULATION_NOTIFICATION_EMAILS` (séparées par des virgules, via Brevo) avec deux boutons — voir et
   télécharger le document. Un échec d'envoi est journalisé sans faire échouer la validation. Rien n'est
   considéré comme officiellement transmis avant cette confirmation.
3. Le bureau retrouve tous les dossiers (validés ou non) dans **Espace Adhérents → Bureau → Décharges
   musculation** (`/espace-adherents/bureau/musculation`, réservé aux comptes `admin`) : liens pour
   voir/télécharger chaque document, et un bouton pour copier le lien de relecture (utile pour le
   renvoyer à un adhérent, ou le partager avec le responsable du pôle sport).

Variables utilisées : `DATABASE_URL` (§ 5bis) et `BLOB_READ_WRITE_TOKEN` (§ 5), déjà configurées pour le
reste du site, plus `MUSCULATION_NOTIFICATION_EMAILS` et `BREVO_API_KEY` pour la notification par email.
Sans destinataire ou sans clé Brevo, la validation fonctionne et l'envoi est simplement journalisé.

### Accès aux documents : le store Blob est privé

Le store Blob du club est en **accès privé**. Les fichiers y sont déposés avec `access: "private"` et
n'ont **aucune URL publique** : c'est voulu, un certificat médical est une donnée de santé et une URL
publique Vercel Blob reste lisible par quiconque met la main dessus, sans possibilité de révocation.

Conséquences pour le code :

- Les colonnes `decharge_url`, `certificat_url` et `justificatif_url` contiennent désormais un **chemin
  dans le store** (ex. `musculation/dupont-jean-decharge-1234.pdf`), pas une URL. Les noms de colonnes
  datent d'avant et n'ont pas été renommés.
- Les fichiers ne sortent que par **`GET /api/documents?path=<chemin>`**, qui relit le blob côté serveur
  et le renvoie en streaming après contrôle d'accès : compte `admin` connecté, ou `&token=<jeton du
  dossier>` — le jeton de la page de relecture, qui n'ouvre que les deux fichiers de son propre dossier.
- L'accès public/privé est fixé **à la création du store** côté Vercel et n'est pas modifiable ensuite.
  Un `put(..., { access: "public" })` sur ce store échoue avec « Cannot use public access on a private
  store » — c'était la cause de l'échec des premières décharges musculation.

### Si l'upload échoue

Le message « stockage des documents pas encore configuré » ne s'affiche plus que lorsqu'**aucun jeton
Blob n'atteint la fonction** ; toute autre erreur Blob (store privé, jeton invalide, store suspendu…)
est journalisée telle quelle dans les logs Vercel et renvoie « Échec de l'envoi des documents ». Deux
façons de voir l'état réel du serveur, identiques dans leur contenu : les variables réellement
injectées, la plateforme détectée, la branche et le commit servis, et un test d'écriture qui renvoie
l'erreur brute de Vercel Blob.

- **Page** : Espace Adhérents → Bureau → Diagnostic serveur
  (`/espace-adherents/bureau/diagnostic`, comptes `admin` uniquement).
- **JSON, sans compte** : `GET /api/diagnostic?key=<valeur de DIAGNOSTIC_KEY>` (ajoutez `&test=blob`
  pour lancer le test d'écriture). Définissez au préalable `DIAGNOSTIC_KEY` (chaîne aléatoire) dans les
  variables d'environnement du projet, puis redéployez — aucune clé n'est inscrite dans le code, le
  dépôt étant public. **Ce réglage est déjà le premier test** : sans clé valide la route répond `403`
  avec `diagnosticKeyPresent`, qui dit si la variable est arrivée jusqu'à la fonction. Route de
  dépannage temporaire, à supprimer une fois le problème réglé ; elle ne renvoie jamais aucune valeur
  de variable.

Lecture des résultats :

- **Plateforme détectée ≠ Vercel** → le domaine ne pointe pas vers le projet Vercel : les variables
  Vercel ne seront jamais injectées.
- **Toutes les variables absentes** (`DATABASE_URL`, `MONETICO_*`… autant que `BLOB_READ_WRITE_TOKEN`)
  → le problème n'est pas propre au stockage : c'est l'injection des variables du projet qui ne se fait
  pas du tout.
- **Branche / commit inattendus** → le déploiement servi n'est pas celui que vous croyez ; redéployez et
  re-vérifiez.
- **`BLOB_READ_WRITE_TOKEN` absente alors qu'elle existe dans le dashboard** → la variable n'est pas
  attachée à cet environnement, ou elle est masquée par l'intégration Storage de Vercel qui « possède »
  ce nom. Contournement : créez une variable **`TOAC_BLOB_TOKEN`** (nom que Vercel ne gère pas) avec la
  même valeur, redéployez — le code l'utilise automatiquement en repli.
- **Jeton présent mais test en échec** → l'erreur affichée est la vraie cause. « Cannot use public
  access on a private store » signifie qu'un `put()` demande `access: "public"` sur le store privé du
  club : c'est le code qu'il faut corriger, pas la configuration Vercel.

## 6ter. Attestation de paiement (CSE)

La page **`/attestation-adhesion`** permet à un adhérent de recevoir par email une attestation de paiement
(licence FFTri + cotisation club) à transmettre à son CSE. « Attestation » et non « facture » : la licence est
encaissée par la FFTri, le club atteste du paiement mais ne facture pas à sa place.

Parcours :

1. L'adhérent saisit nom, prénom et date de naissance. Le serveur cherche le dossier dans la saison la plus
   récente importée (nom/prénom comparés sans accents ni casse, dans les deux ordres).
2. Seuls les dossiers au statut **Payé** obtiennent une attestation. Le PDF est généré
   (`src/lib/attestationPdf.ts`), déposé dans le store Blob privé (`attestations/…`) et envoyé **en pièce
   jointe à l'email du dossier** via Brevo — jamais à une adresse saisie dans le formulaire, ni affiché à
   l'écran : c'est ce qui empêche d'obtenir l'attestation de quelqu'un d'autre. Une nouvelle demande moins de
   10 minutes après un envoi réussi ne renvoie rien.
3. Chaque attestation apparaît dans **Espace Adhérents → Bureau → Attestations de paiement**
   (`/espace-adherents/bureau/attestations`) : voir/télécharger le PDF, le renvoyer, le supprimer.

Montants repris de l'onglet « Dossiers adhésion » du Google Sheets : **cotisation = « Cotiz » − « Réduc »**
(ni la trifonction ni le dépôt de caution) et **licence = « Licence (€) »**.

### Mise en route (une fois par saison)

Tout se fait depuis **Bureau → Imports**, connecté avec une adresse de `SUPER_ADMIN_EMAILS` (§ 4) ; le service reste fermé tant que les deux étapes
ne sont pas faites.

1. **Signataire** : nom du trésorier + image de sa signature (PNG/JPG). L'image est rangée dans le store Blob
   privé, jamais dans ce dépôt (public).
2. **Liste des adhérents** : dans le Sheets, onglet **« Dossiers (tri/nom) »** (il ne contient que les dossiers
   « Payé » et ses montants ne sont pas arrondis), `Fichier → Télécharger → .csv`, puis déposer le fichier en
   indiquant la saison. Un import remplace toute la liste de cette saison ; les colonnes sont retrouvées par
   leur en-tête, et les dates de naissance sont acceptées en JJ/MM/AAAA comme en numéro de série Sheets
   (export de cet onglet). L'onglet « Dossiers adhésion » fonctionne aussi, mais sa colonne « Licence (€) »
   y est affichée arrondie (101 € au lieu de 100,70 €) et l'export CSV reprend la valeur affichée — l'import
   affiche un avertissement dans ce cas.

Tables utilisées (créées automatiquement) : `adherents_saison`, `attestations`, `parametres`. Variables :
`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `BREVO_API_KEY` (+ `BREVO_FROM_EMAIL`).

## 7. Sécurité de l'espace adhérents

- Authentification par identifiant/mot de passe (bcrypt), session signée (HMAC) dans un cookie **httpOnly**
  (jamais lisible en JavaScript côté client).
- Protection au niveau du **proxy** Next.js (`src/proxy.ts`, anciennement "middleware") : toute tentative
  d'accès direct par URL à `/espace-adherents/*` sans session valide redirige vers `/connexion`.
- Double vérification côté serveur dans chaque page protégée (défense en profondeur).
- Les données adhérents (base Postgres, `src/data/accounts.json`) ne sont jamais servies au
  client : elles sont lues côté serveur (Server Components / Route Handlers) et seul le rendu HTML final
  (ou les champs strictement nécessaires) atteint le navigateur.

### Se connecter au bureau en production

`src/data/accounts.json` porte les comptes locaux mais n'est **pas versionné** (données sensibles) : il
n'existe donc pas sur le serveur déployé. En production, le compte bureau vient des variables
d'environnement :

```
ADMIN_USERNAME=bureau
ADMIN_PASSWORD=<mot de passe long>
ADMIN_NAME=Bureau TOAC        # facultatif
```

Sans elles, personne ne peut ouvrir `/espace-adherents/*` en ligne. Le mot de passe est comparé en temps
constant et doit faire au moins 8 caractères. En développement, à défaut de `accounts.json`, les comptes
de démonstration de `accounts.sample.json` restent utilisables ; ce repli est **refusé en production**,
car les hachages de ce fichier sont dans le dépôt et l'un d'eux ouvre un compte `admin`.

### Rendre tout le site privé (avant mise en ligne publique)

Sans passer par un plan payant Vercel : renseignez `SITE_PASSWORD` dans les variables d'environnement.
Une fois définie, le navigateur demande un identifiant (n'importe lequel) et ce mot de passe avant
d'afficher quoi que ce soit sur le site. Laissez la variable vide (ou supprimez-la) pour repasser le site
en public. La notification de paiement Monetico (`/api/monetico/retour`) reste volontairement accessible
sans mot de passe, sinon les paiements en cours échoueraient.

### Fermer l'URL Vercel (*.vercel.app) une fois le vrai domaine en ligne

Une fois `toac-triathlon.com` branché (voir domaine personnalisé ci-dessus), l'URL générée par Vercel
(`site-web-toac.vercel.app`) reste accessible en parallèle — pratique pour les devs, mais pas destinée au
public. Pour la fermer sans toucher au domaine de production :

- Renseignez `PREVIEW_SITE_PASSWORD` dans les variables d'environnement Vercel : seule cette URL demandera
  un identifiant/mot de passe (même mécanisme que `SITE_PASSWORD` ci-dessus), `toac-triathlon.com` reste
  public. Laissez vide pour ne pas la verrouiller.
- Elle est aussi exclue des moteurs de recherche par défaut (en-tête `X-Robots-Tag: noindex`, voir
  `next.config.ts`), qu'un mot de passe soit renseigné ou non.

## 8. Placeholders restants — récapitulatif

- Toutes les photos (`ImagePlaceholder`)
- `TARIFS_A_CONFIRMER` (montants de cotisation)
- `URL_INSCRIPTION_TDL` (lien d'inscription aux Triathlons du Lauragais)
- `LIEN_COMMANDE_TENUES`
- Documents PDF de l'espace adhérents
- Variables d'environnement Monetico et Brevo
- Coordonnées GPS précises des lieux d'entraînement (approximations à vérifier)
- `favicon.ico` (retiré du dépôt initial — vous pouvez en générer un à partir de `public/logo-toac.png`)
- `package-lock.json` (non inclus dans ce commit — régénérez-le avec `npm install`)
