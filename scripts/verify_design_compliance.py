#!/usr/bin/env python3
"""
Onbora Design & Graphic Charter Compliance Checker
===================================================
Ce script vérifie que toutes les modifications de code dans Onbora respectent :
1. L'interdiction formelle d'utiliser des émojis Unicode dans l'interface (DESIGN.md §7 & Charte Graphique §4.1).
   -> Obligation d'utiliser le pack d'icônes officiel :
      - Web / Frontend : Icons.tsx (`frontend/src/components/shared/Icons.tsx`)
      - Mobile / Flutter : `Icons.*` ou `CupertinoIcons.*`
2. L'interdiction des ombres colorées / néon "AI slop" (DESIGN.md §6).
3. L'interdiction des bordures 1px grises artificielles sur mobile (DESIGN.md §4).
4. Le respect des principes de la charte graphique et des tokens.

Utilisation :
  python scripts/verify_design_compliance.py --staged      (Vérifie les fichiers indexés pour git commit)
  python scripts/verify_design_compliance.py --all         (Vérifie tous les fichiers UI du projet)
  python scripts/verify_design_compliance.py --files ...   (Vérifie une liste de fichiers spécifiques)
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
BOLD = "\033[1m"
RESET = "\033[0m"

# Regex for Unicode Emojis & Dingbats
EMOJI_PATTERN = re.compile(
    r'[\U0001F300-\U0001FAFF'  # Miscellaneous Symbols and Pictographs, Emoticons, Transport, etc.
    r'\U00002702-\U000027B0'  # Dingbats
    r'\U00002600-\U000026FF'  # Miscellaneous Symbols (e.g. ⚠, ⚡, ★, etc.)
    r'\u2700-\u27BF'
    r'\u231A-\u231B\u23E9-\u23EC\u23F0\u23F3'  # Clocks, media buttons
    r'\u2B50\u2B55\u2934\u2935\u25AA\u25AB\u25B6\u25C0'  # Stars and symbols
    r'✓✕✔✖➜➔'                   # Textual pseudo-emoji glyphs that should use Icons.tsx
    r']'
)

# Regex for Forbidden Glowing Colored Shadows (DESIGN.md Rule 6)
GLOWING_SHADOW_PATTERN = re.compile(
    r'shadow-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\]\s*/\s*\d+|'
    r'shadow-(?:emerald|orange|blue|indigo|purple|pink|cyan|violet|amber|red|green|teal)-\d+/\d+'
)

# Regex for Flutter 1px Border Anti-pattern (DESIGN.md Rule 4)
FLUTTER_1PX_BORDER_PATTERN = re.compile(
    r'Border\.all\s*\(\s*color:\s*(?:Colors\.grey|borderLight)[^)]*width:\s*1'
)

# Extensions allowed for inspection
RELEVANT_EXTENSIONS = ('.tsx', '.jsx', '.ts', '.js', '.dart', '.html', '.css', '.vue', '.svelte')

# Directories to always ignore
IGNORED_DIRS = {
    '.git', 'node_modules', '.next', '.dart_tool', 'build', 'dist', 
    'cpio_out', '.stitch-mcp', 'venv', '.venv', '__pycache__',
    'ios', 'android', 'windows', 'linux', 'macos'
}

# Icon suggestions helper for common emojis
EMOJI_SUGGESTIONS = {
    '👑': ('Icons.Crown', 'Icons.star / Icons.workspace_premium'),
    '🏆': ('Icons.Trophy', 'Icons.emoji_events'),
    '🥇': ('Icons.Award', 'Icons.military_tech'),
    '🥈': ('Icons.Award', 'Icons.military_tech'),
    '🥉': ('Icons.Award', 'Icons.military_tech'),
    '⚡': ('Icons.Zap', 'Icons.bolt'),
    '🎤': ('Icons.Mic', 'Icons.mic'),
    '⚠': ('Icons.AlertTriangle', 'Icons.warning_amber_rounded'),
    '⚠️': ('Icons.AlertTriangle', 'Icons.warning_amber_rounded'),
    '🎓': ('Icons.BookOpen', 'Icons.school'),
    '📥': ('Icons.Download', 'Icons.download'),
    '✓': ('Icons.Check', 'Icons.check'),
    '✔': ('Icons.Check', 'Icons.check'),
    '✕': ('Icons.X', 'Icons.close'),
    '✖': ('Icons.X', 'Icons.close'),
    '★': ('Icons.Star', 'Icons.star'),
    '➜': ('Icons.ArrowRight', 'Icons.arrow_forward'),
    '➔': ('Icons.ArrowRight', 'Icons.arrow_forward'),
    '🗺️': ('Icons.Map', 'Icons.map'),
    '✉️': ('Icons.Mail', 'Icons.mail'),
    '🚀': ('Icons.Zap', 'Icons.rocket_launch'),
    '🔍': ('Icons.Search', 'Icons.search'),
    '🤖': ('Icons.Bot', 'Icons.smart_toy'),
    '🔥': ('Icons.Flame', 'Icons.local_fire_department'),
}

def is_ignored_path(file_path: str) -> bool:
    normalized = file_path.replace('\\', '/')
    parts = normalized.split('/')
    for part in parts:
        if part in IGNORED_DIRS:
            return True
    return False

def get_git_staged_files() -> list:
    """Récupère les fichiers modifiés dans l'index Git (staged)."""
    try:
        cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        files = [f.strip() for f in res.stdout.splitlines() if f.strip()]
        return files
    except Exception as e:
        print(f"{YELLOW}[AVERTISSEMENT] Impossible de récupérer les fichiers git staged ({e}).{RESET}")
        return []

