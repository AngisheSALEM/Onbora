"""Real Onbora -> Research API -> separate worker -> sourced brief, entirely offline."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


def run_smoke(research_dir, research_python):
    flags = {"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0)}
    with tempfile.TemporaryDirectory(prefix="onbora-research-smoke-") as folder:
        env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "ONBORA_ENVIRONMENT": "local",
            "ONBORA_DB_PATH": str(Path(folder) / "research.sqlite3"), "ONBORA_RESEARCH_MODE": "corpus",
            "ONBORA_DELETION_LEDGER_PATH": str(Path(folder) / "deletions.jsonl"),
            "ONBORA_SEARCH_STRATEGY": "google", "ONBORA_SERPAPI_API_KEY": "",
            "ONBORA_ALLOWED_HOSTS": "127.0.0.1", "SMOKE_SECRET_FILE": str(Path(folder) / "token")}
        bootstrap = '''import os, django
django.setup()
from django.core.management import call_command
from research.models import Workspace, ClientIdentity
from pathlib import Path
call_command("migrate", verbosity=0)
w = Workspace.objects.create(slug="onbora-smoke")
c = ClientIdentity(name="onbora", workspace=w, permissions=["research:create", "research:read", "research:cancel"])
Path(os.environ["SMOKE_SECRET_FILE"]).write_text(c.issue_token(), encoding="utf-8")
'''
        subprocess.run([str(research_python), "-c", bootstrap], cwd=research_dir, env=env,
                       check=True, stdout=subprocess.DEVNULL, **flags)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        processes = []
        try:
            for command in (["serve_research", "--port", str(port)], ["run_research_worker", "--loop"]):
                processes.append(subprocess.Popen([str(research_python), "manage.py", *command],
                    cwd=research_dir, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags))
            origin = f"http://127.0.0.1:{port}"
            deadline = time.monotonic() + 30
            while True:
                try:
                    with urlopen(origin + "/health/ready", timeout=1) as response:
                        assert response.status == 200
                    break
                except (URLError, TimeoutError):
                    if any(p.poll() is not None for p in processes) or time.monotonic() > deadline:
                        raise RuntimeError("Research API failed to start") from None
                    time.sleep(0.1)
            _exercise_onbora(origin, Path(env["SMOKE_SECRET_FILE"]).read_text(encoding="utf-8"))
        finally:
            for process in processes:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)


def _exercise_onbora(origin, token):
    sys.path.insert(0, str(ROOT / "backend"))
    os.environ["DJANGO_SETTINGS_MODULE"] = "onbora.test_settings"
    import django
    django.setup()
    from django.core.management import call_command
    from django.contrib.auth import get_user_model
    from django.db import connections
    from django.test import override_settings
    from rest_framework.test import APIClient
    from sales.models import Enterprise
    from apps.ai_core.company_analysis.worker import process_next_research
    from apps.ai_core.models import CompanyResearchJob
    call_command("migrate", verbosity=0)
    user = get_user_model().objects.create_user(username="smoke-kam", role="KAM")
    enterprise = Enterprise.objects.create(name="Atelier Kivu Fictif", city="Kinshasa",
        website="https://kivu.example/", rccm="CD/KIN/FICT/001", assigned_kam=user)
    api = APIClient()
    api.force_authenticate(user)
    try:
        with override_settings(ONBORA_ANALYSIS_URL=origin, ONBORA_RESEARCH_API_TOKEN=token):
            route = f"/api/kam/pre-call/{enterprise.pk}/"
            created = api.post(route, {}, format="json", HTTP_IDEMPOTENCY_KEY="smoke-v2")
            assert created.status_code == 202, created.data
            job = CompanyResearchJob.objects.get()
            deadline = time.monotonic() + 30
            while job.state in ("queued", "running"):
                assert time.monotonic() < deadline, "Research did not complete"
                process_next_research()
                job.refresh_from_db()
                time.sleep(0.1)
            assert job.state == "completed", job.error_code
            assert job.application_status == "applied", job.application_status
            brief = api.get(route)
            assert brief.status_code == 200, brief.data
            assert len(brief.data["ai_summary"]["key_facts"]) >= 2, brief.data
            assert brief.data["evidence"], brief.data
            assert api.post(route, {}, format="json", HTTP_IDEMPOTENCY_KEY="smoke-v2").data["research_job"]["id"] == str(job.pk)
            assert CompanyResearchJob.objects.count() == 1
            print(json.dumps({"onbora_http": "passed", "research_v2_http": "passed",
                "separate_research_worker": "passed", "idempotency": "passed",
                "sourced_facts": len(brief.data["ai_summary"]["key_facts"]),
                "mode": "fictional_corpus", "external_provider_calls": 0}))
    finally:
        connections.close_all()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research-dir", required=True, type=Path)
    parser.add_argument("--research-python", type=Path)
    args = parser.parse_args()
    research_dir = args.research_dir.resolve()
    python = args.research_python or research_dir / ".venv/Scripts/python.exe"
    run_smoke(research_dir, python)
