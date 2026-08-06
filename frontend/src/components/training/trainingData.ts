export interface Step {
  id: number;
  title: string;
  instruction: string;
  mediaType: 'mfa' | 'vpn' | 'sharepoint' | 'phone';
  actionLabel?: string;
  actionType?: 'do_it_for_me';
  actionConfig?: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'phone' | 'collab' | 'vpn';
  duration: string;
  steps: Step[];
  quiz: Quiz;
  persona: 'employee' | 'manager' | 'all';
}

export interface AdoptionStat {
  user: string;
  role: string;
  module: string;
  progress: number;
  status: 'completed' | 'in_progress' | 'not_started';
  lastActive: string;
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'mfa-setup',
    title: 'Activer la double authentification (MFA)',
    description: 'Sécurisez vos accès cloud et messagerie en associant votre compte à Microsoft Authenticator.',
    category: 'security',
    duration: '2 min',
    persona: 'all',
    steps: [
      {
        id: 1,
        title: 'Installer l\'application',
        instruction: 'Téléchargez Microsoft Authenticator sur votre smartphone depuis Google Play Store ou l\'App Store Apple.',
        mediaType: 'mfa',
      },
      {
        id: 2,
        title: 'Scanner le QR Code',
        instruction: 'Ouvrez l\'application, appuyez sur le bouton "+" pour ajouter un compte professionnel, puis scannez le QR code affiché à l\'écran.',
        mediaType: 'mfa',
      },
      {
        id: 3,
        title: 'Vérifier la notification',
        instruction: 'Entrez le code à deux chiffres affiché sur votre ordinateur dans l\'application mobile pour confirmer la liaison.',
        mediaType: 'mfa',
      },
      {
        id: 4,
        title: 'Configuration sécurisée',
        instruction: 'Félicitations, votre MFA est désormais actif. Onbora a détecté votre statut sécurisé.',
        mediaType: 'mfa',
        actionLabel: 'Vérifier le statut MFA',
        actionType: 'do_it_for_me',
        actionConfig: 'mfa_status'
      }
    ],
    quiz: {
      question: 'À quelle fréquence ou dans quel cas devez-vous approuver une demande MFA ?',
      options: [
        'Uniquement la première fois que je me connecte sur un nouvel appareil.',
        'À chaque fois que je clique sur n\'importe quel lien SharePoint.',
        'Lors d\'une nouvelle connexion ou si un comportement suspect est détecté.',
        'Jamais, c\'est géré automatiquement par le réseau Orange.'
      ],
      correctAnswerIndex: 2,
      explanation: 'Le MFA se déclenche lors de nouvelles connexions, d\'appareils non reconnus ou de requêtes suspectes pour valider votre identité sans pour autant vous déranger à chaque clic.'
    }
  },
  {
    id: 'vpn-access',
    title: 'Se connecter au VPN Cisco AnyConnect',
    description: 'Accédez aux ressources internes de l\'entreprise (fichiers partagés, serveurs métiers) en toute sécurité depuis chez vous.',
    category: 'vpn',
    duration: '3 min',
    persona: 'all',
    steps: [
      {
        id: 1,
        title: 'Lancer Cisco AnyConnect',
        instruction: 'Ouvrez l\'application Cisco Secure Client depuis le menu Démarrer ou votre dossier Applications.',
        mediaType: 'vpn',
      },
      {
        id: 2,
        title: 'Renseigner la passerelle',
        instruction: 'Dans le champ de saisie, saisissez l\'adresse du serveur : "vpn.onbora-entreprise.fr".',
        mediaType: 'vpn',
        actionLabel: 'Remplir automatiquement l\'adresse VPN',
        actionType: 'do_it_for_me',
        actionConfig: 'vpn_address'
      },
      {
        id: 3,
        title: 'S\'authentifier',
        instruction: 'Saisissez vos identifiants professionnels suivis de la validation sur votre application Authenticator mobile.',
        mediaType: 'vpn',
      },
      {
        id: 4,
        title: 'Validation de la connexion',
        instruction: 'L\'icône VPN dans la barre des tâches doit afficher un cadenas vert fermé, indiquant que votre connexion est chiffrée.',
        mediaType: 'vpn',
      }
    ],
    quiz: {
      question: 'Quand devez-vous désactiver le VPN ?',
      options: [
        'Dès que je regarde une vidéo ou que je fais une réunion Teams personnelle hors flux de travail.',
        'Jamais, le VPN doit rester allumé 24h/24 même le week-end.',
        'Seulement si la connexion Internet de ma maison est coupée.',
        'Lorsque je suis directement connecté au réseau physique du bureau.'
      ],
      correctAnswerIndex: 3,
      explanation: 'Lorsque vous êtes physiquement dans les locaux de l\'entreprise, vous êtes déjà sur le réseau interne sécurisé. Le VPN n\'est donc plus nécessaire.'
    }
  },
  {
    id: 'sharepoint-collab',
    title: 'Configurer & Utiliser SharePoint',
    description: 'Synchronisez vos dossiers d\'équipe SharePoint et collaborez en temps réel sur Microsoft Teams.',
    category: 'collab',
    duration: '2 min',
    persona: 'all',
    steps: [
      {
        id: 1,
        title: 'Accéder à votre espace',
        instruction: 'Ouvrez votre portail Office 365, puis cliquez sur l\'icône SharePoint et sélectionnez le site de votre département.',
        mediaType: 'sharepoint',
      },
      {
        id: 2,
        title: 'Lancer la synchronisation',
        instruction: 'Cliquez sur le bouton "Synchroniser" dans la barre d\'outils supérieure pour lier le dossier avec votre Explorateur de Fichiers.',
        mediaType: 'sharepoint',
        actionLabel: 'Lancer la synchronisation locale',
        actionType: 'do_it_for_me',
        actionConfig: 'sync_sharepoint'
      },
      {
        id: 3,
        title: 'Partager un lien sécurisé',
        instruction: 'Pour envoyer un document, faites un clic droit, sélectionnez "Partager" et définissez les permissions (ex: restreindre aux membres de l\'organisation).',
        mediaType: 'sharepoint',
      }
    ],
    quiz: {
      question: 'Que signifie l\'icône en forme de petit nuage bleu à côté d\'un fichier synchronisé sur votre poste ?',
      options: [
        'Le fichier est en cours de suppression définitive.',
        'Le fichier est stocké dans le cloud et sera téléchargé uniquement lorsque je l\'ouvrirai (gain de place).',
        'Le fichier a été refusé par l\'administrateur informatique.',
        'Le fichier est partagé publiquement sur Internet.'
      ],
      correctAnswerIndex: 1,
      explanation: 'L\'icône Nuage de OneDrive/SharePoint indique que le document ne consomme pas d\'espace disque local et se téléchargera à la volée quand vous double-cliquerez dessus.'
    }
  },
  {
    id: 'teams-telephony',
    title: 'Gérer la Téléphonie IP et les transferts',
    description: 'Configurez vos règles de renvoi d\'appels et votre messagerie vocale sur Teams Phone.',
    category: 'phone',
    duration: '2 min',
    persona: 'manager',
    steps: [
      {
        id: 1,
        title: 'Accéder aux paramètres d\'appels',
        instruction: 'Sur Teams, cliquez sur les "..." à côté de votre photo de profil, puis allez dans Paramètres > Appels.',
        mediaType: 'phone',
      },
      {
        id: 2,
        title: 'Définir un renvoi',
        instruction: 'Activez l\'option "Renvoyer mes appels" et choisissez s\'ils doivent aller vers votre messagerie vocale ou un collègue.',
        mediaType: 'phone',
        actionLabel: 'Activer le renvoi vers messagerie vocale',
        actionType: 'do_it_for_me',
        actionConfig: 'enable_call_forwarding'
      },
      {
        id: 3,
        title: 'Personnaliser l\'annonce d\'absence',
        instruction: 'Cliquez sur "Configurer la messagerie vocale", puis enregistrez votre message d\'accueil personnalisé.',
        mediaType: 'phone',
      }
    ],
    quiz: {
      question: 'Si vous configurez un renvoi d\'appels vers un collègue, que se passe-t-il s\'il ne répond pas ?',
      options: [
        'L\'appel est définitivement perdu.',
        'L\'appelant est redirigé vers votre propre messagerie vocale (par défaut si configuré ainsi).',
        'Le téléphone du collègue se met à sonner indéfiniment.',
        'L\'appel est automatiquement transféré au support informatique MSP.'
      ],
      correctAnswerIndex: 1,
      explanation: 'Selon vos paramètres de débordement, si votre collègue ne répond pas, l\'appel retourne vers votre boîte vocale ou suit les règles de sonnerie secondaires.'
    }
  }
];

export const MOCK_ADOPTION_STATS: AdoptionStat[] = [
  { user: 'Jean-Marc Dupont', role: 'Collaborateur', module: 'Double authentification (MFA)', progress: 100, status: 'completed', lastActive: 'Il y a 2h' },
  { user: 'Sophie Bernard', role: 'Commerciale', module: 'Double authentification (MFA)', progress: 100, status: 'completed', lastActive: 'Hier' },
  { user: 'Thomas Martin', role: 'Collaborateur', module: 'VPN Cisco AnyConnect', progress: 50, status: 'in_progress', lastActive: 'Il y a 30m' },
  { user: 'Thomas Martin', role: 'Collaborateur', module: 'Double authentification (MFA)', progress: 0, status: 'not_started', lastActive: 'Jamais' },
  { user: 'Sandrine Muller', role: 'Responsable RH', module: 'SharePoint & Collaboration', progress: 100, status: 'completed', lastActive: 'Il y a 3j' },
  { user: 'Lucas Garcia', role: 'Alternant', module: 'Double authentification (MFA)', progress: 75, status: 'in_progress', lastActive: 'Il y a 1h' },
];