def get_all_ui_files(root_dir: str = ".") -> list:
    """Récupère tous les fichiers source UI pertinents du projet."""
    collected = []
    for root, dirs, files in os.walk(root_dir):
        # Filter directories in-place to avoid descending into ignored folders
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for f in files:
            if f.endswith(RELEVANT_EXTENSIONS):
                full_path = os.path.join(root, f)
                if not is_ignored_path(full_path):
                    collected.append(full_path)
    return collected

def check_file(file_path: str) -> list:
    """Analyse un fichier et retourne la liste des violations détectées."""
    violations = []
    if not os.path.exists(file_path) or is_ignored_path(file_path):
        return violations

    is_dart = file_path.endswith('.dart')
    is_web = file_path.endswith(('.tsx', '.jsx', '.ts', '.html', '.css'))

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_no, line in enumerate(f, 1):
                # 1. Verification EMOJIS
                emoji_matches = EMOJI_PATTERN.findall(line)
                if emoji_matches:
                    for char in set(emoji_matches):
                        web_sugg, mob_sugg = EMOJI_SUGGESTIONS.get(char, ("Icons.<Nom>", "Icons.<nom>"))
                        suggestion = f"Web: `<{web_sugg} />` depuis `@/components/shared/Icons`" if is_web else f"Flutter: `Icon({mob_sugg})`"
                        violations.append({
                            "type": "EMOJI_INTERDIT",
                            "line_no": line_no,
                            "offending": char,
                            "rule": "DESIGN.md §7 & Charte Graphique §4.1 (Interdiction formelle des émojis Unicode)",
                            "message": f"Émoji ou glyphe non autorisé '{char}'. Utilisez le pack d'icônes officiel ({suggestion}).",
                            "snippet": line.strip()
                        })

                # 2. Verification OMBRES COLOREES (Glowing Shadows)
                if is_web:
                    glow_matches = GLOWING_SHADOW_PATTERN.findall(line)
                    if glow_matches:
                        for g in glow_matches:
                            violations.append({
                                "type": "OMBRE_COLOREE_INTERDITE",
                                "line_no": line_no,
                                "offending": g,
                                "rule": "DESIGN.md §6 (Zéro ombres portées colorées / néon 'AI slop')",
                                "message": f"Ombre colorée détectée '{g}'. Utilisez des ombres neutres et douces ('shadow-xs', 'shadow-sm', 'shadow-md', ou 'shadow-none').",
                                "snippet": line.strip()
                            })

                # 3. Verification BORDURES 1PX FLUTTER
                if is_dart:
                    border_matches = FLUTTER_1PX_BORDER_PATTERN.findall(line)
                    if border_matches:
                        for b in border_matches:
                            violations.append({
                                "type": "BORDURE_1PX_INTERDITE",
                                "line_no": line_no,
                                "offending": b,
                                "rule": "DESIGN.md §4 (Zéro bordure 1px artificielle)",
                                "message": "Bordure 1px grise détectée. Privilégiez le contraste de fond et l'espace négatif sans bordure grise 1px.",
                                "snippet": line.strip()
                            })

    except Exception as e:
        print(f"{YELLOW}[Erreur lecture] {file_path}: {e}{RESET}")

    return violations

