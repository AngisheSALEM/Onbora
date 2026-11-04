"""Configure the local server credential without printing it or changing other settings."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parent.parent


def configure(research_dir, research_python, origin):
    env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "ONBORA_ENVIRONMENT": "local",
           "ONBORA_DB_PATH": str(research_dir / "db.sqlite3"), "ONBORA_RESEARCH_MODE": "corpus"}
    flags = {"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0)}
    subprocess.run([str(research_python), "manage.py", "migrate", "--noinput"], cwd=research_dir,
                   env=env, check=True, stdout=subprocess.DEVNULL, **flags)
    target = ROOT / "backend/.env"
    content = target.read_text(encoding="utf-8-sig") if target.exists() else ""
    existing = re.search(r"^ONBORA_RESEARCH_API_TOKEN\s*=\s*(.+)$", content, re.MULTILINE)
    if existing and existing.group(1).strip():
        print("Existing backend credential preserved. No key rotated.")
        return
    created = subprocess.run([str(research_python), "manage.py", "create_client",
        "onbora-backend-" + uuid.uuid4().hex[:8], "--workspace", "onbora"], cwd=research_dir,
        env=env, check=True, capture_output=True, text=True, **flags)
    token = next((line.strip() for line in created.stdout.splitlines()
                  if re.fullmatch(r"onb_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", line.strip())), None)
    if not token:
        raise RuntimeError("Credential creation failed; no environment file updated")
    values = {"ONBORA_ANALYSIS_URL": origin, "ONBORA_RESEARCH_API_TOKEN": token,
              "ONBORA_RESEARCH_COUNTRY_CODE": "CD"}
    for key, value in values.items():
        pattern = rf"^{re.escape(key)}=.*$"
        if re.search(pattern, content, re.MULTILINE):
            content = re.sub(pattern, lambda _: key + "=" + value, content, flags=re.MULTILINE)
        else:
            content = content.rstrip() + "\n" + key + "=" + value + "\n"
    target.write_text(content, encoding="utf-8")
    print("Research API migrated; technical credential stored only in backend/.env.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research-dir", type=Path, required=True)
    parser.add_argument("--research-python", type=Path)
    parser.add_argument("--origin", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    directory = args.research_dir.resolve()
    configure(directory, args.research_python or directory / ".venv/Scripts/python.exe", args.origin)
