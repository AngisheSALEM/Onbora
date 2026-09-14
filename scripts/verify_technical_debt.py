#!/usr/bin/env python3
"""
Onbora Technical Debt & Architecture Linter
===========================================
Ce script audite les dettes techniques sur Onbora en s'appuyant sur :
1. Les compétences d'architecture logicielle (`software-architecture-system-design` & `architecture-agent`) :
   - Clean Architecture (séparation stricte de la logique métier vs vues/contrôleurs).
   - Modularité et Domain-Driven Design (isolation des contextes B2B, Sales, KAM, Admin).
   - Détection des composants volumineux (God Classes / Fat Views > 90 lignes).
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

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            content = "".join(lines)

            # A. God Views / Fat Views (> 120 lines in a single view method)
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

            # C. Secrets hardcodes
            for line_no, line in enumerate(lines, 1):
                if SECRET_KEY_PATTERN.search(line) and 'test' not in norm_path:
                    issues.append({
                        "type": "SECURITY_HARDCODED_SECRET",
                        "line_no": line_no,
                        "skill": "software-architecture-system-design (Security-by-Default)",
                        "message": "Secret ou clé API détecté en dur. Utilisez obligatoirement os.getenv() ou .env.",
                        "snippet": line.strip()[:80]
                    })

                # D. Raw SQL injection risk
                if RAW_SQL_PATTERN.search(line):
                    issues.append({
                        "type": "DJANGO_RAW_SQL_RISK",
                        "line_no": line_no,
                        "skill": "django-backend-python (ORM Security)",
                        "message": "Requête SQL brute non sécurisée détectée.",
                        "snippet": line.strip()[:80]
                    })

                # E. Anti-Pattern : Fausses données mockées / diagnostiques hardcodés
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

def main():
    parser = argparse.ArgumentParser(description="Vérificateur de dettes techniques & architecture Onbora.")
    parser.add_argument("--staged", action="store_true", help="Vérifier uniquement les fichiers Python stagés.")
    parser.add_argument("--all", action="store_true", help="Vérifier tous les fichiers backend Django.")
    parser.add_argument("--files", nargs="*", help="Fichiers spécifiques à vérifier.")
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
    print(f"{BOLD}{MAGENTA}🏗️  ONBORA — Hook d'Audit de Dette Technique & Architecture{RESET}")
    print(f"{BOLD}{MAGENTA}================================================================{RESET}")
    print(f"Fichiers Python analysés : {len(files)}")

    total_issues = 0
    for f in files:
        issues = analyze_django_file(f)
        if issues:
            total_issues += len(issues)
            print(f"\n{BOLD}{RED}⚠️ DETTE TECHNIQUE DÉTECTÉE : {f.replace('\\', '/')}{RESET}")
            for iss in issues:
                print(f"  {YELLOW}Ligne {iss['line_no']}{RESET} [{BOLD}{iss['type']}{RESET}]")
                print(f"    {BOLD}Skill référent :{RESET} {iss['skill']}")
                print(f"    {BOLD}Alerte :{RESET} {iss['message']}")
                print(f"    {BOLD}Extrait :{RESET} {iss['snippet']}")

    print(f"\n{BOLD}----------------------------------------------------------------{RESET}")
    if total_issues > 0:
        print(f"{BOLD}{YELLOW}⚡ {total_issues} point(s) de dette technique ou d'architecture soulevé(s).{RESET}")
        print(f"{BLUE}Recommandations : Consultez les skills `software-architecture-system-design` et `django-backend-python`.{RESET}\n")
    else:
        print(f"{BOLD}{GREEN}✅ EXCELLENT ! Aucune dette technique critique ou anti-pattern détecté.{RESET}")
        print(f"{GREEN}Architecture Clean SoC et bonnes pratiques Django/DRF parfaitement respectées.{RESET}\n")

if __name__ == "__main__":
    main()