def main():
    parser = argparse.ArgumentParser(description="Vérificateur de conformité graphique et de design Onbora.")
    parser.add_argument("--staged", action="store_true", help="Vérifier uniquement les fichiers indexés pour git commit.")
    parser.add_argument("--all", action="store_true", help="Vérifier tous les fichiers UI du projet.")
    parser.add_argument("--files", nargs="*", help="Liste de fichiers spécifiques à vérifier.")
    args = parser.parse_args()

    files_to_check = []

    if args.files:
        files_to_check = args.files
    elif args.staged:
        raw_files = get_git_staged_files()
        files_to_check = [f for f in raw_files if f.endswith(RELEVANT_EXTENSIONS) and not is_ignored_path(f)]
    elif args.all:
        files_to_check = get_all_ui_files(".")
    else:
        # Par défaut, vérifie staged s'il y en a, sinon vérifie tous les fichiers modifiés dans git status
        raw_files = get_git_staged_files()
        if raw_files:
            files_to_check = [f for f in raw_files if f.endswith(RELEVANT_EXTENSIONS) and not is_ignored_path(f)]
        else:
            files_to_check = get_all_ui_files(".")

    print(f"\n{BOLD}{BLUE}======================================================{RESET}")
    print(f"{BOLD}{BLUE}🔍 ONBORA — Hook de Vérification de Conformité Graphique{RESET}")
    print(f"{BOLD}{BLUE}======================================================{RESET}")
    print(f"Fichiers examinés : {len(files_to_check)}")

    total_violations = 0
    files_with_violations = 0

    for file_path in files_to_check:
        violations = check_file(file_path)
        if violations:
            files_with_violations += 1
            total_violations += len(violations)
            norm_path = file_path.replace('\\', '/')
            print(f"\n{BOLD}{RED}❌ NON CONFORME : {norm_path}{RESET}")
            for v in violations:
                print(f"  {YELLOW}Ligne {v['line_no']}{RESET} [{BOLD}{v['type']}{RESET}] : {v['message']}")
                print(f"    {BOLD}Règle :{RESET} {v['rule']}")
                print(f"    {BOLD}Extrait :{RESET} {v['snippet'][:100]}")

    print(f"\n{BOLD}------------------------------------------------------{RESET}")
    if total_violations > 0:
        print(f"{BOLD}{RED}⛔ ÉCHEC DE VALIDATION CHARTE GRAPHIQUE & DESIGN.MD :{RESET}")
        print(f"{RED}{total_violations} violation(s) détectée(s) dans {files_with_violations} fichier(s).{RESET}")
        print(f"{YELLOW}RAPPELS STRICTS :{RESET}")
        print(f"  1. {BOLD}Émojis INTERDITS :{RESET} Utilisez toujours le pack d'icônes SVG (`Icons.tsx` pour le Web, `Icons.*` pour Flutter).")
        print(f"  2. {BOLD}Ombres colorées INTERDITES :{RESET} Pas d'effets néon fluo ('shadow-[#4F6CE8]/20', etc.).")
        print(f"  3. {BOLD}Bordures 1px INTERDITES :{RESET} Pas de `Border.all(color: Colors.grey, width: 1)` sur mobile.")
        print(f"{RED}Corrigez ces éléments avant de committer ou valider vos changements.{RESET}\n")
        sys.exit(1)
    else:
        print(f"{BOLD}{GREEN}✅ PARFAIT ! Conformité Charte Graphique & DESIGN.md validée à 100%.{RESET}")
        print(f"{GREEN}Aucun émoji Unicode détecté. Respect strict du pack d'icônes et des tokens Onbora.{RESET}\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
