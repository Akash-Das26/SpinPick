#!/usr/bin/env python3
"""Pre-commit guard for repo docs integrity.

Runs on every commit (always_run in .pre-commit-config.yaml) and verifies:

1. GITHUB_PUSH_GUIDE.md — every fenced code block is balanced (an even number
   of fence-opening lines), so future docs edits can't silently break the guide.
2. docker-compose.yml — still parses as valid YAML, so the one-command proxy
   deploy keeps working.

PyYAML is provided by pre-commit itself via additional_dependencies in
.pre-commit-config.yaml (isolated hook venv), so this works even on machines
without a system PyYAML. It can also be run standalone:

    python3 scripts/validate_docs.py
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - pre-commit always provisions PyYAML
    print(
        "ERROR: PyYAML is not importable. Run through pre-commit "
        "(`pre-commit run validate-docs`) or `pip install PyYAML`.",
        file=sys.stderr,
    )
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
GUIDE = ROOT / "GITHUB_PUSH_GUIDE.md"
COMPOSE = ROOT / "docker-compose.yml"
# Both the ``` and ~~~ fence styles are valid CommonMark; guard both.
FENCE_MARKERS = ("```", "~~~")


def check_fences(path: Path) -> bool:
    """Every fenced code block must be closed -> fence lines must pair up."""
    fence_lines = [
        (idx, line)
        for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1)
        if line.lstrip().startswith(FENCE_MARKERS)
    ]
    if len(fence_lines) % 2 == 0:
        print(f"  ✓ {path.name}: {len(fence_lines)} fence line(s), balanced")
        return True
    line_nums = ", ".join(str(idx) for idx, _ in fence_lines)
    print(
        f"  ✗ {path.name}: UNBALANCED code fences — found {len(fence_lines)} "
        f"fence line(s) (odd count) on lines: {line_nums}. "
        "Every ``` opening fence needs a closing ```.",
        file=sys.stderr,
    )
    return False


def check_yaml(path: Path) -> bool:
    """docker-compose.yml must parse cleanly under safe_load."""
    try:
        yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"  ✗ {path.name}: invalid YAML — {exc}", file=sys.stderr)
        return False
    print(f"  ✓ {path.name}: valid YAML")
    return True


def main() -> int:
    ok = True
    for path, checker in ((GUIDE, check_fences), (COMPOSE, check_yaml)):
        if not path.exists():
            print(f"  ⚠ {path.name} not found — skipped", file=sys.stderr)
            continue
        ok = checker(path) and ok
    if not ok:
        print("\nDocs integrity check FAILED — fix the issues above before committing.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
