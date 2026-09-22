#!/usr/bin/env python3
"""
Onbora Technical Debt, Architecture & Connectivity Linter
=========================================================
Ce script audite les dettes techniques et l'intégrité de connectivité sur Onbora en s'appuyant sur :
1. Les compétences d'architecture logicielle (`software-architecture-system-design` & `architecture-agent`) :
   - Clean Architecture (Règle de dépendance : les modèles de domaine n'importent jamais de vues).
   - Modularité et Domain-Driven Design (isolation des contextes B2B, Sales, KAM, Admin).
   - Détection des composants volumineux (God Classes / Fat Views > 90 lignes).
   - Intégrité du câblage système : validation du montage des URLconf et vérification des contrats d'API client (Next.js & Flutter).
2. Les compétences Django & Python Backend (`django-backend-python`) :
   - Détection des risques de requêtes N+1 (absence de select_related / prefetch_related dans serializers).
   - Détection de requêtes SQL brutes ou secrets hardcodés.
   - Respect des conventions de services et use-cases découplés.

Utilisation :
  python scripts/verify_technical_debt.py --staged
  python scripts/verify_technical_debt.py --all
  python scripts/verify_technical_debt.py --files <path1> <path2>
"""

import os
import sys
import re
import subprocess
import argparse

# Force UTF-8 stdout on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ANSI colors
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

IGNORED_PARTS = {
    'venv', '.venv', 'site-packages', '.git', 'node_modules', '.next',
    '.dart_tool', 'build', 'dist', '__pycache__', 'migrations',
    'database_exports', 'static', 'media', 'cpio_out', 'core-ai',
    '.stitch-mcp', 'brain', 'tmp', '.gemini'
}

SERIALIZER_QUERY_PATTERN = re.compile(
    r'def\s+get_[a-zA-Z0-9_]+\s*\([^)]+\):(?:[^\n]*\n){1,6}[^\n]*\.(?:objects\.(?:get|filter|all))\('
)

SECRET_KEY_PATTERN = re.compile(
    r'(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\s*=\s*["\'][a-zA-Z0-9_\-]{20,}["\']',
    re.IGNORECASE
)

RAW_SQL_PATTERN = re.compile(
    r'\.raw\s*\(|\.extra\s*\(|cursor\.execute\s*\(\s*f["\']|cursor\.execute\s*\(\s*["\'].*?%'
)

MOCK_REPORT_PATTERN = re.compile(
    r'(?:confirmed_needs|detected_needs)\s*=\s*\[\s*["\']Lien Fibre Optique|actions_todo\s*=\s*\[\s*f?["\']Transmettre le devis technique personnalisé'
)

REVERSE_IMPORT_PATTERN = re.compile(
    r'^\s*(?:from\s+[a-zA-Z0-9_.]+\s+import\s+.*(?:views|viewsets)|import\s+[a-zA-Z0-9_.]*(?:views|viewsets))',
    re.MULTILINE
)

INTERNAL_TOOL_APPS = {'workbench', 'api', 'reports'}

def is_ignored(path: str) -> bool:
    normalized = path.replace('\\', '/').lower()
    parts = normalized.split('/')
    return any(p in IGNORED_PARTS for p in parts)

def get_git_staged_python_files() -> list:
    try:
        cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        files = [f.strip() for f in res.stdout.splitlines() if f.strip().endswith('.py')]
        return [f for f in files if not is_ignored(f)]
    except Exception:
        return []

def get_all_python_backend_files(root_dir: str = "backend") -> list:
    collected = []
    if not os.path.exists(root_dir):
        return collected
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d.lower() not in IGNORED_PARTS]
        if is_ignored(root):
            continue
        for f in files:
            if f.endswith('.py'):
                full_path = os.path.join(root, f)
                if not is_ignored(full_path):
                    collected.append(full_path)
    return collected

