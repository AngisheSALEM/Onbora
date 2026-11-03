"""Run the HTTP server and persistent AI worker in the existing Render service."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def main():
    processes = []
    stopping = False

    def stop(signum, frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        commands = [
            [sys.executable, "-m", "gunicorn", "onbora.wsgi:application", "--bind",
             f"0.0.0.0:{os.getenv('PORT', '8000')}"],
            [sys.executable, "manage.py", "run_ai_jobs"],
        ]
        for command in commands:
            processes.append(subprocess.Popen(command, cwd=Path(__file__).resolve().parent))
        while not stopping:
            if any(process.poll() is not None for process in processes):
                return 1  # Let the hosting supervisor restart both processes.
            time.sleep(1)
        return 0
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    raise SystemExit(main())
