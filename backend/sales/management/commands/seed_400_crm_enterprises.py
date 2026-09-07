import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from sales.models import Plaque, Enterprise, SegmentationConfig

class Command(BaseCommand):
    help = "Seed the database with 400 realistic Congolese CRM enterprises, segmentation configuration, and converted accounts."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initialisation de la configuration de segmentation CRM..."))
        
        config, created = SegmentationConfig.objects.get_or_create(
            id=1,
            defaults={
                'tpe_max_revenue': Decimal('100000.00'),
                'pme_max_revenue': Decimal('1000000.00'),
                'backoffice_entity_label': 'Back-Office Terrain',
                'kam_entity_label': 'Direction KAM & Grands Comptes'
            }
        )
        if not created:
            config.tpe_max_revenue = Decimal('100000.00')
            config.pme_max_revenue = Decimal('1000000.00')
            config.save()
        self.stdout.write(self.style.SUCCESS(f"Configuration Segmentation active: TPE < {config.tpe_max_revenue}$ | PME < {config.pme_max_revenue}$ | Grands Comptes >= {config.pme_max_revenue}$"))

        # Création ou vérification des plaques territoriales principales
        plaques_data = [
            {"code": "KIN-GOMBE", "name": "Kinshasa - Gombe (Centre d'affaires)", "city": "Kinshasa", "lat": -4.3033, "lon": 15.3083, "radius": 4.5},
            {"code": "KIN-LIMETE", "name": "Kinshasa - Limete (Zone Industrielle & Résidentielle)", "city": "Kinshasa", "lat": -4.3512, "lon": 15.3376, "radius": 5.0},
            {"code": "KIN-LINGWALA", "name": "Kinshasa - Lingwala & Barumbu (Commercial)", "city": "Kinshasa", "lat": -4.3180, "lon": 15.3020, "radius": 3.8},
            {"code": "KIN-NGALIEMA", "name": "Kinshasa - Ngaliema & Kintambo (Tertiaire & Ambassades)", "city": "Kinshasa", "lat": -4.3315, "lon": 15.2630, "radius": 6.0},
            {"code": "KIN-MASINA", "name": "Kinshasa - Masina & N'djili (Commerces & Marchés)", "city": "Kinshasa", "lat": -4.3820, "lon": 15.3950, "radius": 5.5},
            {"code": "LSH-CENTRE", "name": "Lubumbashi - Centre Ville & Quartier Industriel", "city": "Lubumbashi", "lat": -11.6609, "lon": 27.4794, "radius": 6.0},
            {"code": "LSH-RUASHI", "name": "Lubumbashi - Ruashi & Kampemba", "city": "Lubumbashi", "lat": -11.6250, "lon": 27.5250, "radius": 5.0},
            {"code": "KWZ-MINES", "name": "Kolwezi - Pôle Minier & Logistique", "city": "Kolwezi", "lat": -10.7167, "lon": 25.4667, "radius": 8.0},
            {"code": "MAT-PORT", "name": "Matadi - Port International & Transit", "city": "Matadi", "lat": -5.8167, "lon": 13.4500, "radius": 4.5},
            {"code": "BZV-CENTRE", "name": "Brazzaville - Centre & Plateau", "city": "Brazzaville", "lat": -4.2634, "lon": 15.2832, "radius": 5.0},
        ]
        
        plaque_objs = {}
        for p in plaques_data:
            plq, _ = Plaque.objects.get_or_create(
                code=p["code"],
                defaults={
                    "name": p["name"],
                    "city": p["city"],
                    "latitude": p["lat"],
                    "longitude": p["lon"],
                    "radius_km": p["radius"],
                    "is_active": True
                }
            )
            plaque_objs[p["code"]] = plq

        # Vérification d'utilisateurs convertisseurs
        supervisor_user = User.objects.filter(role=User.SUPERVISOR).first()
        kam_user = User.objects.filter(role=User.KAM).first()
        admin_user = User.objects.filter(role=User.ADMIN).first()

        # Banques de noms réalistes
        # 1. Grands Comptes (~70)
        grands_comptes_templates = [
            ("Rawbank RDC Siège", "Banque & Finance", "rawbank.cd", "Kinshasa", "Gombe", -4.3025, 15.3090, 245000000, 3200, 48, "Mustapha Rawji", "Directeur Général", "KIN-GOMBE"),
            ("EquityBCDC Direction Générale", "Banque & Finance", "equitybcdc.cd", "Kinshasa", "Gombe", -4.3040, 15.3075, 198000000, 2800, 52, "Célestin Mukeba", "Directeur Général", "KIN-GOMBE"),
            ("Trust Merchant Bank (TMB) Siège", "Banque & Finance", "tmb.cd", "Lubumbashi", "Centre", -11.6620, 27.4810, 142000000, 1900, 35, "Oliver Meisenberg", "Directeur Général", "LSH-CENTRE"),
            ("Sofibanque Siège", "Banque & Finance", "sofibanque.com", "Kinshasa", "Gombe", -4.3015, 15.3110, 78000000, 650, 14, "Henry Wazne", "Administrateur Directeur Général", "KIN-GOMBE"),
            ("FBNBank RDC Siège", "Banque & Finance", "fbnbankrdc.com", "Kinshasa", "Gombe", -4.3055, 15.3060, 65000000, 520, 16, "Akeem Oladele", "Directeur Général", "KIN-GOMBE"),
            ("Tenke Fungurume Mining (TFM)", "Mines & Métallurgie", "tfm.cd", "Kolwezi", "Zone Minière", -10.5833, 26.1833, 310000000, 4200, 8, "Chantal Tshilombo", "Directrice des Systèmes d'Information", "KWZ-MINES"),
            ("Kamoto Copper Company (KCC - Glencore)", "Mines & Métallurgie", "katangamining.com", "Kolwezi", "Kamoto", -10.7200, 25.4300, 285000000, 3900, 6, "Mark Davis", "Directeur Général des Opérations", "KWZ-MINES"),
            ("Kamoa-Kakula Mining Complex (Ivanhoe)", "Mines & Métallurgie", "ivanhoemines.com", "Kolwezi", "Kakula", -10.8500, 25.3200, 290000000, 3500, 5, "Annebel Oosthuizen", "VP Commercial & IT", "KWZ-MINES"),
            ("Mutanda Mining (MUMI)", "Mines & Métallurgie", "mutandamining.com", "Kolwezi", "Mutanda", -10.7800, 25.5500, 175000000, 2400, 4, "Patrice Lwamba", "Head of Digital Infrastructure", "KWZ-MINES"),
            ("Kibali Gold Mines (Barrick Gold)", "Mines & Métallurgie", "barrick.com", "Kinshasa", "Gombe", -4.3038, 15.3050, 210000000, 2800, 6, "Cyrille Mutombo", "Country Manager RDC", "KIN-GOMBE"),
            ("Société Minière de Bisunzu (SMB)", "Mines & Métallurgie", "smb-rdc.com", "Kinshasa", "Gombe", -4.3060, 15.3095, 48000000, 850, 3, "Ben Mwangachuchu", "Directeur Général", "KIN-GOMBE"),
            ("Chemaf SAS Siège", "Mines & Métallurgie", "chemaf.com", "Lubumbashi", "Ruashi", -11.6350, 27.5100, 88000000, 1400, 4, "Shiraz Virji", "Directeur Exécutif", "LSH-RUASHI"),
            ("Ruashi Mining SAS", "Mines & Métallurgie", "ruashimining.com", "Lubumbashi", "Ruashi", -11.6280, 27.5300, 115000000, 1650, 3, "Grant Stuart", "General Manager IT & Automation", "LSH-RUASHI"),
            ("Vodacom Congo Direction Générale", "Télécoms & IT", "vodacom.cd", "Kinshasa", "Gombe", -4.3020, 15.3140, 260000000, 1800, 32, "Khalil Al Americani", "Directeur Général", "KIN-GOMBE"),
            ("Airtel RDC Direction Générale", "Télécoms & IT", "airtel.cd", "Kinshasa", "Gombe", -4.3045, 15.3125, 230000000, 1600, 28, "Emmanuel Eyamba", "Directeur B2B Entreprises", "KIN-GOMBE"),
            ("Africell RDC Direction Générale", "Télécoms & IT", "africell.cd", "Kinshasa", "Gombe", -4.3065, 15.3040, 85000000, 950, 18, "Milad Khairallah", "Directeur Commercial", "KIN-GOMBE"),
            ("SNEL Siège National", "Énergie & Eau", "snel.cd", "Kinshasa", "Gombe", -4.3080, 15.3030, 160000000, 4500, 60, "Fabrice Lusinde", "Directeur Général", "KIN-GOMBE"),
            ("Regideso Direction Générale", "Énergie & Eau", "regideso.cd", "Kinshasa", "Gombe", -4.3090, 15.3015, 120000000, 3800, 45, "David Tshilumba", "Directeur Général", "KIN-GOMBE"),
            ("Perenco RDC Exploration & Production", "Énergie & Pétrole", "perenco.com", "Kinshasa", "Gombe", -4.3028, 15.3105, 195000000, 1200, 5, "Frédéric Chevalier", "Directeur Général RDC", "KIN-GOMBE"),
            ("SEP Congo (Services des Entreprises Pétrolières)", "Énergie & Pétrole", "sepcongo.com", "Kinshasa", "Gombe", -4.3070, 15.3080, 135000000, 1750, 12, "Joseph Kouame", "Directeur Technique & DSI", "KIN-GOMBE"),
            ("TotalEnergies Marketing RDC", "Énergie & Pétrole", "totalenergies.cd", "Kinshasa", "Gombe", -4.3050, 15.3115, 110000000, 780, 38, "Patrice Muteba", "Responsable Achats & Télécoms", "KIN-GOMBE"),
            ("Cobil SA Siège", "Énergie & Pétrole", "cobil.cd", "Kinshasa", "Gombe", -4.3062, 15.3070, 75000000, 620, 22, "Georges Yamba", "Directeur Général", "KIN-GOMBE"),
            ("Bralima SAS (Heineken RDC)", "Industrie & Brasserie", "bralima.cd", "Kinshasa", "Barumbu", -4.3120, 15.3180, 180000000, 2200, 6, "Laurent Kovacs", "Directeur Général", "KIN-LINGWALA"),
            ("Bracongo SA (Castel RDC)", "Industrie & Brasserie", "bracongo.cd", "Kinshasa", "Limete", -4.3480, 15.3320, 155000000, 1950, 5, "Cyril Segonds", "Directeur Général", "KIN-LIMETE"),
            ("Marsavco SA Siège Industriel", "Industrie & Agroalimentaire", "marsavco.com", "Kinshasa", "Gombe", -4.3085, 15.3150, 92000000, 1400, 4, "Bijal Patel", "Directeur Général Adjoint", "KIN-GOMBE"),
            ("Cimenterie de Lukala (CILU)", "Industrie & BTP", "cilu.cd", "Kinshasa", "Gombe", -4.3042, 15.3098, 85000000, 980, 4, "Marc Vandevelde", "Directeur Commercial & Appro", "KIN-GOMBE"),
            ("PPC Barnet RDC", "Industrie & BTP", "ppc.cd", "Kinshasa", "Gombe", -4.3035, 15.3088, 65000000, 720, 3, "Iqbal Omar", "Head of Supply Chain", "KIN-GOMBE"),
            ("Minoterie de Matadi (MIDEMA)", "Industrie & Agroalimentaire", "midema.cd", "Matadi", "Port", -5.8150, 13.4480, 72000000, 850, 4, "Jean-Claude Ndangi", "Directeur d'Usine", "MAT-PORT"),
            ("Africa Global Logistics RDC (AGL / Ex-Bolloré)", "Transport & Logistique", "aglgroup.com", "Kinshasa", "Gombe", -4.3052, 15.3065, 145000000, 1850, 14, "Pierre Bellerose", "Directeur Régional RDC-Congo", "KIN-GOMBE"),
            ("Lignes Maritimes Congolaises (LMC)", "Transport & Logistique", "lmc.cd", "Kinshasa", "Gombe", -4.3075, 15.3045, 38000000, 920, 5, "Jean-Marie Mpoyi", "DSI & Télécoms", "KIN-GOMBE"),
            ("Onatra SA Direction Générale", "Transport & Logistique", "onatra.cd", "Kinshasa", "Gombe", -4.3088, 15.3058, 55000000, 4100, 18, "Martin Lukusa", "Directeur Général", "KIN-GOMBE"),
            ("Congo Airways Siège", "Transport & Aviation", "congoairways.com", "Kinshasa", "Gombe", -4.3060, 15.3085, 42000000, 480, 6, "Léonard Mutamba", "Directeur des Opérations Aériennes", "KIN-GOMBE"),
            ("Compagnie Africaine d'Aviation (FlyCAA)", "Transport & Aviation", "flycaa.com", "Kinshasa", "Barumbu", -4.3160, 15.3210, 58000000, 620, 8, "David Blattner", "Directeur Général", "KIN-LINGWALA"),
            ("Transco Siège Social", "Transport & Logistique", "transco.cd", "Kinshasa", "Limete", -4.3520, 15.3350, 24000000, 1600, 6, "Cyprien Mbere", "Directeur Général", "KIN-LIMETE"),
            ("Pullman Grand Hôtel Kinshasa", "Hôtellerie & Tourisme", "pullmanhotels.com", "Kinshasa", "Gombe", -4.3010, 15.2980, 28000000, 550, 2, "Thierry De Jaham", "Directeur Général", "KIN-GOMBE"),
            ("Fleuve Congo Hotel by Blazon", "Hôtellerie & Tourisme", "fleuvecongohotel.com", "Kinshasa", "Gombe", -4.3005, 15.2950, 32000000, 600, 2, "Adham El Khateeb", "General Manager", "KIN-GOMBE"),
            ("Grand Karavia Hotel Lubumbashi", "Hôtellerie & Tourisme", "grandkaravia.com", "Lubumbashi", "Centre", -11.6580, 27.4650, 18000000, 380, 2, "Patrick Kalala", "Responsable Exploitation IT", "LSH-CENTRE"),
            ("Hôtel Memling Kinshasa", "Hôtellerie & Tourisme", "memling.net", "Kinshasa", "Gombe", -4.3068, 15.3072, 16000000, 340, 1, "Anne-Marie Delcroix", "Directrice d'Exploitation", "KIN-GOMBE"),
        ]

        # 2. PME Templates (~140)
        pme_base_sectors = [
            ("Clinique Ngaliema", "Santé & Hôpitaux", "Kinshasa", "Ngaliema", -4.3290, 15.2650, 850000, 120, 3, "Dr Jean-Paul Mbayo", "Médecin Directeur", "KIN-NGALIEMA"),
            ("Centre Médical de Kinshasa (CMK)", "Santé & Hôpitaux", "Kinshasa", "Gombe", -4.3055, 15.3035, 950000, 140, 4, "Dr Rodolphe Ahmad", "Directeur Administratif", "KIN-GOMBE"),
            ("HJ Hospitals RDC", "Santé & Hôpitaux", "Kinshasa", "Limete", -4.3450, 15.3400, 920000, 160, 3, "Harish Jagtani", "Président Directeur Général", "KIN-LIMETE"),
            ("Centre Hospitalier Monkole", "Santé & Hôpitaux", "Kinshasa", "Ngaliema", -4.3650, 15.2480, 780000, 190, 3, "Dr Céline Tshika", "Directrice Médicale", "KIN-NGALIEMA"),
            ("Université Protestante au Congo (UPC)", "Éducation & Recherche", "Kinshasa", "Lingwala", -4.3210, 15.2980, 680000, 220, 2, "Prof Daniel Ngoy", "Secrétaire Général Académique", "KIN-LINGWALA"),
            ("Collège Boboto Kinshasa", "Éducation & Recherche", "Kinshasa", "Gombe", -4.3080, 15.3005, 420000, 85, 2, "Père Baudouin Mubesala", "Recteur", "KIN-GOMBE"),
            ("Lycée Français René Descartes", "Éducation & Recherche", "Kinshasa", "Gombe", -4.3048, 15.2990, 580000, 95, 2, "Christophe Grimonpon", "Proviseur", "KIN-GOMBE"),
            ("KPMG RDC Advisory", "Audit & Conseils", "Kinshasa", "Gombe", -4.3032, 15.3078, 890000, 65, 2, "Alain Nzinga", "Senior Partner IT Advisory", "KIN-GOMBE"),
            ("PricewaterhouseCoopers (PwC) RDC", "Audit & Conseils", "Kinshasa", "Gombe", -4.3022, 15.3082, 940000, 70, 2, "Benjamin Nzailu", "Country Managing Partner", "KIN-GOMBE"),
            ("Deloitte RDC Kinshasa", "Audit & Conseils", "Kinshasa", "Gombe", -4.3018, 15.3092, 880000, 60, 2, "Marc Wabi", "Directeur Général Associé", "KIN-GOMBE"),
            ("CFAO Motors RDC", "Automobile & Matériel", "Kinshasa", "Limete", -4.3490, 15.3340, 980000, 85, 3, "Pascal De Boissieu", "Directeur Filiale RDC", "KIN-LIMETE"),
            ("Tractafric Motors RDC", "Automobile & Matériel", "Kinshasa", "Limete", -4.3505, 15.3360, 890000, 75, 2, "Gilles Martin", "Directeur Général", "KIN-LIMETE"),
            ("Delta Protection RDC", "Sécurité & Gardiennage", "Kinshasa", "Gombe", -4.3072, 15.3025, 750000, 650, 4, "Frédéric Mampuya", "Directeur des Opérations", "KIN-GOMBE"),
            ("Magenya Protection Kinshasa", "Sécurité & Gardiennage", "Kinshasa", "Limete", -4.3470, 15.3385, 620000, 480, 3, "Colonel Roger Kibasa", "Président Fondateur", "KIN-LIMETE"),
            ("Société de Distribution Congolaise (SODIMICO Distribution)", "Distribution & Commerce", "Lubumbashi", "Centre", -11.6640, 27.4830, 820000, 45, 3, "Christian Mwanza", "Directeur Commercial", "LSH-CENTRE"),
            ("Groupe Minoterie du Katanga (GMK)", "Agroalimentaire", "Lubumbashi", "Kampemba", -11.6700, 27.4950, 760000, 110, 2, "Thierry Kasongo", "Directeur d'Exploitation", "LSH-RUASHI"),
            ("Burotop Iris RDC", "Télécoms & IT B2B", "Kinshasa", "Gombe", -4.3045, 15.3068, 920000, 55, 3, "Imad Bou Antoun", "Directeur Commercial", "KIN-GOMBE"),
            ("Socodec BTP Ingénierie", "Construction & BTP", "Kinshasa", "Limete", -4.3530, 15.3390, 810000, 90, 4, "Patrice Ntambwe", "Directeur Technique", "KIN-LIMETE"),
            ("Pharmacie Principale de Kinshasa", "Santé & Pharmacie", "Kinshasa", "Gombe", -4.3060, 15.3080, 540000, 35, 3, "Dr Sophie Mukendi", "Pharmacienne Gérante", "KIN-GOMBE"),
            ("Société Congolaise de Transit (SOCOTRANS)", "Logistique & Transit", "Matadi", "Port", -5.8175, 13.4520, 670000, 45, 2, "Édouard Luvualu", "Gérant Associé", "MAT-PORT"),
        ]

        # 3. TPE / Informel / Micro-entreprises (~190)
        tpe_templates = [
            ("Quincaillerie Moderne de Limete", "Commerce & Quincaillerie", "Limete", -4.3510, 15.3380, 58000, 8, "Papa Alidor Mbemba", "Gérant Propriétaire", "KIN-LIMETE"),
            ("Atelier Chaudronnerie & Soudure Bandal", "Artisanat & Métallurgie", "Lingwala", -4.3220, 15.2990, 32000, 6, "Maître Jean-Pierre Fula", "Chef d'Atelier", "KIN-LINGWALA"),
            ("Dépôt Vivres Frais Marché Gambela", "Alimentation & Distribution", "Lingwala", -4.3250, 15.3030, 75000, 9, "Maman Antoinette Kiese", "Gérante Dépôt", "KIN-LINGWALA"),
            ("Boutique High-Tech Express Zando", "Commerce Électronique", "Barumbu", -4.3150, 15.3120, 42000, 4, "Patrick Bola", "Responsable Vente", "KIN-LINGWALA"),
            ("Pharmacie Sainte-Marie Kasa-Vubu", "Santé de Proximité", "Lingwala", -4.3280, 15.3050, 68000, 5, "Mme Marie-Claire Mbombo", "Gérante", "KIN-LINGWALA"),
            ("Garage Automobile La Confiance Limete", "Services & Mécanique", "Limete", -4.3540, 15.3350, 49000, 10, "Dieudonné Makiese", "Maître Garagiste", "KIN-LIMETE"),
            ("Chambre Froide du Peuple Masina", "Alimentation & Surgelés", "Masina", -4.3810, 15.3920, 82000, 11, "Serge Lukoki", "Directeur d'Exploitation", "KIN-MASINA"),
            ("Atelier Menuiserie Ébénisterie Kintambo", "Artisanat du Bois", "Ngaliema", -4.3330, 15.2710, 28000, 5, "Moïse Nzuzi", "Artisan Ébéniste", "KIN-NGALIEMA"),
            ("Imprimerie Sérigraphie Moderne Gombe", "Imprimerie & Graphisme", "Gombe", -4.3070, 15.3040, 64000, 7, "Cédric Ilunga", "Directeur Technique", "KIN-GOMBE"),
            ("Boulangerie Pâtisserie Le Délice Limete", "Alimentation & Restauration", "Limete", -4.3495, 15.3370, 89000, 12, "Alain Tshibuabua", "Maître Boulanger", "KIN-LIMETE"),
            ("Papeterie & Fournitures Scolaires Victoire", "Commerce & Fournitures", "Lingwala", -4.3295, 15.3080, 36000, 4, "Maman Bijou Kalala", "Gérante", "KIN-LINGWALA"),
            ("Cyber Business & Multi-Services Gombe", "Bureautique & Connectivité", "Gombe", -4.3050, 15.3090, 45000, 5, "Eric Mutombo", "Administrateur", "KIN-GOMBE"),
            ("Cabinet Médical La Grâce Masina", "Santé de Proximité", "Masina", -4.3840, 15.3980, 52000, 6, "Dr Aimé Matondo", "Médecin Gérant", "KIN-MASINA"),
            ("Quincaillerie Centrale Ruashi", "Commerce & Quincaillerie", "Lubumbashi", -11.6260, 27.5280, 61000, 7, "Joseph Kapend", "Gérant", "LSH-RUASHI"),
            ("Atelier Confection Textile & Mode Bandal", "Textile & Mode", "Lingwala", -4.3240, 15.2970, 24000, 6, "Mme Chantal Kapinga", "Créatrice Directrice", "KIN-LINGWALA"),
            ("Dépôt Ciment & Agrégats Kolwezi Cité", "Matériaux & BTP", "Kolwezi", -10.7180, 25.4700, 72000, 8, "Gaston Muteb", "Propriétaire", "KWZ-MINES"),
            ("Station Lavage & Pneus Express Limete", "Services & Automobile", "Limete", -4.3560, 15.3340, 19000, 5, "Dady Bope", "Responsable", "KIN-LIMETE"),
            ("Alimentation Générale Marché Liberté", "Alimentation & Retail", "Masina", -4.3805, 15.3960, 78000, 9, "Maman Fifi Ngalula", "Commerçante", "KIN-MASINA"),
            ("Boutique Électroménager & Froid Matadi", "Commerce de Détail", "Matadi", -5.8190, 13.4510, 63000, 6, "Symphorien Kanza", "Gérant", "MAT-PORT"),
            ("Atelier Métallique Ruashi Sud", "Artisanat & Métallurgie", "Lubumbashi", -11.6310, 27.5210, 31000, 5, "Jules Kyungu", "Chef d'Atelier", "LSH-RUASHI")
        ]

        # Purge des entreprises existantes pour avoir exactement les 400 entreprises CRM
        self.stdout.write("Purge des anciennes entreprises de test...")
        Enterprise.objects.all().delete()

        created_enterprises = []
        operators = ["Vodacom", "Airtel", "Africell", "Canalbox", "VSAT Inmarsat", "Aucun (Modem 4G)"]
        connectivities = ["Fibre Optique Dédiée", "Fibre FTTH", "Faisceau Hertzien", "4G LTE Pro", "VSAT Dédié", "Aucun"]
        offers_kam = ["Fibre Entreprise Dédiée 100 Mbps", "SD-WAN Managé Multi-sites", "Cloud Backup & Datacenter Hybride", "MPLS Inter-villes 50M", "Cybersecurity Pack EDR + Firewall Managé"]
        offers_bo = ["Pack TPE Connect 20M + Voip", "Fibre Pro PME 50M", "Box Routeur 4G Secours Pro", "Accès Fibre de Quartier 30M", "Liaison Point-à-Point Commerce"]

        rccm_counter = 1000

        # 1. Génération des Grands Comptes (70 entreprises)
        self.stdout.write("1/3 Génération des Grands Comptes (CA >= 1M USD -> KAM Office)...")
        gc_count = 70
        for i in range(gc_count):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            if i < len(grands_comptes_templates):
                t = grands_comptes_templates[i]
                name, sector, web, city, commune, lat, lon, rev, emp, sites, contact, role, p_code = t
            else:
                base_t = grands_comptes_templates[i % len(grands_comptes_templates)]
                suffix = f"Division {(i // len(grands_comptes_templates)) + 1}"
                name = f"{base_t[0]} - {suffix}"
                sector = base_t[1]
                web = base_t[2]
                city = base_t[3]
                commune = base_t[4]
                lat = base_t[5] + random.uniform(-0.015, 0.015)
                lon = base_t[6] + random.uniform(-0.015, 0.015)
                rev = int(base_t[7] * random.uniform(0.6, 1.4))
                emp = int(base_t[8] * random.uniform(0.7, 1.3))
                sites = max(3, int(base_t[9] * random.uniform(0.5, 1.2)))
                contact = f"{base_t[10]} (Adjoint)"
                role = "Directeur Général Délégué"
                p_code = base_t[12]

            # Segmentation & Affectation
            segment = "GRAND_COMPTE"
            assigned_entity = "KAM_OFFICE"

            # Conversion status
            rnd = random.random()
            if rnd < 0.28:
                c_status = "CONVERTED"
                c_entity = "KAM_OFFICE"
                c_amount = Decimal(str(random.randint(25000, 180000)))
                c_offer = random.choice(offers_kam)
                c_date = timezone.now() - timedelta(days=random.randint(5, 180))
                c_notes = f"Contrat C-Level signé après soutenance d'architecture. Offre retenue : {c_offer}. Déploiement multi-sites validé par la DSI."
            elif rnd < 0.65:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Étude d'éligibilité fibre en cours. Rendez-vous de cadrage prévu avec le Directeur des Achats."
            elif rnd < 0.95:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Compte identifié via le CRM. Dossier attribué au pool KAM Grands Comptes."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Contrat concurrent renouvelé pour 12 mois. À relancer au T4."

            ent = Enterprise(
                crm_id=crm_id,
                name=name,
                website=f"https://www.{web}" if not web.startswith("http") else web,
                sector=sector,
                approximate_size=f"{emp} collaborateurs ({sites} sites)",
                location=f"{city}, Commune de {commune}",
                plaque=plaque_objs[p_code].name,
                plaque_rel=plaque_objs[p_code],
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev)),
                employee_count=emp,
                site_count=sites,
                rccm=f"CD/KNG/RCCM/{random.randint(12,24)}-B-{rccm_counter}",
                id_nat=f"01-83-N{random.randint(10000,99999)}W",
                nif=f"A{random.randint(1000000,9999999)}K",
                city=city,
                commune=commune,
                address=f"{random.randint(1, 140)} Boulevard / Avenue principale, {commune}",
                contact_name=contact,
                contact_role=role,
                contact_phone=f"+24381{random.randint(1000000,9999999)}",
                contact_email=f"{contact.lower().replace(' ', '.').replace('(', '').replace(')', '')}@{web.split('/')[0]}",
                current_operator=random.choice(operators[:3]),
                current_connectivity=random.choice(connectivities[:3]),
                segment=segment,
                assigned_entity=assigned_entity,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=kam_user,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(80, 98),
                recommended_solution=random.choice(offers_kam),
                created_at=timezone.now() - timedelta(days=random.randint(30, 365))
            )
            created_enterprises.append(ent)

        # 2. Génération des PME (140 entreprises, 100k <= CA < 1M USD -> KAM Office)
        self.stdout.write("2/3 Génération des PME (100k <= CA < 1M USD -> KAM Office)...")
        pme_count = 140
        for i in range(pme_count):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            base_t = pme_base_sectors[i % len(pme_base_sectors)]
            multiplier = (i // len(pme_base_sectors)) + 1
            suffix = f"Agence {multiplier}" if multiplier > 1 else ""
            ent_name = f"{base_t[0]} {suffix}".strip()
            
            lat = base_t[4] + random.uniform(-0.012, 0.012)
            lon = base_t[5] + random.uniform(-0.012, 0.012)
            rev = max(110000, min(980000, int(base_t[6] * random.uniform(0.7, 1.3))))
            emp = max(15, int(base_t[7] * random.uniform(0.7, 1.3)))
            sites = base_t[8]
            p_code = base_t[11]

            segment = "PME"
            assigned_entity = "KAM_OFFICE"

            rnd = random.random()
            if rnd < 0.22:
                c_status = "CONVERTED"
                c_entity = "KAM_OFFICE"
                c_amount = Decimal(str(random.randint(12000, 48000)))
                c_offer = random.choice(offers_kam)
                c_date = timezone.now() - timedelta(days=random.randint(10, 160))
                c_notes = f"Contrat PME validé par le gérant. Offre souscrite : {c_offer}. Raccordement prioritaire en cours."
            elif rnd < 0.60:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Devis transmis au Directeur Administratif. Deuxième rendez-vous prévu."
            elif rnd < 0.94:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Prospect PME qualifié. En attente d'assignation au KAM régional."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Budget IT insuffisant pour l'exercice en cours."

            ent = Enterprise(
                crm_id=crm_id,
                name=ent_name,
                website=f"https://www.{ent_name.lower().replace(' ', '')[:12]}.cd",
                sector=base_t[1],
                approximate_size=f"{emp} salariés ({sites} agences)",
                location=f"{base_t[2]}, Commune de {base_t[3]}",
                plaque=plaque_objs[p_code].name,
                plaque_rel=plaque_objs[p_code],
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev)),
                employee_count=emp,
                site_count=sites,
                rccm=f"CD/KNG/RCCM/{random.randint(15,24)}-B-{rccm_counter}",
                id_nat=f"01-44-M{random.randint(10000,99999)}X",
                nif=f"B{random.randint(1000000,9999999)}P",
                city=base_t[2],
                commune=base_t[3],
                address=f"{random.randint(1, 95)} Avenue de la Paix, {base_t[3]}",
                contact_name=f"{base_t[9]} {multiplier if multiplier > 1 else ''}".strip(),
                contact_role=base_t[10],
                contact_phone=f"+24382{random.randint(1000000,9999999)}",
                contact_email=f"contact@{ent_name.lower().replace(' ', '')[:10]}.cd",
                current_operator=random.choice(operators[:4]),
                current_connectivity=random.choice(connectivities[1:5]),
                segment=segment,
                assigned_entity=assigned_entity,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=kam_user,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(70, 92),
                recommended_solution=random.choice(offers_kam),
                created_at=timezone.now() - timedelta(days=random.randint(20, 300))
            )
            created_enterprises.append(ent)

        # 3. Génération des TPE / Informel / Micro-entreprises (190 entreprises, CA < 100k USD -> Back-Office Terrain)
        self.stdout.write("3/3 Génération des TPE & Informel (CA < 100k USD -> Back-Office Terrain & Commerciaux)...")
        tpe_count = 190
        for i in range(tpe_count):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            base_t = tpe_templates[i % len(tpe_templates)]
            index_num = (i // len(tpe_templates)) + 1
            suffix = f"N°{index_num}" if index_num > 1 else ""
            ent_name = f"{base_t[0]} {suffix}".strip()

            lat = base_t[3] + random.uniform(-0.008, 0.008)
            lon = base_t[4] + random.uniform(-0.008, 0.008)
            rev = max(14000, min(95000, int(base_t[5] * random.uniform(0.65, 1.25))))
            emp = max(2, min(14, int(base_t[6] * random.uniform(0.8, 1.3))))
            p_code = base_t[9]

            segment = "TPE_INFORMEL"
            assigned_entity = "BACK_OFFICE"

            rnd = random.random()
            if rnd < 0.20:
                c_status = "CONVERTED"
                c_entity = "BACK_OFFICE"
                c_amount = Decimal(str(random.randint(1800, 9600)))
                c_offer = random.choice(offers_bo)
                c_date = timezone.now() - timedelta(days=random.randint(3, 120))
                c_notes = f"Contrat de proximité signé lors de la tournée commerciale sur la plaque. Fiche KYC et RCCM récupérés sur place. Offre : {c_offer}."
            elif rnd < 0.55:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Visite terrain effectuée. Le responsable attend l'accord de son propriétaire de local pour le raccordement."
            elif rnd < 0.95:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Commerce repéré sur la plaque territoriale. À visiter par le commercial de secteur."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Commerce fermé ou refus de basculer sur un abonnement fixe."

            ent = Enterprise(
                crm_id=crm_id,
                name=ent_name,
                website=None,
                sector=base_t[1],
                approximate_size=f"{emp} employés (Boutique / Atelier local)",
                location=f"{plaque_objs[p_code].city}, Commune de {base_t[2]}",
                plaque=plaque_objs[p_code].name,
                plaque_rel=plaque_objs[p_code],
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev)),
                employee_count=emp,
                site_count=1,
                rccm=f"CD/KNG/RCCM/{random.randint(18,24)}-A-{rccm_counter}",
                id_nat=f"01-12-P{random.randint(10000,99999)}K",
                nif=f"C{random.randint(1000000,9999999)}R",
                city=plaque_objs[p_code].city,
                commune=base_t[2],
                address=f"{random.randint(5, 120)} Rue du Commerce / Marché, Quartier {base_t[2]}",
                contact_name=f"{base_t[7]} {index_num if index_num > 1 else ''}".strip(),
                contact_role=base_t[8],
                contact_phone=f"+24389{random.randint(1000000,9999999)}",
                contact_email=None,
                current_operator=random.choice(operators[2:]),
                current_connectivity=random.choice(connectivities[3:]),
                segment=segment,
                assigned_entity=assigned_entity,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=supervisor_user,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(65, 88),
                recommended_solution=random.choice(offers_bo),
                created_at=timezone.now() - timedelta(days=random.randint(10, 200))
            )
            created_enterprises.append(ent)

        # Insertion en masse des 400 entreprises
        Enterprise.objects.bulk_create(created_enterprises)
        
        # Statistiques de validation
        total = Enterprise.objects.count()
        tpe_tot = Enterprise.objects.filter(segment='TPE_INFORMEL').count()
        pme_tot = Enterprise.objects.filter(segment='PME').count()
        gc_tot = Enterprise.objects.filter(segment='GRAND_COMPTE').count()
        bo_tot = Enterprise.objects.filter(assigned_entity='BACK_OFFICE').count()
        kam_tot = Enterprise.objects.filter(assigned_entity='KAM_OFFICE').count()
        conv_bo = Enterprise.objects.filter(conversion_status='CONVERTED', converted_by_entity='BACK_OFFICE').count()
        conv_kam = Enterprise.objects.filter(conversion_status='CONVERTED', converted_by_entity='KAM_OFFICE').count()
        
        self.stdout.write(self.style.SUCCESS(
            f"Succès ! {total} entreprises congolaises générées et segmentées avec précision :\n"
            f" - Grands Comptes (>= 1M $) : {gc_tot} (affectés au KAM Office)\n"
            f" - PME (100k$ - 1M$)        : {pme_tot} (affectés au KAM Office)\n"
            f" - TPE / Informel (< 100k$) : {tpe_tot} (affectés au Back-Office Terrain)\n"
            f" ------------------------------------------------------------\n"
            f" - Total envoyé Back-Office : {bo_tot}\n"
            f" - Total envoyé KAM Office  : {kam_tot}\n"
            f" - Comptes convertis Back-Office : {conv_bo}\n"
            f" - Comptes convertis KAM Office  : {conv_kam}\n"
            f" - Total comptes convertis       : {conv_bo + conv_kam}"
        ))
