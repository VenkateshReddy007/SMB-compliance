import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "services" / "api"

for path in (ROOT, API_ROOT):
    value = str(path)
    if value not in sys.path:
        sys.path.insert(0, value)

from services.api.main import app  # noqa: E402
