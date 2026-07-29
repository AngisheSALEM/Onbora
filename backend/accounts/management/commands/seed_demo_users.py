from django.core.management.base import BaseCommand
from accounts.models import User
from sales.models import Enterprise, VisitPreparation, VisitReport
from discovery.models import ClientConversation, ClientConversationMessage
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from kam.dispatch_engine import dispatch_dossier

class Command(BaseCommand):
    help = 'Seed the database with rich multi-tenant accounts, startups, business twins, and trigger automated dispatch'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing database tables to allow clean re-run...')
        BusinessTwin.objects.all().delete()
        ProspectDossier.objects.all().delete()
        ClientConversationMessage.objects.all().delete()
        ClientConversation.objects.all().delete()
        VisitReport.objects.all().delete()
        VisitPreparation.objects.all().delete()
        Enterprise.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write('1. Creating administrative account...')
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            role=User.ADMIN,
            first_name='Sophie',
            last_name='Bernard',
            company_name='Orange Business',
            phone='0600112233'
        )
        admin_user.set_password('adminpass')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        self.stdout.write('2. Creating prospector accounts (salespersons)...')
        sales_users = {}
        sales_configs = [
            {'username': 'sales1', 'first_name': 'Alice', 'last_name': 'Martin', 'phone': '0622334455'},
            {'username': 'sales2', 'first_name': 'Robert', 'last_name': 'Durand', 'phone': '0633445566'},
            {'username': 'sales3', 'first_name': 'Clara', 'last_name': 'Dubois', 'phone': '0644556677'},
        ]
        for cfg in sales_configs:
            u = User.objects.create_user(
                username=cfg['username'],
                email=f"{cfg['username']}@example.com",
                role=User.SALESPERSON,
                first_name=cfg['first_name'],
                last_name=cfg['last_name'],
                phone=cfg['phone']
            )
            u.set_password(f"{cfg['username']}pass")
            u.save()
            sales_users[cfg['username']] = u

        self.stdout.write('3. Creating Key Account Managers (KAMs) with locations & availability...')
        kam_configs = [
            {'username': 'kam1', 'first_name': 'Pierre', 'last_name': 'Richard', 'phone': '0655667788', 'location': 'Paris', 'is_available': True},
            {'username': 'kam2', 'first_name': 'Chloé', 'last_name': 'Mercier', 'phone': '0666778899', 'location': 'Bordeaux', 'is_available': True},
            {'username': 'kam3', 'first_name': 'Thomas', 'last_name': 'Legrand', 'phone': '0677889900', 'location': 'Nantes', 'is_available': True},
        ]
        for cfg in kam_configs:
            u = User.objects.create_user(
                username=cfg['username'],
                email=f"{cfg['username']}@example.com",
                role=User.KAM,
                first_name=cfg['first_name'],
                last_name=cfg['last_name'],
                phone=cfg['phone'],
                location=cfg['location'],
                is_available=cfg['is_available']
            )
            u.set_password(f"{cfg['username']}pass")
            u.save()

        self.stdout.write('4. Creating client accounts & triggering dynamic dispatch...')
        clients_data = [
            {
                'username': 'client_sncf',
                'first_name': 'Jean',
                'last_name': 'Dupont',
                'company_name': 'SNCF Connect',
                'sector': 'Transport & Logistique',
                'size': 'Grande Entreprise (500+)',
                'location': 'Paris Gare de Lyon',
                'twin_current': [
                    "Liaisons WAN cuivre instables en gare",
                    "Retard de synchronisation des bases de données de billets",
                    "Messagerie d'équipe non centralisée"
                ],
                'twin_proposed': [
                    "Raccordement Fibre Dédiée Sécurisée",
                    "Infrastructure Cloud hybride AWS/Orange",
                    "Espace Microsoft 365 Pro unifié"
                ],
                'twin_services': [
                    {"service_id": 1, "name": "Fibre Optique Pro", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Raccordement haut débit garanti 4h de GTR."},
                    {"service_id": 2, "name": "Standard Téléphonique Cloud", "category": "COLLAB", "priority": "HIGH", "reasoning": "Pour centraliser les flux de gares."}
                ],
                'twin_roadmap': [
                    "Phase 1: Installation de la Fibre Gares (S1-S3)",
                    "Phase 2: Migration Base de Données (S4)",
                    "Phase 3: Déploiement Teams/M365 (S5)"
                ]
            },
            {
                'username': 'client_doctolib',
                'first_name': 'Lucie',
                'last_name': 'Moreau',
                'company_name': 'Doctolib Pro',
                'sector': 'Santé & Médical',
                'size': 'ETI (250-500)',
                'location': 'Nantes Biotech',
                'twin_current': [
                    "Lenteur d'accès aux dossiers médicaux partagés",
                    "Risque de fuite de données de santé (RGPD)",
                    "Téléphonie VoIP instable pour le standard"
                ],
                'twin_proposed': [
                    "Fibre Optique Certifiée HDS (Hébergement Données Santé)",
                    "Pare-feu de sécurité UTM Fortinet",
                    "Standard téléphonique Cloud Teams Phone"
                ],
                'twin_services': [
                    {"service_id": 3, "name": "Fibre HDS Dédiée", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Fibre dédiée conforme RGPD/HDS pour dossiers médicaux."},
                    {"service_id": 4, "name": "Firewall UTM Fortigate", "category": "SECURITE", "priority": "HIGH", "reasoning": "Filtrage et isolation contre menaces cyber."}
                ],
                'twin_roadmap': [
                    "Phase 1: Raccordement Fibre HDS (S1-S2)",
                    "Phase 2: Déploiement Pare-feu Fortinet (S3)",
                    "Phase 3: Migration VoIP Cloud (S4-S5)"
                ]
            },
            {
                'username': 'client_decathlon',
                'first_name': 'Antoine',
                'last_name': 'Rousseau',
                'company_name': 'Decathlon Retail',
                'sector': 'Retail & E-commerce',
                'size': 'Grande Entreprise (500+)',
                'location': 'Lille Campus',
                'twin_current': [
                    "Temps de chargement des terminaux de paiement lents",
                    "Supervision du réseau wifi magasins fragmentée",
                    "Pas de sauvegarde cloud des stocks"
                ],
                'twin_proposed': [
                    "Réseau SD-WAN multi-sites résilient",
                    "Bornes Wifi managées Cisco Meraki",
                    "Sauvegarde Cloud Azure automatisée"
                ],
                'twin_services': [
                    {"service_id": 5, "name": "Solution SD-WAN Orange", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Routage intelligent du trafic magasin vers le cloud."},
                    {"service_id": 6, "name": "Cisco Meraki Wifi", "category": "RESEAU", "priority": "HIGH", "reasoning": "Wifi sécurisé pour les clients et terminaux de stock."}
                ],
                'twin_roadmap': [
                    "Phase 1: Audit wifi magasins (S1)",
                    "Phase 2: Déploiement des routeurs SD-WAN (S2-S4)",
                    "Phase 3: Supervision Meraki (S5)"
                ]
            },
            {
                'username': 'client_backmarket',
                'first_name': 'Mélanie',
                'last_name': 'Gautier',
                'company_name': 'BackMarket HQ',
                'sector': 'Tech & Éco-responsable',
                'size': 'ETI (100-250)',
                'location': 'Bordeaux Chartrons',
                'twin_current': [
                    "Débit réseau insuffisant pour les tests serveurs",
                    "Postes de travail vulnérables aux malwares",
                    "Collaboration complexe avec les filiales étrangères"
                ],
                'twin_proposed': [
                    "Lien Fibre 10 Gbps symétrique",
                    "Solution EDR (Endpoint Detection & Response)",
                    "Outils collaboratifs unifiés Zoom & Slack Pro"
                ],
                'twin_services': [
                    {"service_id": 7, "name": "Fibre Super-Débit 10G", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Bande passante nécessaire pour le traitement de volumes de serveurs."},
                    {"service_id": 8, "name": "EDR SentinelOne", "category": "SECURITE", "priority": "HIGH", "reasoning": "Détection active des menaces et isolation automatique."}
                ],
                'twin_roadmap': [
                    "Phase 1: Raccordement Fibre 10G (S1-S3)",
                    "Phase 2: Déploiement EDR sur parc (S4)",
                    "Phase 3: Formation Cybersécurité (S5)"
                ]
            },
            {
                'username': 'client_alan',
                'first_name': 'Jérôme',
                'last_name': 'Faure',
                'company_name': 'Alan Assurance',
                'sector': 'Fintech & Assurance',
                'size': 'PME (50-100)',
                'location': 'Lyon Confluence',
                'twin_current': [
                    "Accès distants des collaborateurs lents et non chiffrés",
                    "Aucune gouvernance des mots de passe",
                    "Pas de plan de reprise d'activité (PRA)"
                ],
                'twin_proposed': [
                    "Accès ZTNA (Zero Trust Network Access)",
                    "Gestionnaire de mots de passe d'entreprise (1Password)",
                    "Plan de Reprise d'Activité sur Cloud public"
                ],
                'twin_services': [
                    {"service_id": 9, "name": "ZTNA Cloudflare", "category": "SECURITE", "priority": "CRITICAL", "reasoning": "Remplacer le VPN par un accès zéro-trust granulaire."},
                    {"service_id": 10, "name": "PRA Cloud Managé", "category": "CLOUD", "priority": "HIGH", "reasoning": "Réplication des serveurs pour redémarrage rapide en cas d'incident."}
                ],
                'twin_roadmap': [
                    "Phase 1: Déploiement ZTNA (S1-S2)",
                    "Phase 2: Mise en place du PRA (S3-S4)",
                    "Phase 3: Recette et tests d'intrusion (S5)"
                ]
            }
        ]

        for client in clients_data:
            # Create user
            u = User.objects.create_user(
                username=client['username'],
                email=f"{client['username']}@example.com",
                role=User.CLIENT_B2B,
                first_name=client['first_name'],
                last_name=client['last_name'],
                company_name=client['company_name'],
                phone='0688990011'
            )
            u.set_password(f"{client['username']}pass")
            u.save()

            # Create Enterprise
            ent = Enterprise.objects.create(
                name=client['company_name'],
                website=f"https://www.{client['username'].replace('client_', '')}.com",
                sector=client['sector'],
                approximate_size=client['size'],
                location=client['location']
            )

            # Create ClientConversation
            conv = ClientConversation.objects.create(
                client=u,
                status=ClientConversation.TRANSMITTED,
                channel=ClientConversation.PORTAL,
                extracted_profile={
                    "sector": client['sector'],
                    "company_size_estimate": client['size'],
                    "current_problems": client['twin_current'],
                    "current_tools": ["Lien ADSL standard", "Antivirus de base"],
                    "locations_count": 1,
                    "company_name": client['company_name'],
                    "location": client['location']
                }
            )

            # Mock messages
            ClientConversationMessage.objects.create(
                conversation=conv,
                sender=ClientConversationMessage.USER,
                content=f"Bonjour, je représente {client['company_name']}. Nous avons des soucis de réseau et sécurité dans nos locaux."
            )
            ClientConversationMessage.objects.create(
                conversation=conv,
                sender=ClientConversationMessage.AI,
                content=f"Bonjour ! J'ai bien noté les besoins de {client['company_name']}. Je génère votre dossier jumeau numérique et le transmets à nos équipes."
            )

            # Create ProspectDossier
            dossier = ProspectDossier.objects.create(
                source=ProspectDossier.INBOUND_CONVERSATION,
                conversation=conv,
                status=ProspectDossier.NEW,
                raw_qualification_data={
                    "profile": conv.extracted_profile,
                    "notes": f"Seeding initial de {client['company_name']} avec profil qualified."
                }
            )

            # CALL DYNAMIC DISPATCH ENGINE!
            best_assigned_kam = dispatch_dossier(dossier)

            # Create BusinessTwin
            BusinessTwin.objects.create(
                prospect_dossier=dossier,
                current_state=client['twin_current'],
                proposed_state=client['twin_proposed'],
                recommended_services=client['twin_services'],
                roadmap=client['twin_roadmap']
            )

            self.stdout.write(self.style.SUCCESS(
                f"Successfully seeded {client['company_name']} B2B client, conversation, dossier (Automatically dispatched to: {best_assigned_kam.username if best_assigned_kam else 'None'}) and business twin."
            ))

        self.stdout.write(self.style.SUCCESS('All mock accounts and multi-tenant structures seeded with intelligent dispatch!'))
