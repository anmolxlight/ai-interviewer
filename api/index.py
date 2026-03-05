import sys
import os

# Add the backend directory to the Python path so imports in main.py resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Vercel sets env vars from the project settings, so dotenv isn't needed here,
# but main.py calls load_dotenv() which is harmless when no .env exists.
from main import app  # noqa: E402 — path must be set before import
