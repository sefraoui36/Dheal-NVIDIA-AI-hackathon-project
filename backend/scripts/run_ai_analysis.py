"""
Run Nemotron on the current replay and pretty-print the result.

Reads data/processed/replay_user_001.json (produced by app.services.replay_service)
and sends it to Nemotron via Nebius Token Factory.
"""

import json
import sys
from pathlib import Path

# allow running as: python scripts/run_ai_analysis.py
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.ai.nemotron_client import analyze_replay  # noqa: E402

REPLAY_PATH = ROOT / "data" / "processed" / "replay_user_001.json"


def main():
    if not REPLAY_PATH.exists():
        print(f"Replay file not found: {REPLAY_PATH}")
        print("Run: python -m app.services.replay_service")
        sys.exit(1)

    replay = json.loads(REPLAY_PATH.read_text())
    print("Sending replay to Nemotron...\n")
    result = analyze_replay(replay)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()