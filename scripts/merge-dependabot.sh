#!/bin/bash
# ==========================================================================
# Dependabot PR Auto-Merger
# ==========================================================================
# Dynamically discovers and merges safe Dependabot PRs (patch/minor only).
# Skips major version bumps and PRs with failing CI.
#
# Requirements:
#   - gh CLI installed and authenticated (gh auth login)
#   - Python 3 (for JSON processing)
#
# Usage:
#   bash scripts/merge-dependabot.sh              # merge safe PRs
#   bash scripts/merge-dependabot.sh --dry-run    # preview only
#   bash scripts/merge-dependabot.sh --close-conflicts  # close conflicting PRs
#
# Version: 2.0
# ==========================================================================

set -euo pipefail

# Ensure gh CLI is in PATH
export PATH="$HOME/.local/bin:$PATH"

REPO="Akash-Das26/SpinPick"

# Verify gh CLI is available and authenticated
if ! command -v gh &>/dev/null; then
  echo "❌ gh CLI not found. Install it: https://cli.github.com/"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "❌ Not authenticated. Run: gh auth login"
  exit 1
fi

# Forward args to Python script
python3 - "$REPO" "$@" << 'PYTHON_SCRIPT'
import json
import subprocess
import sys
import re
import time

def run(cmd, check=True):
    """Run a shell command and return output."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        return None
    return result.stdout.strip()

def main():
    repo = sys.argv[1]
    args = sys.argv[2:]
    dry_run = "--dry-run" in args
    close_conflicts = "--close-conflicts" in args

    # Colors
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    NC = "\033[0m"

    print()
    print("═══════════════════════════════════════════════════════════")
    print("  Dependabot PR Auto-Merger v2.0")
    print("═══════════════════════════════════════════════════════════")
    print()

    if dry_run:
        print(f"{YELLOW}⚠️  DRY RUN MODE — no changes will be made{NC}")
        print()

    # Fetch open Dependabot PRs
    print(f"{BLUE}ℹ{NC}  Fetching open Dependabot PRs...")
    prs_json = run(f'gh pr list --repo {repo} --state open --author app/dependabot --json number,title,mergeable,mergeStateStatus,headRefName')
    
    if not prs_json:
        print(f"{BLUE}ℹ{NC}  No open Dependabot PRs found.")
        return

    prs = json.loads(prs_json)
    print(f"{BLUE}ℹ{NC}  Found {len(prs)} open Dependabot PRs")
    print()

    # Major version patterns to skip
    SKIP_PATTERNS = [
        r'from \d+ to \d+',           # actions/checkout 4 → 7
        r'react-router.*\d+ to \d+',  # react-router 7 → 8
        r'codeql-action.*\d+ to \d+', # codeql-action 3 → 4
    ]

    skip_packages = ['react-router', 'codeql-action', 'checkout', 'setup-node']

    merged = 0
    skipped = 0
    failed = 0
    closed = 0

    for pr in prs:
        num = pr['number']
        title = pr['title']
        mergeable = pr.get('mergeable', 'UNKNOWN')
        state = pr.get('mergeStateStatus', 'UNKNOWN')
        branch = pr.get('headRefName', '')

        print("─────────────────────────────────────────────────────────")
        print(f"PR #{num}: {title}")
        print(f"  Mergeable: {mergeable} | CI: {state}")

        # Check if major version bump
        is_major = any(re.search(p, title, re.IGNORECASE) for p in SKIP_PATTERNS)
        if not is_major:
            is_major = any(pkg in branch.lower() for pkg in skip_packages)

        if is_major:
            print(f"  {YELLOW}⏭️  Skipping — major version bump (requires manual review){NC}")
            skipped += 1
            continue

        if mergeable == "CONFLICTING":
            if close_conflicts:
                if dry_run:
                    print(f"  {YELLOW}[dry-run] Would close PR #{num} (merge conflicts){NC}")
                else:
                    print(f"  {YELLOW}⚠️  Closing PR #{num} (merge conflicts — Dependabot will recreate){NC}")
                    run(f'gh pr close {num} --repo {repo} --comment "Closing due to merge conflicts. Dependabot will recreate a fresh PR."', check=False)
                    closed += 1
            else:
                print(f"  {YELLOW}⏭️  Skipping — has merge conflicts (use --close-conflicts to close){NC}")
                skipped += 1
            continue

        if state in ("BLOCKED", "BEHIND"):
            print(f"  {YELLOW}⏭️  Skipping — CI status: {state}{NC}")
            skipped += 1
            continue

        if mergeable == "MERGEABLE":
            if dry_run:
                print(f"  {BLUE}[dry-run] Would merge PR #{num}{NC}")
                merged += 1
            else:
                print(f"  {BLUE}ℹ{NC}  Merging PR #{num}...")
                result = run(f'gh pr merge {num} --repo {repo} --merge --admin', check=False)
                if result is not None:
                    print(f"  {GREEN}✅ PR #{num} merged successfully{NC}")
                    merged += 1
                else:
                    print(f"  {RED}❌ PR #{num} failed to merge{NC}")
                    failed += 1
        else:
            print(f"  {YELLOW}⏭️  Skipping — status: {mergeable}/{state}{NC}")
            skipped += 1

        # Rate limit protection
        time.sleep(2)

    # Summary
    print()
    print("═══════════════════════════════════════════════════════════")
    print("  Summary")
    print("═══════════════════════════════════════════════════════════")
    print()
    print(f"  {GREEN}Merged:    {merged}{NC}")
    print(f"  {YELLOW}Skipped:   {skipped} (major bumps, conflicts, or CI issues){NC}")
    print(f"  {RED}Failed:    {failed}{NC}")
    print(f"  {YELLOW}Closed:    {closed} (conflicting PRs){NC}")
    print()
    print("═══════════════════════════════════════════════════════════")

if __name__ == "__main__":
    main()
PYTHON_SCRIPT
