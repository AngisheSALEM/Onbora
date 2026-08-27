from django.core.management.base import BaseCommand
from catalog.models import ServiceCatalog, OfferQuestionnaire, OfferQuestion

class Command(BaseCommand):
    help = 'Seed the database with default MSP services'

    def handle(self, *args, **kwargs):
        services = [
            {
                'name': 'Fibre Optique Pro',
                'category': ServiceCatalog.CONNECTIVITY,
                'description': 'Connexion Internet très haut débit dédiée aux professionnels avec garantie de temps de rétablissement (GTR) de 4 heures.',
                'benefits': 'Stabilité maximale, débits symétriques garantis pour le cloud et la visio, et basculement automatique sur backup 4G/5G.',
                'technical_requirements': {'bandwidth_options': ['100 Mbps', '1 Gbps', '10 Gbps'], 'backup_included': True}
            },
            {
                'name': 'SD-WAN Managé',
                'category': ServiceCatalog.CONNECTIVITY,
                'description': 'Interconnexion intelligente et sécurisée de vos différents sites physiques pour optimiser les flux réseaux et sécuriser les accès cloud.',
                'benefits': 'Gestion centralisée du trafic, priorisation automatique des applications métier critiques (ERP, VoIP), et résilience multi-liens.',
                'technical_requirements': {'multi_site_required': True, 'supported_routers': ['Fortinet', 'Cisco']}
            },
            {
                'name': 'Hébergement Cloud Souverain (VPS)',
                'category': ServiceCatalog.CLOUD,
                'description': 'Serveurs virtuels privés hébergés dans des datacenters français hautement sécurisés, garantissant la souveraineté des données.',
                'benefits': 'Scalabilité des ressources à la demande, conformité RGPD assurée, sauvegardes quotidiennes automatisées et infogérance 24/7.',
                'technical_requirements': {'os_options': ['Linux Ubuntu/Debian', 'Windows Server'], 'ram_range_gb': [4, 128]}
            },
            {
                'name': 'Hébergement de Données de Santé (HDS)',
                'category': ServiceCatalog.CLOUD,
                'description': 'Solution d\'hébergement cloud certifiée HDS (Hébergeur de Données de Santé) pour le stockage sécurisé des dossiers médicaux.',
                'benefits': 'Conformité légale stricte avec le code de la santé publique, cryptage renforcé et accès sécurisés par double authentification.',
                'technical_requirements': {'hds_certified': True, 'encryption_standard': 'AES-256'}
            },
            {
                'name': 'Firewall Managé',
                'category': ServiceCatalog.SECURITY,
                'description': 'Protection périmétrique de votre réseau d\'entreprise avec filtrage de contenu, détection d\'intrusions (IPS) et VPN pour le télétravail.',
                'benefits': 'Bloque les cybermenaces en amont, sécurise les collaborateurs distants avec des tunnels chiffrés, et fournit des rapports d\'activité clairs.',
                'technical_requirements': {'vpn_users_max': 250, 'ips_throughput_gbps': 1.2}
            },
            {
                'name': 'EDR & Antivirus Pro',
                'category': ServiceCatalog.SECURITY,
                'description': 'Solution de détection et réponse aux menaces sur les postes de travail (EDR) pour bloquer les ransomwares et attaques complexes.',
                'benefits': 'Analyse comportementale en temps réel, isolation automatique des postes infectés, et supervision par notre SOC d\'experts.',
                'technical_requirements': {'supported_platforms': ['Windows', 'macOS', 'Linux'], 'agent_based': True}
            },
            {
                'name': 'Microsoft 365 Pro & Teams',
                'category': ServiceCatalog.COLLABORATIVE,
                'description': 'Suite collaborative cloud complète incluant Outlook, Teams, Word, Excel, PowerPoint ainsi que SharePoint pour le partage de fichiers.',
                'benefits': 'Collaboration fluide en temps réel, messagerie professionnelle unifiée, stockage cloud OneDrive de 1 To par utilisateur, et outils de coédition.',
                'technical_requirements': {'subscription_type': 'Business Premium', 'storage_per_user_gb': 1000}
            },
            {
                'name': 'Téléphonie Teams (VoIP)',
                'category': ServiceCatalog.COLLABORATIVE,
                'description': 'Intégration directe de vos lignes téléphoniques d\'entreprise dans Microsoft Teams pour appeler et recevoir des appels de partout.',
                'benefits': 'Remplacement du standard téléphonique physique obsolète, réduction des coûts télécoms, et numéro unique sur PC, mobile et tablette.',
                'technical_requirements': {'m365_license_required': True, 'calling_plans_options': ['France Illimité', 'International']}
            },
            {
                'name': 'Terminal de Paiement (TPE) Connecté',
                'category': ServiceCatalog.PAYMENT,
                'description': 'Terminaux de paiement électroniques modernes (fixes ou mobiles) connectés en Wi-Fi / 4G avec encaissement ultra-rapide.',
                'benefits': 'Sécurité des transactions bancaires, compatibilité sans contact et paiements mobiles, et reporting en temps réel de vos ventes.',
                'technical_requirements': {'connection_modes': ['4G LTE', 'Wi-Fi', 'Ethernet'], 'pci_dss_compliant': True}
            }
        ]

        self.stdout.write('Seeding service catalog...')
        created_services = {}
        for data in services:
            name = data['name']
            ServiceCatalog.objects.filter(name=name).delete()
            svc = ServiceCatalog.objects.create(**data)
            created_services[name] = svc
            self.stdout.write(self.style.SUCCESS(f"Service '{name}' added to catalog."))

        # 2. Seeding Questionnaires et Questions Prédéfinies par Offre
        self.stdout.write('Seeding offer questionnaires and questions...')
        OfferQuestionnaire.objects.all().delete()

        questionnaires_data = [
            {
                'service_name': 'Fibre Optique Pro',
                'title': 'Formulaire Qualification : Fibre Optique Pro Orange',
                'target_offer_name': 'Fibre Optique Pro 50M (GTR 4h)',
                'description': 'Questions d\'éligibilité technique et de dimensionnement des débits pour raccordement Fibre Optique.',
                'questions': [
                    {
                        'order': 1,
                        'question_text': 'Quel type de connexion Internet utilisez-vous actuellement sur votre site principal ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Fibre Optique concurrente', 'Faisceau hertzien / BLR', 'Modem 4G / Clé USB', 'Connexion ADSL/Cuivre classique', 'Aucune connexion actuelle'],
                        'is_required': True,
                        'help_text': 'Identifier la technologie en place',
                        'scoring_weight': 20,
                    },
                    {
                        'order': 2,
                        'question_text': 'Combien de postes et terminaux (PC, serveurs, téléphones IP) sont connectés simultanément ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['1 à 5 postes', '6 à 20 postes', '21 à 50 postes', '50 à 100 postes', 'Plus de 100 postes'],
                        'is_required': True,
                        'help_text': 'Dimensionnement du débit recommandé',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 3,
                        'question_text': 'Quel est le nom de votre fournisseur Internet actuel ?',
                        'question_type': 'TEXT',
                        'options': [],
                        'is_required': True,
                        'help_text': 'Ex: Vodacom, Liquid Telecom, Canalbox, Airtel...',
                        'scoring_weight': 15,
                    },
                    {
                        'order': 4,
                        'question_text': 'Avez-vous une exigence de secours automatique 4G sans coupure en cas de coupure de câble ?',
                        'question_type': 'BOOLEAN',
                        'options': ['Oui', 'Non'],
                        'is_required': True,
                        'help_text': 'Permet de proposer le backup 4G automatique',
                        'scoring_weight': 20,
                    },
                    {
                        'order': 5,
                        'question_text': 'Quel est votre budget mensuel approximatif alloué à la connectivité ($ USD / mois) ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Moins de 150 $', '150 $ à 350 $', '350 $ à 700 $', '700 $ à 1 500 $', 'Plus de 1 500 $'],
                        'is_required': True,
                        'help_text': 'Validation de l\'enveloppe budgétaire B2B',
                        'scoring_weight': 20,
                    },
                ]
            },
            {
                'service_name': 'Microsoft 365 Pro & Teams',
                'title': 'Formulaire Qualification : Microsoft 365 & Outils Collaboratifs',
                'target_offer_name': 'Pack Microsoft 365 Business Standard & Teams',
                'description': 'Qualification des besoins en messagerie professionnelle, partage de documents et visioconférence.',
                'questions': [
                    {
                        'order': 1,
                        'question_text': 'Quel système de messagerie électronique utilisez-vous actuellement pour vos collaborateurs ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Adresses gratuites (Gmail, Yahoo)', 'Webmail hébergé chez un prestataire local', 'Microsoft Office 365 existant', 'Google Workspace', 'Pas de messagerie d\'entreprise'],
                        'is_required': True,
                        'help_text': 'Identifier le niveau de maturité digitale',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 2,
                        'question_text': 'De combien d\'adresses emails professionnelles au nom de domaine de votre entreprise avez-vous besoin ?',
                        'question_type': 'NUMBER',
                        'options': [],
                        'is_required': True,
                        'help_text': 'Nombre de licences M365 à chiffrer',
                        'scoring_weight': 30,
                    },
                    {
                        'order': 3,
                        'question_text': 'Quels usages collaboratifs sont prioritaires pour votre équipe ?',
                        'question_type': 'MULTIPLE_CHOICE',
                        'options': ['Réunions en visio Teams/Zoom', 'Stockage & partage de fichiers OneDrive (1 To)', 'Co-édition de fichiers Word/Excel', 'Sécurité et archivage des emails', 'Standard téléphonique d\'accueil'],
                        'is_required': True,
                        'help_text': 'Cocher tous les usages mentionnés',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 4,
                        'question_text': 'Souhaitez-vous un accompagnement Orange pour la migration de vos anciens emails vers M365 ?',
                        'question_type': 'BOOLEAN',
                        'options': ['Oui', 'Non'],
                        'is_required': False,
                        'help_text': 'Prestation d\'intégration et déploiement',
                        'scoring_weight': 20,
                    },
                ]
            },
            {
                'service_name': 'Firewall Managé',
                'title': 'Formulaire Qualification : Cybersécurité & Sauvegarde Souveraine',
                'target_offer_name': 'Firewall UTM Managé & Cloud Backup Souverain',
                'description': 'Évaluation des risques cyber, protection du réseau et sauvegarde sécurisée en datacenter local.',
                'questions': [
                    {
                        'order': 1,
                        'question_text': 'Disposez-vous d\'un boîtier pare-feu (Firewall) dédié pour protéger votre réseau d\'entreprise ?',
                        'question_type': 'BOOLEAN',
                        'options': ['Oui', 'Non'],
                        'is_required': True,
                        'help_text': 'Vérifier la sécurité périmétrique',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 2,
                        'question_text': 'Comment sont sauvegardées vos données d\'entreprise (comptabilité, fichiers clients, ERP) ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Sauvegarde automatique dans un Cloud sécurisé', 'Disques durs externes / Clés USB manuelles', 'Sauvegarde sur serveur local non répliqué', 'Aucune sauvegarde régulière'],
                        'is_required': True,
                        'help_text': 'Détection de risque de perte de données',
                        'scoring_weight': 35,
                    },
                    {
                        'order': 3,
                        'question_text': 'Avez-vous des collaborateurs qui travaillent à distance et nécessitent un accès sécurisé VPN ?',
                        'question_type': 'BOOLEAN',
                        'options': ['Oui', 'Non'],
                        'is_required': True,
                        'help_text': 'Dimensionnement des tunnels VPN',
                        'scoring_weight': 20,
                    },
                    {
                        'order': 4,
                        'question_text': 'Avez-vous déjà été confronté à une tentative d\'attaque informatique, virus ou ransomware ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Oui, avec impact sur nos activités', 'Oui, mais bloquée à temps', 'Non, jamais à notre connaissance', 'Ne sait pas'],
                        'is_required': False,
                        'help_text': 'Sensibilité du décideur au risque cyber',
                        'scoring_weight': 20,
                    },
                ]
            },
            {
                'service_name': 'Terminal de Paiement (TPE) Connecté',
                'title': 'Formulaire Qualification : TPE & Paiement Orange Money Pro',
                'target_offer_name': 'Terminaux TPE Connectés 4G + Encaissement Orange Money',
                'description': 'Équipement pour points de vente, commerces, cliniques et hôtels pour l\'encaissement numérique.',
                'questions': [
                    {
                        'order': 1,
                        'question_text': 'Quels moyens de paiement acceptez-vous aujourd\'hui en caisse ?',
                        'question_type': 'MULTIPLE_CHOICE',
                        'options': ['Espèces uniquement (Cash USD/CDF)', 'Cartes bancaires (Visa/Mastercard)', 'Mobile Money (Orange Money, M-Pesa, Airtel Money)', 'Virements bancaires'],
                        'is_required': True,
                        'help_text': 'Moyens d\'encaissement actuels',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 2,
                        'question_text': 'Combien de caisses ou points d\'encaissement physiques disposez-vous ?',
                        'question_type': 'NUMBER',
                        'options': [],
                        'is_required': True,
                        'help_text': 'Nombre de terminaux TPE nécessaires',
                        'scoring_weight': 30,
                    },
                    {
                        'order': 3,
                        'question_text': 'Quel est le volume mensuel estimé de vos encaissements par carte et mobile money ?',
                        'question_type': 'SINGLE_CHOICE',
                        'options': ['Moins de 5 000 $ / mois', '5 000 $ à 20 000 $ / mois', '20 000 $ à 50 000 $ / mois', 'Plus de 50 000 $ / mois'],
                        'is_required': True,
                        'help_text': 'Négociation des taux de commission B2B',
                        'scoring_weight': 25,
                    },
                    {
                        'order': 4,
                        'question_text': 'Avez-vous besoin d\'une intégration directe avec votre logiciel de caisse / ERP ?',
                        'question_type': 'BOOLEAN',
                        'options': ['Oui', 'Non'],
                        'is_required': False,
                        'help_text': 'Faisabilité technique d\'interfaçage caisse',
                        'scoring_weight': 20,
                    },
                ]
            }
        ]

        for q_data in questionnaires_data:
            svc = created_services.get(q_data['service_name'])
            questionnaire = OfferQuestionnaire.objects.create(
                service=svc,
                title=q_data['title'],
                target_offer_name=q_data['target_offer_name'],
                description=q_data['description'],
                is_active=True
            )
            for quest in q_data['questions']:
                OfferQuestion.objects.create(
                    questionnaire=questionnaire,
                    question_text=quest['question_text'],
                    question_type=quest['question_type'],
                    options=quest['options'],
                    is_required=quest['is_required'],
                    order=quest['order'],
                    help_text=quest['help_text'],
                    scoring_weight=quest['scoring_weight']
                )
            self.stdout.write(self.style.SUCCESS(f"Questionnaire '{q_data['title']}' created with {len(q_data['questions'])} questions."))

        self.stdout.write(self.style.SUCCESS('Catalog & Questionnaires seeding complete!'))
