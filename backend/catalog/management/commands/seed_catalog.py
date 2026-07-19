from django.core.management.base import BaseCommand
from catalog.models import ServiceCatalog

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
        for data in services:
            name = data['name']
            ServiceCatalog.objects.filter(name=name).delete()
            ServiceCatalog.objects.create(**data)
            self.stdout.write(self.style.SUCCESS(f"Service '{name}' added to catalog."))
            
        self.stdout.write(self.style.SUCCESS('Catalog seeding complete!'))
