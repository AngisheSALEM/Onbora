import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from sales.models import Plaque, Enterprise, SegmentationConfig

class Command(BaseCommand):
    help = "Génère une banque de données réaliste de 1000 entreprises congolaises (RDC) avec segmentation mensuelle : TPE < 200$/m, PME 200-2500$/m, Grands Comptes > 2500$/m."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== DÉBUT DU PEUPLEMENT : 1 000 ENTREPRISES CONGOLAISES (RDC) ==="))

        # 1. Configuration des seuils réels selon la RDC :
        # TPE / Informel : < 200 $ / mois -> < 2 400 $ / an (Back-Office Terrain)
        # PME : entre 200 $ et 2 500 $ / mois -> 2 400 $ à 30 000 $ / an (KAM Office)
        # Grands Comptes : > 2 500 $ / mois -> > 30 000 $ / an (KAM Office)
        config, _ = SegmentationConfig.objects.get_or_create(
            id=1,
            defaults={
                'tpe_max_revenue': Decimal('2400.00'),
                'pme_max_revenue': Decimal('30000.00'),
                'backoffice_entity_label': 'Back-Office Terrain (Commerciaux)',
                'kam_entity_label': 'Direction KAM & Grands Comptes'
            }
        )
        config.tpe_max_revenue = Decimal('2400.00')
        config.pme_max_revenue = Decimal('30000.00')
        config.save()
        self.stdout.write(self.style.SUCCESS("[OK] Seuils de segmentation RDC configures : TPE < 200$/m (2 400$/an) | PME 200-2500$/m | Grands Comptes > 2 500$/m (30 000$/an)"))

        # 2. Plaques territoriales réalistes en RDC
        plaques_data = [
            {"code": "KIN-GOMBE", "name": "Kinshasa - Gombe (Centre d'affaires & Ambassades)", "city": "Kinshasa", "lat": -4.3033, "lon": 15.3083, "radius": 4.5},
            {"code": "KIN-LIMETE", "name": "Kinshasa - Limete (Zone Industrielle & Résidentielle)", "city": "Kinshasa", "lat": -4.3512, "lon": 15.3376, "radius": 5.0},
            {"code": "KIN-LINGWALA", "name": "Kinshasa - Lingwala & Barumbu (Commercial & Marchés)", "city": "Kinshasa", "lat": -4.3180, "lon": 15.3020, "radius": 3.8},
            {"code": "KIN-NGALIEMA", "name": "Kinshasa - Ngaliema & Kintambo (Tertiaire, Macampagne)", "city": "Kinshasa", "lat": -4.3315, "lon": 15.2630, "radius": 6.0},
            {"code": "KIN-MASINA", "name": "Kinshasa - Masina & Ndjili (Marché Liberté & Commerces)", "city": "Kinshasa", "lat": -4.3820, "lon": 15.3950, "radius": 5.5},
            {"code": "KIN-KASAVUBU", "name": "Kinshasa - Kasa-Vubu & Bandalungwa (Commerces, Victoire)", "city": "Kinshasa", "lat": -4.3380, "lon": 15.2950, "radius": 4.0},
            {"code": "KIN-LEMBA", "name": "Kinshasa - Lemba & Matete (Services de Proximité & Campus)", "city": "Kinshasa", "lat": -4.3750, "lon": 15.3280, "radius": 4.5},
            {"code": "LSH-CENTRE", "name": "Lubumbashi - Centre Ville & Quartier Industriel", "city": "Lubumbashi", "lat": -11.6609, "lon": 27.4794, "radius": 6.0},
            {"code": "LSH-RUASHI", "name": "Lubumbashi - Ruashi & Kampemba", "city": "Lubumbashi", "lat": -11.6250, "lon": 27.5250, "radius": 5.0},
            {"code": "KWZ-MINES", "name": "Kolwezi - Pôle Minier & Dilala", "city": "Kolwezi", "lat": -10.7167, "lon": 25.4667, "radius": 8.0},
            {"code": "GOM-CENTRE", "name": "Goma - Centre Ville, Katindo & Himbi", "city": "Goma", "lat": -1.6780, "lon": 29.2320, "radius": 5.0},
            {"code": "MAT-PORT", "name": "Matadi - Port International & Ville Haute", "city": "Matadi", "lat": -5.8167, "lon": 13.4500, "radius": 4.5},
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

        # 3. Récupération des KAMs pour attribution
        kam1 = User.objects.filter(username='kam1').first()
        kam2 = User.objects.filter(username='kam2').first()
        kam3 = User.objects.filter(username='kam3').first()
        kam_dir = User.objects.filter(role=User.KAM_MANAGER).first()

        # Banques de données sémantiques congolaises
        first_names_men = ["Jean-Pierre", "Dieudonné", "Patrick", "Christian", "Junior", "Serge", "Alain", "Célestin", "Georges", "Michel", "Moïse", "Joseph", "Pascal", "Fiston", "Freddy", "Modeste", "Aimé", "Héritier", "Rodrigue", "Éric", "Trésor", "Gaston", "Dady", "Jules", "Arsène"]
        first_names_women = ["Chantal", "Patricia", "Maman Fifi", "Antoinette", "Marie-Claire", "Bijou", "Céline", "Sophie", "Nadine", "Dorcas", "Hélène", "Sarah", "Jeanne", "Rosie", "Mireille", "Grâce", "Thérèse", "Christelle", "Clarisse", "Nathalie"]
        last_names = ["Mukendi", "Kanyinda", "Tshilombo", "Ilunga", "Kasongo", "Mwamba", "Mutombo", "Lwamba", "Mbuyi", "Kabeya", "Makiese", "Lukoki", "Kiese", "Kapinga", "Ngalula", "Katende", "Badibanga", "Mavinga", "Mavungu", "Bolamba", "Yoka", "Boketshu", "Lokondo", "Mbala", "Ntumba", "Ndombe", "Muteba", "Kalala", "Mpoyi", "Kabasele", "Luvualu", "Nzuzi", "Mampuya"]

        def generate_congolese_contact():
            is_woman = random.random() < 0.35
            fn = random.choice(first_names_women if is_woman else first_names_men)
            ln = random.choice(last_names)
            return f"{fn} {ln}"

        # Templates de base Grands Comptes réels de RDC (2 à 8 sites max, monopoint pour hôtels)
        grands_comptes_templates = [
            ("Rawbank RDC Siège", "Banque & Services Financiers", "rawbank.cd", "Kinshasa", "Gombe", -4.3025, 15.3090, 240000, 3200, 8, "Mustapha Rawji", "Directeur Général", "KIN-GOMBE"),
            ("EquityBCDC Direction Générale", "Banque & Services Financiers", "equitybcdc.cd", "Kinshasa", "Gombe", -4.3040, 15.3075, 210000, 2800, 8, "Célestin Mukeba", "Directeur Général", "KIN-GOMBE"),
            ("Trust Merchant Bank (TMB) Siège", "Banque & Services Financiers", "tmb.cd", "Lubumbashi", "Centre", -11.6620, 27.4810, 180000, 1900, 6, "Oliver Meisenberg", "Directeur Général", "LSH-CENTRE"),
            ("Sofibanque Siège", "Banque & Services Financiers", "sofibanque.com", "Kinshasa", "Gombe", -4.3015, 15.3110, 120000, 650, 3, "Henry Wazne", "Administrateur Directeur Général", "KIN-GOMBE"),
            ("FBNBank RDC Siège", "Banque & Services Financiers", "fbnbankrdc.com", "Kinshasa", "Gombe", -4.3055, 15.3060, 95000, 520, 3, "Akeem Oladele", "Directeur Général", "KIN-GOMBE"),
            ("Tenke Fungurume Mining (TFM)", "Mines & Énergie", "tfm.cd", "Kolwezi", "Zone Minière", -10.5833, 26.1833, 350000, 4200, 3, "Chantal Tshilombo", "Directrice IT & Télécoms", "KWZ-MINES"),
            ("Kamoto Copper Company (KCC - Glencore)", "Mines & Énergie", "katangamining.com", "Kolwezi", "Kamoto", -10.7200, 25.4300, 320000, 3900, 2, "Mark Davis", "VP Opérations & Télécoms", "KWZ-MINES"),
            ("Kamoa-Kakula Mining Complex (Ivanhoe)", "Mines & Énergie", "ivanhoemines.com", "Kolwezi", "Kakula", -10.8500, 25.3200, 310000, 3500, 2, "Annebel Oosthuizen", "VP Commercial & IT", "KWZ-MINES"),
            ("Mutanda Mining (MUMI)", "Mines & Énergie", "mutandamining.com", "Kolwezi", "Mutanda", -10.7800, 25.5500, 220000, 2400, 2, "Patrice Lwamba", "Head of Digital Infrastructure", "KWZ-MINES"),
            ("Kibali Gold Mines (Barrick Gold)", "Mines & Énergie", "barrick.com", "Kinshasa", "Gombe", -4.3038, 15.3050, 260000, 2800, 3, "Cyrille Mutombo", "Country Manager RDC", "KIN-GOMBE"),
            ("Société Minière de Bisunzu (SMB)", "Mines & Énergie", "smb-rdc.com", "Goma", "Centre", -1.6750, 29.2310, 85000, 850, 2, "Ben Mwangachuchu", "Directeur Général", "GOM-CENTRE"),
            ("Chemaf SAS Siège", "Mines & Énergie", "chemaf.com", "Lubumbashi", "Ruashi", -11.6350, 27.5100, 110000, 1400, 2, "Shiraz Virji", "Directeur Exécutif", "LSH-RUASHI"),
            ("Ruashi Mining SAS", "Mines & Énergie", "ruashimining.com", "Lubumbashi", "Ruashi", -11.6280, 27.5300, 140000, 1650, 2, "Grant Stuart", "General Manager IT & Automation", "LSH-RUASHI"),
            ("Vodacom Congo Direction Générale", "Télécoms & IT", "vodacom.cd", "Kinshasa", "Gombe", -4.3020, 15.3140, 280000, 1800, 5, "Khalil Al Americani", "Directeur Général", "KIN-GOMBE"),
            ("Airtel RDC Direction Générale", "Télécoms & IT", "airtel.cd", "Kinshasa", "Gombe", -4.3045, 15.3125, 250000, 1600, 4, "Emmanuel Eyamba", "Directeur B2B Entreprises", "KIN-GOMBE"),
            ("Africell RDC Direction Générale", "Télécoms & IT", "africell.cd", "Kinshasa", "Gombe", -4.3065, 15.3040, 120000, 950, 3, "Milad Khairallah", "Directeur Commercial", "KIN-GOMBE"),
            ("SNEL Siège National", "Énergie & Eau", "snel.cd", "Kinshasa", "Gombe", -4.3080, 15.3030, 190000, 4500, 6, "Fabrice Lusinde", "Directeur Général", "KIN-GOMBE"),
            ("Regideso Direction Générale", "Énergie & Eau", "regideso.cd", "Kinshasa", "Gombe", -4.3090, 15.3015, 150000, 3800, 5, "David Tshilumba", "Directeur Général", "KIN-GOMBE"),
            ("Perenco RDC Exploration & Production", "Énergie & Pétrole", "perenco.com", "Kinshasa", "Gombe", -4.3028, 15.3105, 230000, 1200, 3, "Frédéric Chevalier", "Directeur Général RDC", "KIN-GOMBE"),
            ("SEP Congo (Services Pétroliers)", "Énergie & Pétrole", "sepcongo.com", "Kinshasa", "Gombe", -4.3070, 15.3080, 160000, 1750, 4, "Joseph Kouame", "Directeur Technique & DSI", "KIN-GOMBE"),
            ("TotalEnergies Marketing RDC", "Énergie & Pétrole", "totalenergies.cd", "Kinshasa", "Gombe", -4.3050, 15.3115, 130000, 780, 5, "Patrice Muteba", "Responsable Achats & Télécoms", "KIN-GOMBE"),
            ("Cobil SA Siège", "Énergie & Pétrole", "cobil.cd", "Kinshasa", "Gombe", -4.3062, 15.3070, 95000, 620, 3, "Georges Yamba", "Directeur Général", "KIN-GOMBE"),
            ("Bralima SAS (Heineken RDC)", "Industrie & Brasserie", "bralima.cd", "Kinshasa", "Lingwala", -4.3120, 15.3180, 210000, 2200, 4, "Laurent Kovacs", "Directeur Général", "KIN-LINGWALA"),
            ("Bracongo SA (Castel RDC)", "Industrie & Brasserie", "bracongo.cd", "Kinshasa", "Limete", -4.3480, 15.3320, 195000, 1950, 4, "Cyril Segonds", "Directeur Général", "KIN-LIMETE"),
            ("Marsavco SA Siège Industriel", "Industrie & Agroalimentaire", "marsavco.com", "Kinshasa", "Gombe", -4.3085, 15.3150, 110000, 1400, 2, "Bijal Patel", "Directeur Général Adjoint", "KIN-GOMBE"),
            ("Cimenterie de Lukala (CILU)", "Industrie & BTP", "cilu.cd", "Kinshasa", "Gombe", -4.3042, 15.3098, 105000, 980, 2, "Marc Vandevelde", "Directeur Commercial", "KIN-GOMBE"),
            ("PPC Barnet RDC", "Industrie & BTP", "ppc.cd", "Kinshasa", "Gombe", -4.3035, 15.3088, 85000, 720, 2, "Iqbal Omar", "Head of Supply Chain", "KIN-GOMBE"),
            ("Minoterie de Matadi (MIDEMA)", "Industrie & Agroalimentaire", "midema.cd", "Matadi", "Port", -5.8150, 13.4480, 90000, 850, 2, "Jean-Claude Ndangi", "Directeur d'Usine", "MAT-PORT"),
            ("Africa Global Logistics RDC (AGL / Bolloré)", "Transport & Logistique", "aglgroup.com", "Kinshasa", "Gombe", -4.3052, 15.3065, 175000, 1850, 4, "Pierre Bellerose", "Directeur Régional RDC", "KIN-GOMBE"),
            ("Lignes Maritimes Congolaises (LMC)", "Transport & Logistique", "lmc.cd", "Kinshasa", "Gombe", -4.3075, 15.3045, 65000, 920, 3, "Jean-Marie Mpoyi", "DSI & Télécoms", "KIN-GOMBE"),
            ("Onatra SA Direction Générale", "Transport & Logistique", "onatra.cd", "Kinshasa", "Gombe", -4.3088, 15.3058, 85000, 4100, 4, "Martin Lukusa", "Directeur Général", "KIN-GOMBE"),
            ("Congo Airways Siège", "Transport & Aviation", "congoairways.com", "Kinshasa", "Gombe", -4.3060, 15.3085, 75000, 480, 3, "Léonard Mutamba", "Directeur des Opérations", "KIN-GOMBE"),
            ("Compagnie Africaine d'Aviation (FlyCAA)", "Transport & Aviation", "flycaa.com", "Kinshasa", "Lingwala", -4.3160, 15.3210, 95000, 620, 3, "David Blattner", "Directeur Général", "KIN-LINGWALA"),
            ("Transco Siège Social", "Transport & Logistique", "transco.cd", "Kinshasa", "Limete", -4.3520, 15.3350, 55000, 1600, 3, "Cyprien Mbere", "Directeur Général", "KIN-LIMETE"),
            ("Pullman Grand Hôtel Kinshasa", "Hôtellerie & Tourisme", "pullmanhotels.com", "Kinshasa", "Gombe", -4.3010, 15.2980, 65000, 550, 1, "Thierry De Jaham", "Directeur Général", "KIN-GOMBE"),
            ("Fleuve Congo Hotel by Blazon", "Hôtellerie & Tourisme", "fleuvecongohotel.com", "Kinshasa", "Gombe", -4.3005, 15.2950, 75000, 600, 1, "Adham El Khateeb", "General Manager", "KIN-GOMBE"),
            ("Grand Karavia Hotel Lubumbashi", "Hôtellerie & Tourisme", "grandkaravia.com", "Lubumbashi", "Centre", -11.6580, 27.4650, 48000, 380, 1, "Patrick Kalala", "Responsable Exploitation IT", "LSH-CENTRE"),
            ("Hôtel Memling Kinshasa", "Hôtellerie & Tourisme", "memling.net", "Kinshasa", "Gombe", -4.3068, 15.3072, 42000, 340, 1, "Anne-Marie Delcroix", "Directrice d'Exploitation", "KIN-GOMBE"),
        ]

        # Templates de PME réelles de RDC (200$ à 2 500$/mois -> 2 400$ à 30 000$/an)
        pme_base_types = [
            ("Clinique", "Santé & Hôpitaux", ["Ngaliema", "Gombe", "Limete", "Bandalungwa", "Centre"]),
            ("Centre Médical", "Santé & Hôpitaux", ["Gombe", "Limete", "Kasa-Vubu", "Ruashi"]),
            ("Hôpital Privé", "Santé & Hôpitaux", ["Limete", "Ngaliema", "Matete", "Katindo"]),
            ("Laboratoire d'Analyses Médicales", "Santé & Diagnostics", ["Gombe", "Limete", "Centre"]),
            ("Collège Privé", "Éducation & Enseignement", ["Gombe", "Ngaliema", "Bandalungwa", "Limete"]),
            ("Institut Supérieur Privé", "Éducation & Enseignement", ["Lingwala", "Lemba", "Kasa-Vubu"]),
            ("Université Privée", "Éducation Supérieure", ["Lingwala", "Lemba", "Ruashi"]),
            ("Cabinet d'Avocats & Conseil", "Services Juridiques & Conseils", ["Gombe", "Centre"]),
            ("Cabinet d'Audit & Expertise Comptable", "Audit & Fiscalité", ["Gombe", "Limete", "Centre"]),
            ("Société de Gardiennage & Sécurité", "Sécurité Privée", ["Gombe", "Limete", "Ruashi", "Port"]),
            ("Agence de Voyage & Tourisme", "Tourisme & Billetterie", ["Gombe", "Centre", "Katindo"]),
            ("Entreprise de Construction & BTP", "BTP & Génie Civil", ["Limete", "Ngaliema", "Ruashi", "Dilala"]),
            ("Société de Transit & Douane", "Logistique & Fret", ["Matadi", "Gombe", "Limete", "Katindo"]),
            ("Concessionnaire & Garage Pro", "Automobile & Entretien", ["Limete", "Gombe", "Centre"]),
            ("Supermarché d'Alimentation", "Distribution & Retail", ["Gombe", "Ngaliema", "Bandalungwa", "Centre"]),
            ("Distributeur Boissons & Vivres", "Commerce de Gros", ["Limete", "Lingwala", "Masina", "Ruashi"]),
            ("Imprimerie Numérique & Presse", "Médias & Graphisme", ["Gombe", "Lingwala", "Limete"]),
            ("Fournisseur Matériel Informatique", "Télécoms & IT B2B", ["Gombe", "Limete", "Centre"]),
            ("Pharmacie de Référence", "Pharmacie & Santé", ["Gombe", "Ngaliema", "Limete", "Centre"]),
            ("Bureau d'Études & Ingénierie", "Ingénierie & Consulting", ["Gombe", "Ngaliema", "Centre"]),
        ]

        # Templates de TPE / Informel réelles de RDC (< 200$/mois -> < 2 400$/an)
        tpe_base_types = [
            ("Quincaillerie", "Commerce de Matériaux", ["Limete", "Lingwala", "Masina", "Matete", "Bandalungwa", "Ruashi", "Port"]),
            ("Atelier de Soudure & Métallurgie", "Artisanat Métallique", ["Lingwala", "Masina", "Limete", "Matete", "Ruashi"]),
            ("Atelier Menuiserie & Bois", "Artisanat & Ébénisterie", ["Ngaliema", "Kasa-Vubu", "Bandalungwa", "Masina"]),
            ("Chambre Froide Vivres Frais", "Alimentation Surgelée", ["Masina", "Lingwala", "Matete", "Ndjili", "Lemba"]),
            ("Dépôt Ciment & Barres de Fer", "Matériaux de Construction", ["Masina", "Matete", "Limete", "Ruashi", "Dilala"]),
            ("Pharmacie de Quartier", "Santé de Proximité", ["Lingwala", "Kasa-Vubu", "Masina", "Lemba", "Bandalungwa"]),
            ("Boulangerie & Pâtisserie Locale", "Alimentation & Boulangerie", ["Limete", "Bandalungwa", "Kasa-Vubu", "Lemba"]),
            ("Garage & Réparation Express", "Automobile de Proximité", ["Limete", "Lingwala", "Masina", "Ruashi"]),
            ("Boutique Téléphones & Accessoires", "Commerce Électronique & Mobile", ["Lingwala", "Barumbu", "Kasa-Vubu", "Masina", "Centre"]),
            ("Papeterie & Fournitures Scolaires", "Commerce & Bureautique", ["Lingwala", "Kasa-Vubu", "Lemba", "Bandalungwa"]),
            ("Cybercafé & Services Administratifs", "Bureautique & Connectivité", ["Gombe", "Lemba", "Kasa-Vubu", "Matete"]),
            ("Atelier Couture & Mode Africaine", "Textile & Confection", ["Lingwala", "Bandalungwa", "Kasa-Vubu", "Ngaliema"]),
            ("Station Lavage & Pneus", "Services Véhicules", ["Limete", "Ngaliema", "Bandalungwa", "Kasa-Vubu"]),
            ("Alimentation Générale de Quartier", "Commerce de Détail", ["Masina", "Matete", "Lemba", "Bandalungwa", "Ndjili"]),
            ("Boutique Vivres Secs & Céréales", "Commerce Alimentaire", ["Masina", "Lingwala", "Matete", "Ruashi"]),
            ("Salon de Coiffure & Esthétique", "Services Personnels", ["Bandalungwa", "Gombe", "Ngaliema", "Kasa-Vubu"]),
            ("Atelier Réparation Froid & Électroménager", "Dépannage Électrique", ["Lingwala", "Limete", "Kasa-Vubu", "Masina"]),
            ("Dépôt d'Eau Purifiée & Boissons", "Boissons & Distribution", ["Masina", "Limete", "Lemba", "Bandalungwa"]),
            ("Cabinet Dentaire de Proximité", "Santé de Proximité", ["Kasa-Vubu", "Lingwala", "Bandalungwa", "Lemba"]),
            ("Agence Transfert Mobile Money & Change", "Fintech & Proximité", ["Gombe", "Kasa-Vubu", "Masina", "Matete", "Bandalungwa"]),
        ]

        commune_plaques = {
            "Gombe": "KIN-GOMBE",
            "Limete": "KIN-LIMETE",
            "Lingwala": "KIN-LINGWALA",
            "Barumbu": "KIN-LINGWALA",
            "Ngaliema": "KIN-NGALIEMA",
            "Kintambo": "KIN-NGALIEMA",
            "Bandalungwa": "KIN-KASAVUBU",
            "Kasa-Vubu": "KIN-KASAVUBU",
            "Masina": "KIN-MASINA",
            "Ndjili": "KIN-MASINA",
            "Lemba": "KIN-LEMBA",
            "Matete": "KIN-LEMBA",
            "Centre": "LSH-CENTRE",
            "Ruashi": "LSH-RUASHI",
            "Kampemba": "LSH-RUASHI",
            "Dilala": "KWZ-MINES",
            "Port": "MAT-PORT",
            "Katindo": "GOM-CENTRE",
        }

        # Nettoyage de l'ancienne table Enterprise
        self.stdout.write("Purge complète de l'ancienne table Enterprise...")
        Enterprise.objects.all().delete()

        created_enterprises = []
        rccm_counter = 1000

        operators = ["Vodacom Congo", "Airtel RDC", "Africell RDC", "Canalbox Congo", "Standard Telecom / Liquid", "Starlink / VSAT", "Aucun (Modem 4G)"]
        connectivities = ["Fibre Optique Dédiée", "Fibre FTTH", "Faisceau Hertzien", "4G LTE Pro", "VSAT Dédié", "Modem 4G"]
        offers_kam_gc = ["Fibre Dédiée 1 Gbps + SD-WAN Managé", "Liaison Secours Satellite Hybride + SOC", "MPLS Inter-villes 100 Mbps", "Datacenter & Cloud Souverain RDC", "Pack Cybersécurité EDR 24/7"]
        offers_kam_pme = ["Fibre Pro PME 50 Mbps", "Pack PME Connect 30M + Voip", "Liaison Point-à-Point Siège-Dépôt", "Box Fibre Sécurisée + Backup 4G", "Microsoft 365 Cloud PME"]
        offers_terrain = ["Routeur 4G Pro Commerce", "Accès Fibre FTTH Pro 20M", "Kit TPE Connect Caisse", "Forfait Flotte Mobile 10 SIMs", "Borne WiFi Clientèle"]

        # =========================================================================
        # 1. GRANDS COMPTES (120 entreprises, Budget mensuel > 2 500$ -> CA annuel > 30 000$)
        # =========================================================================
        self.stdout.write("1/3 Génération des 120 Grands Comptes (Budget > 2 500$/m -> Direction KAM Office)...")
        gc_target = 120
        for i in range(gc_target):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            if i < len(grands_comptes_templates):
                t = grands_comptes_templates[i]
                name, sector, web, city, commune, lat, lon, rev_annual, emp, sites, contact, role, p_code = t
            else:
                base_t = grands_comptes_templates[i % len(grands_comptes_templates)]
                num = (i // len(grands_comptes_templates)) + 1
                name = f"{base_t[0]} - Division Régionale N°{num}"
                sector = base_t[1]
                web = base_t[2]
                city = base_t[3]
                commune = base_t[4]
                lat = base_t[5] + random.uniform(-0.015, 0.015)
                lon = base_t[6] + random.uniform(-0.015, 0.015)
                # Budget mensuel > 2 500$ -> CA annuel entre 32 000$ et 300 000$
                monthly_spend = random.randint(2600, 22000)
                rev_annual = monthly_spend * 12
                emp = int(base_t[8] * random.uniform(0.6, 1.2))
                sites = random.randint(2, 5)
                contact = generate_congolese_contact()
                role = random.choice(["Directeur des Systèmes d'Information", "Directeur Administratif & Financier", "Directeur Général Adjoint", "Responsable Achats & Moyens Généraux"])
                p_code = base_t[12]

            segment = "GRAND_COMPTE"
            assigned_entity = "KAM_OFFICE"

            # Répartition d'attribution KAM :
            # kam1 (Spécialiste GC) et kam3 (Spécialiste GC) reçoivent chacun un contingent
            assigned_kam_user = None
            assigned_at_date = None
            if i < 25:
                assigned_kam_user = kam1
                assigned_at_date = timezone.now() - timedelta(days=random.randint(5, 45))
            elif i < 45:
                assigned_kam_user = kam3
                assigned_at_date = timezone.now() - timedelta(days=random.randint(5, 45))

            # Statut commercial
            rnd = random.random()
            if rnd < 0.25:
                c_status = "CONVERTED"
                c_entity = "KAM_OFFICE"
                c_amount = Decimal(str(random.randint(32000, 150000)))
                c_offer = random.choice(offers_kam_gc)
                c_date = timezone.now() - timedelta(days=random.randint(10, 180))
                c_notes = f"Contrat cadre annuel Grand Compte signé avec la direction générale. Offre retenue : {c_offer}. Raccordement multi-sites validé par la DSI."
            elif rnd < 0.65:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Audit d'architecture réseau en cours. Négociation du SLA de reprise d'activité < 2h avec le DSI."
            elif rnd < 0.93:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Grand Compte qualifié dans le CRM. Prise de contact C-Level planifiée pour présentation du catalogue."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Contrat concurrent renouvelé pour l'exercice. À relancer 90 jours avant l'échéance."

            plq_instance = plaque_objs.get(p_code, list(plaque_objs.values())[0])

            ent = Enterprise(
                crm_id=crm_id,
                name=name,
                website=f"https://www.{web}" if not web.startswith("http") else web,
                sector=sector,
                approximate_size=f"{emp} collaborateurs ({sites} sites)",
                location=f"{city}, Commune de {commune}",
                plaque=plq_instance.name,
                plaque_rel=plq_instance,
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev_annual)),
                employee_count=emp,
                site_count=sites,
                rccm=f"CD/KNG/RCCM/{random.randint(12,24)}-B-{rccm_counter}",
                id_nat=f"01-83-N{random.randint(10000,99999)}W",
                nif=f"A{random.randint(1000000,9999999)}K",
                city=city,
                commune=commune,
                address=f"{random.randint(1, 140)} Boulevard du 30 Juin / Avenue principale, {commune}",
                contact_name=contact,
                contact_role=role,
                contact_phone=f"+24381{random.randint(1000000,9999999)}",
                contact_email=f"contact@{name.lower().replace(' ', '')[:10]}.cd",
                current_operator=random.choice(operators[:3]),
                current_connectivity=random.choice(connectivities[:3]),
                segment=segment,
                assigned_entity=assigned_entity,
                assigned_kam=assigned_kam_user,
                assigned_at=assigned_at_date,
                assigned_by=kam_dir if assigned_kam_user else None,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=assigned_kam_user if c_status == 'CONVERTED' else None,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(82, 98),
                recommended_solution=random.choice(offers_kam_gc),
                created_at=timezone.now() - timedelta(days=random.randint(30, 365))
            )
            created_enterprises.append(ent)

        # =========================================================================
        # 2. PME (280 entreprises, Budget mensuel 200$ à 2 500$ -> CA annuel 2 400$ à 30 000$)
        # =========================================================================
        self.stdout.write("2/3 Génération des 280 PME (Budget 200-2500$/m -> Direction KAM Office / Spécialiste PME)...")
        pme_target = 280
        for i in range(pme_target):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            base_type, sector, communes_list = pme_base_types[i % len(pme_base_types)]
            commune = communes_list[i % len(communes_list)]
            p_code = commune_plaques.get(commune, "KIN-GOMBE")
            plq_instance = plaque_objs.get(p_code, list(plaque_objs.values())[0])

            city = plq_instance.city
            lat = plq_instance.latitude + random.uniform(-0.015, 0.015)
            lon = plq_instance.longitude + random.uniform(-0.015, 0.015)

            cognomen = random.choice(last_names)
            ent_name = f"{base_type} {cognomen} ({commune})"

            # Budget mensuel 200$ à 2 500$ -> CA annuel 2 400$ à 29 500$
            monthly_spend = random.randint(220, 2400)
            rev_annual = monthly_spend * 12
            emp = random.randint(10, 65)
            # En RDC, la grande majorité des PME opèrent sur un site unique (85%), quelques-unes ont 2 à 3 sites (15%)
            sites = 1 if random.random() < 0.85 else random.randint(2, 3)
            contact = generate_congolese_contact()
            role = random.choice(["Gérant Associé", "Directeur Administratif", "Directeur Médical", "Secrétaire Général", "Directeur d'Exploitation"])

            segment = "PME"
            assigned_entity = "KAM_OFFICE"

            # kam2 est spécialiste PME : on lui attribue un contingent de 35 PME
            assigned_kam_user = None
            assigned_at_date = None
            if i < 35:
                assigned_kam_user = kam2
                assigned_at_date = timezone.now() - timedelta(days=random.randint(5, 40))

            rnd = random.random()
            if rnd < 0.22:
                c_status = "CONVERTED"
                c_entity = "KAM_OFFICE"
                c_amount = Decimal(str(random.randint(3500, 24000)))
                c_offer = random.choice(offers_kam_pme)
                c_date = timezone.now() - timedelta(days=random.randint(10, 160))
                c_notes = f"Contrat PME validé par le responsable. Offre retenue : {c_offer}. Accès haut débit garanti avec facturation mensuelle."
            elif rnd < 0.58:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Devis de raccordement fibre transmis. Échange technique en cours sur le débit symétrique."
            elif rnd < 0.92:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "PME répertoriée dans le CRM. Dossier affecté au pôle PME du KAM Office."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Décision reportée au prochain trimestre budgétaire."

            ent = Enterprise(
                crm_id=crm_id,
                name=ent_name,
                website=f"https://www.{ent_name.lower().replace(' ', '')[:12]}.cd",
                sector=sector,
                approximate_size=f"{emp} salariés ({sites} site{'s' if sites > 1 else ''})",
                location=f"{city}, Commune de {commune}",
                plaque=plq_instance.name,
                plaque_rel=plq_instance,
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev_annual)),
                employee_count=emp,
                site_count=sites,
                rccm=f"CD/KNG/RCCM/{random.randint(15,24)}-B-{rccm_counter}",
                id_nat=f"01-44-M{random.randint(10000,99999)}X",
                nif=f"B{random.randint(1000000,9999999)}P",
                city=city,
                commune=commune,
                address=f"{random.randint(1, 95)} Avenue de la Paix / Avenue Kasa-Vubu, {commune}",
                contact_name=contact,
                contact_role=role,
                contact_phone=f"+24382{random.randint(1000000,9999999)}",
                contact_email=f"contact@{ent_name.lower().replace(' ', '')[:10]}.cd",
                current_operator=random.choice(operators[:4]),
                current_connectivity=random.choice(connectivities[1:5]),
                segment=segment,
                assigned_entity=assigned_entity,
                assigned_kam=assigned_kam_user,
                assigned_at=assigned_at_date,
                assigned_by=kam_dir if assigned_kam_user else None,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=assigned_kam_user if c_status == 'CONVERTED' else None,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(72, 94),
                recommended_solution=random.choice(offers_kam_pme),
                created_at=timezone.now() - timedelta(days=random.randint(20, 300))
            )
            created_enterprises.append(ent)

        # =========================================================================
        # 3. SOHO (600 entreprises, Budget mensuel < 200$ -> CA annuel < 2 400$)
        # Les plaques géographiques sont spécifiquement dédiées au ciblage SOHO terrain
        # =========================================================================
        self.stdout.write("3/3 Génération des 600 SOHO (Budget < 200$/m -> Back-Office Terrain & Commerciaux sur Plaques SOHO)...")
        tpe_target = 600
        for i in range(tpe_target):
            crm_id = f"CRM-CD-{len(created_enterprises)+1:04d}"
            rccm_counter += 1
            base_type, sector, communes_list = tpe_base_types[i % len(tpe_base_types)]
            commune = communes_list[i % len(communes_list)]
            p_code = commune_plaques.get(commune, "KIN-MASINA")
            plq_instance = plaque_objs.get(p_code, list(plaque_objs.values())[0])

            city = plq_instance.city
            lat = plq_instance.latitude + random.uniform(-0.012, 0.012)
            lon = plq_instance.longitude + random.uniform(-0.012, 0.012)

            owner_fn = random.choice(first_names_women if random.random() < 0.45 else first_names_men)
            owner_ln = random.choice(last_names)
            ent_name = f"{base_type} {owner_fn} ({commune})"

            # Budget mensuel < 200$ -> CA annuel entre 350$ et 2 300$ (30$ à 190$/mois)
            monthly_spend = random.randint(30, 195)
            rev_annual = monthly_spend * 12
            emp = random.randint(1, 9)
            # SOHO : 100% site unique
            sites = 1
            contact = f"{owner_fn} {owner_ln}"
            role = random.choice(["Propriétaire Gérant", "Responsable Boutique SOHO", "Artisan Maître", "Commerçante Dépôt", "Gérant de Quartier"])

            segment = "TPE_INFORMEL"
            assigned_entity = "BACK_OFFICE"

            rnd = random.random()
            if rnd < 0.20:
                c_status = "CONVERTED"
                c_entity = "BACK_OFFICE"
                c_amount = Decimal(str(random.randint(350, 2200)))
                c_offer = random.choice(offers_terrain)
                c_date = timezone.now() - timedelta(days=random.randint(5, 120))
                c_notes = f"Souscription directe sur le terrain via le commercial de plaque SOHO. Solution activée : {c_offer}."
            elif rnd < 0.50:
                c_status = "IN_NEGOTIATION"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Visite terrain effectuée. Le commerçant souhaite tester la couverture avant validation."
            elif rnd < 0.90:
                c_status = "PROSPECT"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Commerce identifié lors de la cartographie de plaque. Visite commerciale programmée."
            else:
                c_status = "LOST"
                c_entity = None
                c_amount = Decimal('0.00')
                c_offer = ""
                c_date = None
                c_notes = "Utilise actuellement un partage 4G personnel. Non intéressé pour le moment."

            ent = Enterprise(
                crm_id=crm_id,
                name=ent_name,
                website=None,
                sector=sector,
                approximate_size=f"{emp} personne{'s' if emp > 1 else ''} (Site unique)",
                location=f"{city}, Commune de {commune}",
                plaque=plq_instance.name,
                plaque_rel=plq_instance,
                latitude=lat,
                longitude=lon,
                annual_revenue=Decimal(str(rev_annual)),
                employee_count=emp,
                site_count=sites,
                rccm=f"CD/KIN/RCCM/{random.randint(18,25)}-A-{rccm_counter}",
                id_nat=f"01-83-T{random.randint(10000,99999)}P",
                nif=f"T{random.randint(1000000,9999999)}M",
                city=city,
                commune=commune,
                address=f"Croisement Marché / Av. Principale N°{random.randint(5, 250)}, {commune}",
                contact_name=contact,
                contact_role=role,
                contact_phone=f"+24389{random.randint(1000000,9999999)}",
                contact_email=None,
                current_operator=random.choice(operators[1:]),
                current_connectivity=random.choice(connectivities[3:]),
                segment=segment,
                assigned_entity=assigned_entity,
                assigned_kam=None,
                assigned_at=None,
                assigned_by=None,
                conversion_status=c_status,
                converted_by_entity=c_entity,
                converted_amount=c_amount,
                converted_offer=c_offer,
                converted_at=c_date,
                converted_by_user=None,
                conversion_notes=c_notes,
                is_ready_for_conversion=True,
                conversion_score=random.randint(60, 88),
                recommended_solution=random.choice(offers_terrain),
                created_at=timezone.now() - timedelta(days=random.randint(10, 240))
            )
            created_enterprises.append(ent)

        # Insertion massive par lots pour rapidité optimale
        self.stdout.write("Insertion des 1 000 comptes en base de données SQLite...")
        Enterprise.objects.bulk_create(created_enterprises, batch_size=200)

        total_in_db = Enterprise.objects.count()
        gc_in_db = Enterprise.objects.filter(segment='GRAND_COMPTE').count()
        pme_in_db = Enterprise.objects.filter(segment='PME').count()
        tpe_in_db = Enterprise.objects.filter(segment='TPE_INFORMEL').count()
        bo_in_db = Enterprise.objects.filter(assigned_entity='BACK_OFFICE').count()
        kam_in_db = Enterprise.objects.filter(assigned_entity='KAM_OFFICE').count()

        self.stdout.write(self.style.SUCCESS(
            f"\n=== SUCCES : 1 000 COMPTES CREES EN BASE DE DONNEES SQLite ===\n"
            f"- Total en base : {total_in_db} comptes\n"
            f"- SOHO (< 200 $/m, < 2 400 $/an) : {tpe_in_db} comptes -> Affectes au Back-Office Terrain (Plaques SOHO)\n"
            f"- PME (200 $ a 2 500 $/m, 2 400 $ a 30 000 $/an) : {pme_in_db} comptes -> Affectes au KAM Office\n"
            f"- Grands Comptes (> 2 500 $/m, > 30 000 $/an) : {gc_in_db} comptes -> Affectes au KAM Office\n"
            f"- Total gere par le KAM Office (PME + Grands Comptes) : {kam_in_db} comptes\n"
            f"- Portefeuille kam1 (Specialiste GC) : {Enterprise.objects.filter(assigned_kam=kam1).count()} Grands Comptes assignes\n"
            f"- Portefeuille kam2 (Specialiste PME) : {Enterprise.objects.filter(assigned_kam=kam2).count()} PME assignees\n"
            f"- Portefeuille kam3 (Specialiste GC) : {Enterprise.objects.filter(assigned_kam=kam3).count()} Grands Comptes assignes\n"
        ))
