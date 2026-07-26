import os
import sys
import subprocess
from django.core.management.base import BaseCommand

def get_agent_reach_cmd():
    python_dir = os.path.dirname(sys.executable)
    exe_name = "agent-reach.exe" if os.name == 'nt' else "agent-reach"
    agent_reach_path = os.path.join(python_dir, exe_name)
    if os.path.exists(agent_reach_path):
        return agent_reach_path
    return "agent-reach"

def clean_stdout(text):
    if not text:
        return ""
    try:
        encoding = sys.stdout.encoding or 'utf-8'
        return text.encode(encoding, errors='replace').decode(encoding)
    except:
        return text.encode('ascii', errors='ignore').decode('ascii')

class Command(BaseCommand):
    help = "Installs amont modules and runs diagnostics for the Agent-Reach scraping tool."

    def handle(self, *args, **options):
        agent_reach_cmd = get_agent_reach_cmd()
        self.stdout.write(self.style.WARNING(clean_stdout(f"--- [Étape 1: Installation des Dépendances (CLI: {agent_reach_cmd})] ---")))
        
        try:
            self.stdout.write("Exécution de 'agent-reach install'...")
            res_install = subprocess.run(
                [agent_reach_cmd, "install"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                shell=True
            )
            if res_install.stdout:
                self.stdout.write(clean_stdout(res_install.stdout))
            if res_install.stderr:
                self.stdout.write(self.style.WARNING(clean_stdout(f"Output stderr: {res_install.stderr}")))
            
            if res_install.returncode == 0:
                self.stdout.write(self.style.SUCCESS("Installation d'Agent-Reach complétée avec succès."))
            else:
                self.stdout.write(self.style.ERROR(f"L'installation a renvoyé le code de retour {res_install.returncode}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(clean_stdout(f"Erreur système lors du lancement de l'installation : {str(e)}")))

        self.stdout.write(self.style.WARNING("\n--- [Étape 2: Diagnostics de Sécurité et Canaux (agent-reach doctor)] ---"))
        
        try:
            self.stdout.write("Exécution de 'agent-reach doctor'...")
            res_doctor = subprocess.run(
                [agent_reach_cmd, "doctor"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                shell=True
            )
            if res_doctor.stdout:
                self.stdout.write(clean_stdout(res_doctor.stdout))
            if res_doctor.stderr:
                self.stdout.write(self.style.WARNING(clean_stdout(f"Output doctor stderr: {res_doctor.stderr}")))
                
            if res_doctor.returncode == 0:
                self.stdout.write(self.style.SUCCESS("Diagnostic Agent-Reach terminé avec succès."))
            else:
                self.stdout.write(self.style.WARNING(f"Diagnostic terminé avec le code {res_doctor.returncode}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(clean_stdout(f"Erreur système lors du lancement du diagnostic : {str(e)}")))
