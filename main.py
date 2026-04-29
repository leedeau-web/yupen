import subprocess
import sys
import os

if __name__ == "__main__":
    os.chdir("backend")
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", os.environ.get("PORT", "8000")
    ])
