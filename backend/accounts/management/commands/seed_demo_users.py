from django.core.management.base import BaseCommand
from accounts.models import User
from sales.models import Enterprise, VisitPreparation, VisitReport
from discovery.models import ClientConversation, ClientConversationMessage
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from kam.dispatch_engine import dispatch_dossier

class Command(BaseCommand):
    help = 'Seed the database with Congolese B2B accounts, sales reps, KAMs, and business twins'

    def handle(self, *args, **kwargs):
        self.stdout.write('Purge des anciennes données pour réinitialisation complète...')
        BusinessTwin.objects.all().delete()
        ProspectDossier.objects.all().delete()
        ClientConversationMessage.objects.all().delete()
        ClientConversation.objects.all().delete()
        VisitReport.objects.all().delete()
        VisitPreparation.objects.all().delete()
        Enterprise.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write('1. Création du compte administrateur Onbora Congo...')
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@onbora.cg',
            role=User.ADMIN,
            first_name='Bienvenu',
            last_name='Mwamba',
            company_name='Onbora Congo MSP',
            phone='+243810000999'
        )
        admin_user.set_password('adminpass')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        self.stdout.write('2. Création des comptes commerciaux (Sales & Prospecteurs)...')
        sales_configs = [
            {
                'username': 'commercial',
                'email': 'commercial@onbora.cg',
                'password': 'demo123',
                'first_name': 'Dieudonné',
                'last_name': 'Mukendi',
                'phone': '+243810000001'
            },
            {
                'username': 'sales1',
                'email': 'sales1@onbora.cg',
                'password': 'sales1pass',
                'first_name': 'Grace',
                'last_name': 'Kambale',
                'phone': '+243820000002'
            },
            {
                'username': 'sales2',
                'email': 'sales2@onbora.cg',
                'password': 'sales2pass',
                'first_name': 'Patrick',
                'last_name': 'Bondo',
                'phone': '+242060000003'
            },
        ]
        
        for cfg in sales_configs:
            u = User.objects.create_user(
                username=cfg['username'],
                email=cfg['email'],
                role=User.SALESPERSON,
                first_name=cfg['first_name'],
                last_name=cfg['last_name'],
                phone=cfg['phone']
            )
            u.set_password(cfg['password'])
            u.save()

        self.stdout.write('3. Création des comptes Key Account Managers (KAM) en RDC & Congo-Brazzaville...')
        kam_configs = [
            {
                'username': 'kam1',
                'email': 'kam1@onbora.cg',
                'first_name': 'Chantal',
                'last_name': 'Kanyinda',
                'phone': '+243850000010',
                'location': 'Kinshasa',
                'is_available': True
            },
            {
                'username': 'kam2',
                'email': 'kam2@onbora.cg',
                'first_name': 'Serge',
                'last_name': 'Mavinga',
                'phone': '+242050000020',
                'location': 'Brazzaville',
                'is_available': True
            },
            {
                'username': 'kam3',
                'email': 'kam3@onbora.cg',
                'first_name': 'Junior',
                'last_name': 'Ilunga',
                'phone': '+243990000030',
                'location': 'Lubumbashi',
                'is_available': True
            },
        ]
        for cfg in kam_configs:
            u = User.objects.create_user(
                username=cfg['username'],
                email=cfg['email'],
                role=User.KAM,
                first_name=cfg['first_name'],
                last_name=cfg['last_name'],
                phone=cfg['phone'],
                location=cfg['location'],
                is_available=cfg['is_available']
            )
            u.set_password(f"{cfg['username']}pass")
            u.save()

        self.stdout.write('4. Création des comptes entreprises & prospects B2B congolais...')
        clients_data = [
            {
                'username': 'client_rawbank',
                'first_name': 'Mustapha',
                'last_name': 'Rawji',
                'company_name': 'RAWBANK RDC',
                'sector': 'Banque & Finance',
                'size': 'Grande Entreprise (1000+ empl.)',
                'location': 'Kinshasa (Gombe)',
                'website': 'https://www.rawbank.cd',
                'twin_current': [
                    "Interconnexion VSAT satellite lente entre agences de province",
                    "Coupures récurrentes de la fibre principale à Kinshasa",
                    "Besoins de sauvegarde hautement sécurisée des transactions bancaires"
                ],
                'twin_proposed': [
                    "Liaison Fibre Optique Dédiée Sécurisée 1 Gbps avec secours 4G/5G",
                    "Infrastructure Cloud privé hybride certifié ISO 27001",
                    "Pare-feu de sécurité applicative Next-Gen Fortinet"
                ],
                'twin_services': [
                    {"service_id": 1, "name": "Fibre Optique Pro Dédiée", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Débit symétrique garanti et secours automatique."},
                    {"service_id": 3, "name": "Pare-feu Managé UTM", "category": "SECURITE", "priority": "CRITICAL", "reasoning": "Sécurisation bancaire selon normes PCI-DSS."}
                ],
                'twin_roadmap': [
                    "Étape 1: Raccordement Fibre Agence Principale Gombe (S1-S2)",
                    "Étape 2: Migration du backup transactionnel vers Cloud (S3)",
                    "Étape 3: Déploiement Sécurité multi-agences (S4-S5)"
                ]
            },
            {
                'username': 'client_vodacom',
                'first_name': 'Jean-Marc',
                'last_name': 'Kalonji',
                'company_name': 'Vodacom Congo Business',
                'sector': 'Télécommunications',
                'size': 'Grande Entreprise (500+ empl.)',
                'location': 'Kinshasa (Boulevard du 30 Juin)',
                'website': 'https://www.vodacom.cd',
                'twin_current': [
                    "Charge importante sur les serveurs de traitement de la monnaie électronique M-Pesa",
                    "Besoins d'optimisation des flux inter-sites Kinshasa-Lubumbashi-Goma"
                ],
                'twin_proposed': [
                    "SD-WAN Haute Performance multi-opérateurs",
                    "Plateforme de collaboration unifiée Microsoft 365 Enterprise"
                ],
                'twin_services': [
                    {"service_id": 2, "name": "Microsoft 365 Business Premium & Teams", "category": "COLLAB", "priority": "HIGH", "reasoning": "Pour les équipes dispersées sur le territoire congolais."}
                ],
                'twin_roadmap': [
                    "Étape 1: Audit des flux réseau inter-provinces (S1)",
                    "Étape 2: Déploiement Teams Phone et M365 (S2-S3)"
                ]
            },
            {
                'username': 'client_tfm',
                'first_name': 'Chantale',
                'last_name': 'Tshilombo',
                'company_name': 'Tenke Fungurume Mining (TFM)',
                'sector': 'Mines & Industrie',
                'size': 'Grande Entreprise (2000+ empl.)',
                'location': 'Lubumbashi (Lualaba)',
                'website': 'https://www.tfm.cd',
                'twin_current': [
                    "Zone minière isolée avec connectivité réseau instable",
                    "Besoin de suivi IoT des engins et de sauvegarde cloud sécurisée"
                ],
                'twin_proposed': [
                    "Fibre Optique Minière dédiée avec antenne Starlink Business secours",
                    "Hébergement et Sauvegarde Cloud Privé"
                ],
                'twin_services': [
                    {"service_id": 1, "name": "Fibre Optique Pro", "category": "RESEAU", "priority": "CRITICAL", "reasoning": "Connectivité haute disponibilité pour la mine."}
                ],
                'twin_roadmap': [
                    "Étape 1: Tirage de la fibre du site minier (S1-S4)",
                    "Étape 2: Mise en place de la sauvegarde automatique (S5)"
                ]
            },
        ]

        for client in clients_data:
            u = User.objects.create_user(
                username=client['username'],
                email=f"{client['username']}@onbora.cg",
                role=User.CLIENT_B2B,
                first_name=client['first_name'],
                last_name=client['last_name'],
                company_name=client['company_name'],
                phone='+243890000100'
            )
            u.set_password(f"{client['username']}pass")
            u.save()

            ent = Enterprise.objects.create(
                name=client['company_name'],
                website=client['website'],
                sector=client['sector'],
                approximate_size=client['size'],
                location=client['location']
            )

            conv = ClientConversation.objects.create(
                client=u,
                status=ClientConversation.TRANSMITTED,
                channel=ClientConversation.PORTAL,
                extracted_profile={
                    "sector": client['sector'],
                    "company_size_estimate": client['size'],
                    "current_problems": client['twin_current'],
                    "current_tools": ["Lien satellite VSAT", "Antivirus local"],
                    "locations_count": 3,
                    "company_name": client['company_name'],
                    "location": client['location']
                }
            )

            ClientConversationMessage.objects.create(
                conversation=conv,
                sender=ClientConversationMessage.USER,
                content=f"Bonjour Onbora, nous représentons {client['company_name']}. Nous souhaitons moderniser nos télécoms et sécuriser notre infrastructure en RDC."
            )
            ClientConversationMessage.objects.create(
                conversation=conv,
                sender=ClientConversationMessage.AI,
                content=f"Bonjour ! J'ai bien enregistré les besoins de {client['company_name']}. Votre dossier jumeau numérique a été transmis au KAM pour raccordement."
            )

            dossier = ProspectDossier.objects.create(
                source=ProspectDossier.INBOUND_CONVERSATION,
                conversation=conv,
                status=ProspectDossier.NEW,
                raw_conversation_data={
                    "profile": conv.extracted_profile,
                    "notes": f"Prospect qualifié congolais: {client['company_name']}"
                }
            )

            best_assigned_kam = dispatch_dossier(dossier)

            BusinessTwin.objects.create(
                prospect_dossier=dossier,
                current_state=client['twin_current'],
                proposed_state=client['twin_proposed'],
                recommended_services=client['twin_services'],
                roadmap=client['twin_roadmap']
            )

            self.stdout.write(self.style.SUCCESS(
                f"Client congolais {client['company_name']} créé avec succès et assigné au KAM: {best_assigned_kam.username if best_assigned_kam else 'None'}"
            ))

        self.stdout.write(self.style.SUCCESS('Comptes de démo congolais (Commercial: commercial / demo123) créés avec succès !'))
