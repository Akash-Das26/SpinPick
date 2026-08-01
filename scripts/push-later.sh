#!/usr/bin/env bash
# SpinPick — push-to-GitHub helper (run from anywhere in the repo).
# Usage:  ./scripts/push-later.sh https://github.com/<USER>/spinpick.git
# Prepares + pushes the already-committed work, then prints the post-push checklist.
set -euo pipefail

cd "$(dirname "$0")/.."

REPO_URL="${1:-}"
if [ -z "$REPO_URL" ] || [[ "$REPO_URL" == *YOUR_USERNAME* ]]; then
  echo "❌ Pass your real repo URL, e.g.:"
  echo "   ./scripts/push-later.sh https://github.com/<USER>/spinpick.git"
  exit 1
fi

echo "=== 1) Branch must be 'main' (ci.yml, security.yml, dependabot all assume it) ==="
BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo "ℹ️  Renaming branch '$BRANCH' → main (guide: git branch -M main)"
  git branch -M main
fi
[ "$(git branch --show-current)" = "main" ] || { echo "❌ branch is not main"; exit 1; }
echo "✅ branch: $(git branch --show-current)"

echo
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes — these will NOT be pushed:"
  git status --short | head -10
  if [ "${FORCE:-0}" != "1" ]; then
    echo "Commit or stash them first, or re-run with FORCE=1 to push anyway."
    exit 1
  fi
fi

echo
echo "=== 2) Point origin at the real repo ==="
git remote set-url origin "$REPO_URL"
git remote -v

echo
echo "=== 3) Push ==="
echo "→ Pushing $(git rev-list HEAD --count) commits to $REPO_URL ..."
git push -u origin main

cat <<'EOF'

✅ Pushed. Post-push checklist:
 1. Actions tab — both "CI" and "Security (CodeQL)" should start running on main.
 2. Dependabot — Settings → Code security and analysis → Dependabot
    (config is validated on push; PRs open on the weekly schedule).
    Expect update PRs for: vite, lucide-react, playwright, @vitejs/plugin-react.
 3. Branch protection — Settings → Branches → require status checks:
    lint-and-test, secret-scan, validate-seo, e2e (optionally the CodeQL check).
 4. Security tab — secret scanning + code scanning results appear there.
EOF