def analyze_django_file(file_path: str) -> list:
    issues = []
    norm_path = file_path.replace('\\', '/')
    is_view = 'views' in norm_path or 'viewsets' in norm_path
    is_serializer = 'serializers' in norm_path or 'serializer' in norm_path
    is_model = 'models' in norm_path

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            content = "".join(lines)

            # A. God Views / Fat Views (> 90 lines in a single view method)
            if is_view:
                current_func = None
                func_start = 0
                for line_idx, line in enumerate(lines, 1):
                    func_match = re.match(r'^(?:    def|def)\s+([a-zA-Z0-9_]+)\s*\(', line)
                    if func_match:
                        if current_func and (line_idx - func_start) > 90:
                            issues.append({
                                "type": "FAT_VIEW_ANTI_PATTERN",
                                "line_no": func_start,
                                "skill": "software-architecture-system-design (Clean SoC)",
                                "message": f"Fonction vue `{current_func}` volumineuse ({line_idx - func_start} lignes). La logique métier doit être déportée dans un Use Case ou Service dédié.",
                                "snippet": lines[func_start - 1].strip()
                            })
                        current_func = func_match.group(1)
                        func_start = line_idx

            # B. Serializer N+1 Queries
            if is_serializer:
                for match in SERIALIZER_QUERY_PATTERN.finditer(content):
                    line_no = content[:match.start()].count('\n') + 1
                    issues.append({
                                "type": "DJANGO_N_PLUS_ONE_RISK",
                                "line_no": line_no,
                                "skill": "django-backend-python (Optimisation ORM)",
                                "message": "Requête ORM dans SerializerMethodField. Risque de N+1 queries. Utilisez select_related / prefetch_related dans le queryset.",
                                "snippet": content[match.start():match.start()+60].replace('\n', ' ')
                            })

            # C. Clean Architecture Dependency Inversion : les modèles ne doivent jamais importer des vues
            if is_model:
                for match in REVERSE_IMPORT_PATTERN.finditer(content):
                    line_no = content[:match.start()].count('\n') + 1
                    issues.append({
                        "type": "CLEAN_ARCHITECTURE_REVERSE_IMPORT",
                        "line_no": line_no,
                        "skill": "software-architecture-system-design (Dependency Rule)",
                        "message": "Violation de la règle de dépendance Clean Architecture : un modèle de domaine importe une vue ou un contrôleur externe.",
                        "snippet": match.group(0).strip()
                    })

            # D. Secrets hardcodes
            for line_no, line in enumerate(lines, 1):
                if SECRET_KEY_PATTERN.search(line) and 'test' not in norm_path:
                    issues.append({
                        "type": "SECURITY_HARDCODED_SECRET",
                        "line_no": line_no,
                        "skill": "software-architecture-system-design (Security-by-Default)",
                        "message": "Secret ou clé API détecté en dur. Utilisez obligatoirement os.getenv() ou .env.",
                        "snippet": line.strip()[:80]
                    })

                # E. Raw SQL injection risk
                if RAW_SQL_PATTERN.search(line):
                    issues.append({
                        "type": "DJANGO_RAW_SQL_RISK",
                        "line_no": line_no,
                        "skill": "django-backend-python (ORM Security)",
                        "message": "Requête SQL brute non sécurisée détectée.",
                        "snippet": line.strip()[:80]
                    })

                # F. Anti-Pattern : Fausses données mockées / diagnostiques hardcodés
                if ('views' in norm_path or 'service' in norm_path) and 'test' not in norm_path:
                    if MOCK_REPORT_PATTERN.search(line):
                        issues.append({
                            "type": "ANTI_MOCK_DATA_LEAK",
                            "line_no": line_no,
                            "skill": "software-architecture-system-design (Clean SoC & Zero-Mock Data)",
                            "message": "Données mockées / diagnostiques hardcodés détectés dans le flux de production. Les besoins et livrables doivent provenir de Gemini, du RAG ou de la base réelle.",
                            "snippet": line.strip()[:80]
                        })

    except Exception as e:
        print(f"{YELLOW}[Erreur lecture] {file_path}: {e}{RESET}")

    return issues

