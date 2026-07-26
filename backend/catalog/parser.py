import zipfile
import xml.etree.ElementTree as ET
from PyPDF2 import PdfReader
import json
import re

def extract_text_from_pdf(file_obj):
    try:
        reader = PdfReader(file_obj)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def extract_text_from_docx(file_obj):
    try:
        with zipfile.ZipFile(file_obj) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            paragraphs = []
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text for node in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

def parse_catalog_text(text):
    services = []
    
    # Split text into blocks using "Service:" as delimiter
    blocks = re.split(r'Service\s*:\s*', text, flags=re.IGNORECASE)
    
    for block in blocks[1:]:
        lines = block.split('\n')
        name = lines[0].strip()
        
        category = 'CONNECTIVITY'
        description = ''
        benefits = ''
        tech_reqs = {}
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            
            if re.match(r'^(Catégorie|Categorie)\s*:\s*', line, re.IGNORECASE):
                cat_val = re.sub(r'^(Catégorie|Categorie)\s*:\s*', '', line, flags=re.IGNORECASE).strip().upper()
                # Mapping user categories
                if 'SECUR' in cat_val or 'CYBER' in cat_val:
                    category = 'SECURITY'
                elif 'CLOUD' in cat_val or 'HOST' in cat_val:
                    category = 'CLOUD'
                elif 'COLLAB' in cat_val or 'COMM' in cat_val or 'TEL' in cat_val:
                    category = 'COLLABORATIVE'
                elif 'PAY' in cat_val or 'PAIE' in cat_val or 'MONEY' in cat_val:
                    category = 'PAYMENT'
                else:
                    category = 'CONNECTIVITY'
            elif re.match(r'^Description\s*:\s*', line, re.IGNORECASE):
                description = re.sub(r'^Description\s*:\s*', '', line, flags=re.IGNORECASE).strip()
            elif re.match(r'^(Avantages|Avantage|Bénéfices|Benefices)\s*:\s*', line, re.IGNORECASE):
                benefits = re.sub(r'^(Avantages|Avantage|Bénéfices|Benefices)\s*:\s*', '', line, flags=re.IGNORECASE).strip()
            elif re.match(r'^(Exigences|Prérequis|Prerequis|Exigence|Technique)\s*:\s*', line, re.IGNORECASE):
                reqs_str = re.sub(r'^(Exigences|Prérequis|Prerequis|Exigence|Technique)\s*:\s*', '', line, flags=re.IGNORECASE).strip()
                try:
                    tech_reqs = json.loads(reqs_str)
                except:
                    # Key-value fallback
                    parts = reqs_str.split(',')
                    for p in parts:
                        kv = p.split('=')
                        if len(kv) == 2:
                            tech_reqs[kv[0].strip()] = kv[1].strip()
                    if not tech_reqs:
                        tech_reqs = {"detail": reqs_str}
        
        if name:
            services.append({
                "name": name,
                "category": category,
                "description": description or f"Description de {name}",
                "benefits": benefits or "Service managé haute disponibilité.",
                "technical_requirements": tech_reqs
            })
            
    return services

def extract_simulated_services(filename, file_type):
    """
    Simulates OCR, PDF parsing, or Video audio transcription
    when files are scanned, videos or contain unformatted text.
    """
    fn = filename.lower()
    
    if 'security' in fn or 'cyber' in fn or 'protect' in fn:
        return [
            {
                "name": "Onbora EDR Sentinel",
                "category": "SECURITY",
                "description": "Protection avancée contre les ransomwares et menaces zero-day sur l'ensemble des terminaux.",
                "benefits": "Isolation automatique des menaces, supervision SOC 24/7.",
                "technical_requirements": {"OS": "Windows/Linux/macOS", "Agent": "Léger (<50MB)"}
            },
            {
                "name": "Pare-feu Managé Cloud",
                "category": "SECURITY",
                "description": "Filtrage web, inspection SSL et prévention des intrusions pour les sites distants.",
                "benefits": "Mises à jour quotidiennes des règles de sécurité.",
                "technical_requirements": {"throughput": "1 Gbps", "VLANs": "Jusqu'à 16"}
            }
        ]
    elif 'cloud' in fn or 'host' in fn or 'server' in fn:
        return [
            {
                "name": "Onbora Server Backup",
                "category": "CLOUD",
                "description": "Sauvegarde automatique et externalisée des serveurs physiques et machines virtuelles.",
                "benefits": "Restauration en moins de 15 minutes garantie par SLA.",
                "technical_requirements": {"SGBD": "SQL Server, MySQL", "Backup_Interval": "1h"}
            },
            {
                "name": "Hébergement IaaS Privé",
                "category": "CLOUD",
                "description": "Serveurs virtuels haute performance hébergés dans des datacenters certifiés Tier-III.",
                "benefits": "Ressources garanties et extensibles en temps réel.",
                "technical_requirements": {"vCPU": "4", "RAM": "16 GB", "SSD": "200 GB"}
            }
        ]
    elif 'collab' in fn or 'telephon' in fn or 'teams' in fn or 'voip' in fn:
        return [
            {
                "name": "Teams Direct Routing",
                "category": "COLLABORATIVE",
                "description": "Raccordement de votre téléphonie d'entreprise directement dans Microsoft Teams.",
                "benefits": "Appels illimités et portabilité des numéros existants.",
                "technical_requirements": {"Licenses": "Microsoft 365 E3/E5", "Codec": "G.711, G.722"}
            }
        ]
    elif 'payment' in fn or 'terminal' in fn or 'money' in fn:
        return [
            {
                "name": "Orange Money Gateway",
                "category": "PAYMENT",
                "description": "API d'intégration pour accepter les paiements par mobile money Orange Money en caisse.",
                "benefits": "Commissions réduites et encaissement en temps réel.",
                "technical_requirements": {"API": "REST HTTPS", "Format": "JSON"}
            }
        ]
    else:
        # Default mix
        return [
            {
                "name": "Ligne de Secours 4G/5G",
                "category": "CONNECTIVITY",
                "description": "Bascule automatique (failover) sur le réseau mobile Orange en cas de coupure de la fibre.",
                "benefits": "Continuité de service garantie sans coupure.",
                "technical_requirements": {"Routeur": "Double WAN", "SIM": "Orange Pro"}
            },
            {
                "name": "Onbora Wifi Guest",
                "category": "CONNECTIVITY",
                "description": "Portail captif personnalisable pour offrir un accès internet sécurisé à vos visiteurs.",
                "benefits": "Conformité légale avec conservation des logs de connexion.",
                "technical_requirements": {"SSID": "Guest-Wifi", "Isolation": "Client-to-Client"}
            }
        ]
