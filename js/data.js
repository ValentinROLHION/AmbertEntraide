// ===== DONNÉES DE DÉMONSTRATION =====

const DATA = {

  // Annonces à la une (mises en avant par l'admin)
  featuredAdmin: {
    title: "Collecte de vêtements d'hiver — Décembre 2026",
    text: "La mairie d'Ambert organise avec l'aide de bénévoles une grande collecte de vêtements chauds pour les familles dans le besoin. Apportez vos dons à la salle des fêtes chaque samedi matin.",
    icon: "🧥",
    cta: "En savoir plus",
    date: "15 nov. 2026"
  },

  dons: [
    {
      id: 1,
      titre: "Vélo enfant 6-9 ans — état neuf",
      description: "Vélo avec petites roues d'apprentissage, utilisé seulement une saison. Taille adaptée aux enfants de 6 à 9 ans. Couleur rouge, dérailleur 6 vitesses.",
      categorie: "Sport & Loisirs",
      etat: "Comme neuf",
      icon: "🚲",
      auteur: "Marie L.",
      initiales: "ML",
      date: "13 mai 2026",
      badge: "neuf",
      badgeLabel: "Comme neuf"
    },
    {
      id: 2,
      titre: "Lot de livres romans adultes",
      description: "Une quinzaine de romans policiers et de science-fiction. Auteurs variés : Grangé, Chattam, Nothomb. Tous en bon état de lecture.",
      categorie: "Livres & BD",
      etat: "Bon état",
      icon: "📚",
      auteur: "Pierre D.",
      initiales: "PD",
      date: "11 mai 2026",
      badge: null
    },
    {
      id: 3,
      titre: "Canapé 3 places tissu gris",
      description: "Canapé convertible 3 places couleur gris anthracite. Quelques années d'usage, tissu légèrement usé mais très confortable. À venir récupérer sur place.",
      categorie: "Mobilier",
      etat: "Usé mais fonctionnel",
      icon: "🛋️",
      auteur: "Sophie M.",
      initiales: "SM",
      date: "9 mai 2026",
      badge: "urgent",
      badgeLabel: "À prendre vite"
    },
    {
      id: 4,
      titre: "Machine à coudre Singer",
      description: "Machine à coudre Singer années 90, fonctionne parfaitement. Avec accessoires d'origine et boîte de fils. Idéal pour débuter.",
      categorie: "Électroménager",
      etat: "Bon état",
      icon: "🪡",
      auteur: "Claudette R.",
      initiales: "CR",
      date: "7 mai 2026",
      badge: null
    },
    {
      id: 5,
      titre: "Jeux de société pour enfants",
      description: "Lot de 8 jeux de société : Uno, Dobble, Jungle Speed, Cluedo Junior, Puissance 4... Complets et en bon état. Pour enfants 5-12 ans.",
      categorie: "Jeux & Jouets",
      etat: "Bon état",
      icon: "🎲",
      auteur: "Thomas B.",
      initiales: "TB",
      date: "5 mai 2026",
      badge: null
    },
    {
      id: 6,
      titre: "Vêtements bébé 0-6 mois",
      description: "Sac complet de vêtements bébé fille taille 0-6 mois : bodys, pyjamas, chaussettes, bonnets. Tout lavé et propre.",
      categorie: "Enfants & Bébés",
      etat: "Bon état",
      icon: "👶",
      auteur: "Lucie F.",
      initiales: "LF",
      date: "3 mai 2026",
      badge: null
    }
  ],

  services: [
    {
      id: 1,
      titre: "Cours de soutien scolaire maths/physique",
      description: "Professeur de lycée à la retraite, je propose des cours de soutien en mathématiques et physique-chimie pour collégiens et lycéens. Bénévole, 2h par semaine maximum.",
      categorie: "Cours & Formation",
      icon: "📐",
      auteur: "Jean-Paul K.",
      initiales: "JK",
      date: "14 mai 2026",
      badge: null
    },
    {
      id: 2,
      titre: "Aide aux courses pour personnes à mobilité réduite",
      description: "Disponible le mercredi et samedi matin pour accompagner ou faire les courses en centre-ville d'Ambert. Voiture disponible pour les personnes sans véhicule.",
      categorie: "Aide quotidienne",
      icon: "🛒",
      auteur: "Nathalie V.",
      initiales: "NV",
      date: "12 mai 2026",
      badge: "urgent",
      badgeLabel: "Recherché"
    },
    {
      id: 3,
      titre: "Garde de chats et petits animaux",
      description: "Je garde vos chats et lapins pendant vos vacances, à mon domicile ou au vôtre. Tarif libre / échange de service accepté. Références disponibles.",
      categorie: "Animaux",
      icon: "🐱",
      auteur: "Amélie C.",
      initiales: "AC",
      date: "10 mai 2026",
      badge: null
    },
    {
      id: 4,
      titre: "Aide informatique et smartphones",
      description: "Retraité passionné d'informatique, j'aide les personnes âgées ou peu à l'aise avec les ordinateurs, tablettes et téléphones. À domicile si besoin.",
      categorie: "Informatique",
      icon: "💻",
      auteur: "Robert M.",
      initiales: "RM",
      date: "8 mai 2026",
      badge: null
    },
    {
      id: 5,
      titre: "Jardinage et petit entretien extérieur",
      description: "Je propose mon aide pour l'entretien de jardins : tonte, taille de haies, désherbage. Échange de légumes du jardin ou service en retour bienvenu.",
      categorie: "Jardinage",
      icon: "🌿",
      auteur: "Michel G.",
      initiales: "MG",
      date: "6 mai 2026",
      badge: null
    },
    {
      id: 6,
      titre: "Transport médical et RDV",
      description: "Je peux conduire des personnes âgées ou sans permis à leurs rendez-vous médicaux (Ambert, Thiers, Clermont-Fd). Disponible en semaine sur réservation.",
      categorie: "Transport",
      icon: "🚗",
      auteur: "Bernard T.",
      initiales: "BT",
      date: "4 mai 2026",
      badge: null
    }
  ],

  actualites: [
    {
      id: 1,
      titre: "Le marché d'Ambert fête ses 500 ans",
      extrait: "Le célèbre marché du samedi d'Ambert, l'un des plus anciens de la région, célèbre cette année un anniversaire exceptionnel avec un programme de festivités tout au long du mois de mai.",
      categorie: "Événement",
      icon: "🎉",
      date: "15 mai 2026",
      featured: true,
      auteur: "Mairie d'Ambert"
    },
    {
      id: 2,
      titre: "Nouveau sentier de randonnée ouvert en Livradois",
      extrait: "Le Parc Naturel Régional du Livradois-Forez inaugure un nouveau sentier de 18 km reliant Ambert à la Vallée de la Dolore.",
      categorie: "Nature & Sport",
      icon: "🥾",
      date: "12 mai 2026",
      featured: false,
      auteur: "PNR Livradois-Forez"
    },
    {
      id: 3,
      titre: "Travaux : rue de la République fermée jusqu'au 30 mai",
      extrait: "Des travaux de réfection des canalisations nécessitent la fermeture partielle de la rue de la République. Des itinéraires de déviation sont mis en place.",
      categorie: "Travaux & Voirie",
      icon: "🚧",
      date: "10 mai 2026",
      featured: false,
      auteur: "Service technique"
    },
    {
      id: 4,
      titre: "Concert de l'Harmonie d'Ambert — Samedi 24 mai",
      extrait: "L'Harmonie municipale d'Ambert donne son concert de printemps à la salle des fêtes. Entrée libre, restauration sur place.",
      categorie: "Culture",
      icon: "🎺",
      date: "8 mai 2026",
      featured: false,
      auteur: "Harmonie d'Ambert"
    },
    {
      id: 5,
      titre: "Inscriptions aux activités sportives d'été ouvertes",
      extrait: "L'office municipal des sports ouvre les inscriptions aux activités d'été : tennis, natation, randonnée et vélo pour tous les âges.",
      categorie: "Sport",
      icon: "⛹️",
      date: "5 mai 2026",
      featured: false,
      auteur: "Office des Sports"
    },
    {
      id: 6,
      titre: "La Médiathèque accueille une expo sur le papier d'Ambert",
      extrait: "Une exposition retrace l'histoire de la fabrication du papier à Ambert, art ancestral classé au patrimoine de la région Auvergne-Rhône-Alpes.",
      categorie: "Patrimoine",
      icon: "📜",
      date: "2 mai 2026",
      featured: false,
      auteur: "Médiathèque"
    }
  ],

  categories: {
    dons: ["Tous", "Mobilier", "Électroménager", "Vêtements", "Livres & BD", "Jeux & Jouets", "Sport & Loisirs", "Enfants & Bébés", "Autre"],
    services: ["Tous", "Aide quotidienne", "Transport", "Cours & Formation", "Jardinage", "Informatique", "Animaux", "Travaux", "Autre"],
    actualites: ["Toutes", "Événement", "Culture", "Sport", "Travaux & Voirie", "Nature & Sport", "Patrimoine"]
  }
};