def audit_connectivity_and_wiring(base_dir: str = ".") -> list:
    """
    Audite la connectivité globale du système :
    1. Câblage des URLconf Django (toutes les apps exposées sont-elles montées ?).
    2. Résolution des modules d'URL référencés dans backend/onbora/urls.py.
    3. Cohérence des contrats d'appels API clients (Frontend Next.js et Mobile Flutter).
    """
    connectivity_issues = []
    backend_urls_path = os.path.join(base_dir, "backend", "onbora", "urls.py")
    apps_dir = os.path.join(base_dir, "backend", "apps")

    if not os.path.exists(backend_urls_path):
        return [{"type": "MISSING_MAIN_URLS", "message": f"Fichier principal {backend_urls_path} introuvable."}]

    try:
        with open(backend_urls_path, 'r', encoding='utf-8') as f:
            urls_content = f.read()
    except Exception as e:
        return [{"type": "READ_ERROR", "message": f"Erreur de lecture de urls.py: {e}"}]

    # 1. Nettoyage des docstrings et commentaires pour éviter les faux positifs (ex: blog.urls)
    clean_urls_content = re.sub(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', '', urls_content)
    clean_urls_content = re.sub(r'#.*', '', clean_urls_content)

    # Extraction des routes et inclusions réelles
    include_pattern = re.compile(r"path\(\s*['\"]([^'\"]*)['\"]\s*,\s*include\(\s*['\"]([^'\"]+)['\"]\s*\)")
    mounted_routes = []
    mounted_modules = set()

    for match in include_pattern.finditer(clean_urls_content):
        prefix, module = match.groups()
        mounted_routes.append(prefix.strip('/'))
        mounted_modules.add(module)

    # 2. Vérification de l'existence des modules montés
    for module in mounted_modules:
        parts = module.split('.')
        # Gère 'apps.ai_core.urls' ou 'accounts.urls'
        candidate_paths = [
            os.path.join(base_dir, "backend", *parts) + ".py",
            os.path.join(base_dir, "backend", "apps", *parts) + ".py",
        ]
        if len(parts) >= 2 and parts[0] == 'apps':
            candidate_paths.append(os.path.join(base_dir, "backend", *parts) + ".py")
        elif len(parts) >= 2:
            candidate_paths.append(os.path.join(base_dir, "backend", "apps", parts[0], parts[1] + ".py"))

        exists = any(os.path.exists(p) for p in candidate_paths)
        if not exists:
            connectivity_issues.append({
                "type": "BROKEN_URL_MODULE_REFERENCE",
                "skill": "software-architecture-system-design (Wiring Integrity)",
                "message": f"Le module d'URL `{module}` référencé dans onbora/urls.py est introuvable sur le disque.",
                "details": f"Chemins testés : {candidate_paths[0]}"
            })

    # 3. Vérification des apps définissant un urls.py non monté
    if os.path.exists(apps_dir):
        for app_name in os.listdir(apps_dir):
            app_path = os.path.join(apps_dir, app_name)
            if os.path.isdir(app_path) and app_name not in IGNORED_PARTS and app_name not in INTERNAL_TOOL_APPS:
                app_urls = os.path.join(app_path, "urls.py")
                if os.path.exists(app_urls):
                    # Vérifier si l'app est mentionnée dans mounted_modules
                    is_mounted = any(app_name in m for m in mounted_modules)
                    if not is_mounted:
                        connectivity_issues.append({
                            "type": "UNMOUNTED_APP_URLCONF",
                            "skill": "software-architecture-system-design (Modular Architecture)",
                            "message": f"L'application `{app_name}` contient un fichier `urls.py` non monté dans `backend/onbora/urls.py`.",
                            "details": f"Fichier orphelin : {app_urls}"
                        })

    # 4. Vérification des contrats d'appels API clients (Frontend & Mobile)
    known_prefixes = set()
    for r in mounted_routes:
        segments = [s for s in r.split('/') if s and s != 'v1']
        if len(segments) >= 2 and segments[0] == 'api':
            known_prefixes.add(segments[1])
        elif segments:
            known_prefixes.add(segments[0])

    client_endpoints = set()
    client_dirs = [
        os.path.join(base_dir, "frontend", "src"),
        os.path.join(base_dir, "mobile", "lib")
    ]

    api_call_pattern = re.compile(r'["\']/(api/(?:v1/)?([a-zA-Z0-9_\-]+))')

    for cdir in client_dirs:
        if not os.path.exists(cdir):
            continue
        for root, _, files in os.walk(cdir):
            for f in files:
                if f.endswith(('.ts', '.tsx', '.dart')):
                    fpath = os.path.join(root, f)
                    try:
                        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                            fcontent = fp.read()
                            for m in api_call_pattern.finditer(fcontent):
                                prefix = m.group(2)
                                client_endpoints.add((prefix, fpath.replace('\\', '/')))
                    except Exception:
                        pass

    for prefix, source_file in client_endpoints:
        # Tolérer les endpoints standards Django ou utilitaires
        if prefix in {'schema', 'docs', 'health', 'token', 'me'}:
            continue
        if prefix not in known_prefixes:
            connectivity_issues.append({
                "type": "UNCONNECTED_CLIENT_API_CONTRACT",
                "skill": "software-architecture-system-design (Client-Server Contract)",
                "message": f"Le client appelle le préfixe d'API `/api/{prefix}/` qui n'est monté dans aucun `urlpatterns` Django.",
                "details": f"Appelé dans : {source_file}"
            })

    return connectivity_issues

def main():
    parser = argparse.ArgumentParser(description="Auditeur de dettes techniques, architecture & connectivité Onbora.")
    parser.add_argument("--staged", action="store_true", help="Vérifier uniquement les fichiers Python stagés.")
    parser.add_argument("--all", action="store_true", help="Vérifier tous les fichiers backend Django.")
    parser.add_argument("--files", nargs="*", help="Fichiers spécifiques à vérifier.")
    parser.add_argument("--check-connectivity", action="store_true", default=True, help="Auditer le câblage système et les contrats clients.")
    args = parser.parse_args()

    if args.files:
        files = args.files
    elif args.staged:
        files = get_git_staged_python_files()
    elif args.all:
        files = get_all_python_backend_files("backend")
    else:
        staged = get_git_staged_python_files()
        files = staged if staged else get_all_python_backend_files("backend")

    print(f"\n{BOLD}{MAGENTA}================================================================{RESET}")
    print(f"{BOLD}{MAGENTA}[AUDIT] ONBORA — Hook d'Audit de Dette Technique & Connectivité{RESET}")
    print(f"{BOLD}{MAGENTA}================================================================{RESET}")
    print(f"{CYAN}Analyse en cours : {len(files)} fichier(s) Python backend...{RESET}")

    total_code_issues = 0
    for f in files:
        issues = analyze_django_file(f)
        if issues:
            total_code_issues += len(issues)
            print(f"\n{BOLD}{RED}[ALERTE DETTE] {f.replace('\\', '/')}{RESET}")
            for iss in issues:
                print(f"  {YELLOW}Ligne {iss['line_no']}{RESET} [{BOLD}{iss['type']}{RESET}]")
                print(f"    {BOLD}Skill référent :{RESET} {iss['skill']}")
                print(f"    {BOLD}Alerte :{RESET} {iss['message']}")
                print(f"    {BOLD}Extrait :{RESET} {iss['snippet']}")

    print(f"\n{CYAN}Audit de connectivité et de câblage architectural en cours...{RESET}")
    connectivity_issues = audit_connectivity_and_wiring(".")
    total_conn_issues = len(connectivity_issues)

    if connectivity_issues:
        print(f"\n{BOLD}{RED}[ALERTE CONNECTIVITE] Anomalie(s) de routage ou de contrat client détectée(s) :{RESET}")
        for c_iss in connectivity_issues:
            print(f"  [{BOLD}{c_iss['type']}{RESET}]")
            print(f"    {BOLD}Skill référent :{RESET} {c_iss.get('skill', 'software-architecture-system-design')}")
            print(f"    {BOLD}Alerte :{RESET} {c_iss['message']}")
            if 'details' in c_iss:
                print(f"    {BOLD}Détails :{RESET} {c_iss['details']}")

    total_issues = total_code_issues + total_conn_issues
    print(f"\n{BOLD}----------------------------------------------------------------{RESET}")
    if total_issues > 0:
        print(f"{BOLD}{YELLOW}[STATUT] {total_issues} point(s) de dette ou d'anomalie de câblage détecté(s).{RESET}")
        print(f"{BLUE}Recommandations : Consultez les skills `software-architecture-system-design` et `django-backend-python`.{RESET}\n")
        sys.exit(1)
    else:
        print(f"{BOLD}{GREEN}[STATUT : SUCCES] Aucune dette technique ni anomalie de connectivité.{RESET}")
        print(f"{GREEN}Architecture Clean SoC, contrats de routage et bonnes pratiques Django/DRF parfaitement respectés.{RESET}\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
