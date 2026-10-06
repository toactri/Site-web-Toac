export type FaqCategorie = "Adhésion" | "Entraînements" | "Compétition" | "Vie du club";

export interface FaqItem {
  id: string;
  categorie: FaqCategorie;
  question: string;
  reponse: string;
}

export const FAQ_CATEGORIES: FaqCategorie[] = [
  "Adhésion",
  "Entraînements",
  "Compétition",
  "Vie du club",
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "debutant",
    categorie: "Adhésion",
    question: "Je débute en triathlon, puis-je m'inscrire au TOAC ?",
    reponse:
      "Oui ! Le TOAC Triathlon accueille tous les niveaux, du débutant au compétiteur confirmé, du XS au XXL. Les groupes d'entraînement sont adaptés à chacun.",
  },
  {
    id: "adhesion-inscription",
    categorie: "Adhésion",
    question: "Comment se passe l'adhésion et l'inscription ?",
    reponse:
      "L'adhésion se fait via un formulaire de pré-adhésion, puis la demande de licence et le paiement sur l'espace FFTRI. Retrouvez toutes les étapes sur la page « Adhésion ».",
  },
  {
    id: "documents",
    categorie: "Adhésion",
    question: "Quels sont les documents à fournir ?",
    reponse:
      "Le formulaire de pré-adhésion, le paiement sur l'espace FFTRI (cotisation et dépôt de garantie inclus) (bénévolat aux Triathlons du Lauragais), le questionnaire ou certificat médical selon les règles FFTRI, et une décharge signée si vous souhaitez accéder à la musculation.",
  },
  {
    id: "tarifs",
    categorie: "Adhésion",
    question: "Combien coûte la licence / l'adhésion ?",
    reponse:
      "Les tarifs 2025 sont reconduits en 2026. Montants exacts à confirmer par le bureau — voir la page « Nous rejoindre » (placeholder TARIFS_A_CONFIRMER).",
  },
  {
    id: "cotisation-usage",
    categorie: "Adhésion",
    question: "À quoi sert ma cotisation ?",
    reponse:
      "Votre cotisation finance les entraîneurs, la location de la piste de Capitany et le fonctionnement général du club.",
  },
  {
    id: "section-jeunes",
    categorie: "Adhésion",
    question: "Y a-t-il une section jeunes ?",
    reponse:
      "Non, le TOAC Triathlon n'a pas de section jeunes ni d'école de triathlon. Nous orientons les jeunes vers l'AS Muret Triathlon, le TUC Triathlon ou le Toulouse Triathlon Métropole.",
  },
  {
    id: "materiel",
    categorie: "Adhésion",
    question: "Quel matériel faut-il pour commencer ?",
    reponse:
      "Un maillot et des lunettes de natation, un vélo de route en bon état avec un casque (obligatoire), et des chaussures de running. Pas besoin d'un vélo de triathlon pour débuter.",
  },
  {
    id: "tenue-obligatoire",
    categorie: "Adhésion",
    question: "La tenue du club est-elle obligatoire ?",
    reponse:
      "Oui, la trifonction aux couleurs du TOAC est obligatoire pour les nouveaux adhérents en compétition. Une commande groupée est organisée en début de saison auprès du club.",
  },
  {
    id: "seance-essai",
    categorie: "Adhésion",
    question: "Puis-je faire une séance d'essai avant de m'inscrire ?",
    reponse:
      "Ce point est à confirmer avec le bureau. La réunion de rentrée de septembre est en tout cas le moment idéal pour rencontrer le club et ses entraîneurs.",
  },
  {
    id: "planning-lieux",
    categorie: "Entraînements",
    question: "Où et quand ont lieu les entraînements ?",
    reponse:
      "Consultez le planning de la semaine et la page « Lieux - Points de rdv ». L'application IDO regroupe toutes les séances du club (horaires, lieux, contenus).",
  },
  {
    id: "casque",
    categorie: "Entraînements",
    question: "Le casque est-il obligatoire en sortie vélo ?",
    reponse:
      "Oui, strictement. Le coach peut refuser un adhérent si la sécurité du groupe est en jeu.",
  },
  {
    id: "licence-fftri",
    categorie: "Compétition",
    question: "Comment fonctionne la licence FFTRI et l'assurance ?",
    reponse:
      "La licence FFTRI couvre votre pratique et votre assurance pour l'entraînement. La licence compétition est nécessaire pour participer aux épreuves officielles et aux challenges régionaux D3.",
  },
  {
    id: "d3",
    categorie: "Compétition",
    question: "Qu'est-ce que la D3 et comment y participer ?",
    reponse:
      "La D3 (Division 3) est un challenge régional par équipes en duathlon et triathlon, nécessitant une licence compétition. Les inscriptions se font en janvier/février — voir le calendrier sur la page « Vie du club ».",
  },
  {
    id: "benevolat-tdl",
    categorie: "Compétition",
    question: "Dois-je être bénévole aux Triathlons du Lauragais ?",
    reponse:
      "Oui, la présence est obligatoire sur au moins une journée. En cas d'absence sans en avoir informé le club au préalable, le chèque de caution est encaissé.",
  },
  {
    id: "info-vie-club",
    categorie: "Vie du club",
    question: "Comment suis-je informé de la vie du club ?",
    reponse:
      "Via les listes Google Groups officielles, la communauté WhatsApp « TOAC Tri », ainsi que les comptes Instagram et Facebook du club.",
  },
  {
    id: "espace-adherents-acces",
    categorie: "Vie du club",
    question: "Comment accéder à l'espace adhérents du site ?",
    reponse:
      "Vos identifiants (login et mot de passe) vous sont transmis directement par le bureau du club.",
  },
  {
    id: "contact",
    categorie: "Vie du club",
    question: "Qui contacter pour une question ?",
    reponse:
      "Le bureau du club, à contact@toac-triathlon.com, ou via le formulaire de la page Contact.",
  },
];
