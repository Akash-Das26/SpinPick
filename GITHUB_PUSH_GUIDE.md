# SpinPick — GitHub Push Guide

## Prerequisites

- GitHub account
- Git installed locally
- GitHub CLI (`gh`) installed (optional but recommended)

---

## Quick Push (3 commands)

```bash
cd /home/sage/Desktop/SpinPick

# 1. Create repo on GitHub (via web or CLI)
# Option A: Web UI → github.com/new
# Option B: CLI (requires gh auth login)
gh repo create spinpick --public --source=. --remote=origin --push

# 2. Or manual: create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/spinpick.git
git branch -M main
git push -u origin main
```

---

## Detailed Step-by-Step

### 1. Create GitHub Repository

**Option A: GitHub Web UI**
1. Go to https://github.com/new
2. Repository name: `spinpick`
2. Description: "Physics-driven decision wheel with AI-powered options, tournaments, and permalink sharing"
3. Public or Private (your choice)
4. **Don't** initialize with README, .gitignore, or license (we have them)
4. Click "Create repository"

**Option B: GitHub CLI**
```bash
gh auth login  # if not already authenticated
gh repo create spinpick --public --source=. --remote=origin --push
```

### 2. Push Local Changes

```bash
cd /home/sage/Desktop/SpinPick

# Add remote (if not done via gh CLI)
git remote add origin https://github.com/YOUR_USERNAME/spinpick.git

# Rename branch to main (if not already)
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## Verify Push

```bash
# Check remote
git remote -v

# View on GitHub
open https://github.com/YOUR_USERNAME/spinpick
```

---

## Post-Push Setup (GitHub Repository Settings)

### 1. Branch Protection (Recommended)
Settings → Branches → Add rule for `main`:
- ☑ Require pull request reviews before merging
- ☑ Require status checks to pass before merging
- ☑ Require branches to be up to date before merging
- ☑ Include administrators

### 2. Required Status Checks
Add these checks (matching the job names in `.github/workflows/ci.yml`) so a PR
cannot merge unless every gate passes:
- `lint-and-test`
- `secret-scan`
- `validate-seo`
- `e2e`

### 3. Environments & Secrets (for CI/CD)

**Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `VITE_OPENROUTER_PROXY_URL` | Your deployed proxy URL (e.g., `https://api.spinpick.app`) |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | For source map uploads |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project name |

> ⚠️ **`ALLOWED_ORIGINS` is a *server-side* proxy env var, not a GitHub secret.**
> Set it on the deployed proxy (see [Post-Launch Checklist](#post-launch-checklist) below):
> `ALLOWED_ORIGINS=https://spinpick.app,http://localhost:5173`
> Required for production: without it the browser frontend itself is rejected (403), and
> with it, browsers from other websites are blocked. Note it only filters browser
> `Origin` headers — non-browser clients are throttled by the rate limiter (60 req/min/IP),
> so keep the proxy URL unguessable.

### 4. GitHub Actions (CI/CD)

✅ **Already done — do not overwrite.** The repo ships with a hardened
`.github/workflows/ci.yml` that runs lint, unit tests, production build, SEO
validation, E2E tests, and a gitleaks secret scan on every push/PR. It includes
security defaults this guide's old template lacked:

- `permissions: contents: read` (least-privilege token)
- `concurrency` + `cancel-in-progress` (no wasted runs)
- `timeout-minutes` on every job
- E2E with `BASE_URL` env + Playwright
- **Secret scanning** — a `secret-scan` job runs pinned `gitleaks` over full
  history on every push/PR, and a local pre-commit hook (`.pre-commit-config.yaml`)
  scans staged changes. Both use the same `.gitleaks.toml` allowlist.

Do **not** replace it with a hand-rolled template — that downgrades CI security
and the old template referenced a nonexistent `dist/stats.html` artifact that
fails the workflow.

To extend CI, edit the existing file instead of creating a new one.

CodeQL code scanning runs separately via `.github/workflows/security.yml` — see the
Security scanning checklist below.

---

## Quick Verification After Push

```bash
# 1. Check repo exists
curl -I https://github.com/YOUR_USERNAME/spinpick

# 2. Clone fresh to verify
cd /tmp && git clone https://github.com/YOUR_USERNAME/spinpick.git test-clone
cd test-clone && npm ci && npm run build

# 3. Check GitHub Actions tab
open https://github.com/YOUR_USERNAME/spinpick/actions
```

---

## Post-Launch Checklist

- [ ] Repository pushed to GitHub
- [ ] Branch protection enabled on `main`
- [ ] CI/CD workflow running (check Actions tab)
- [ ] Secrets configured for production
- [ ] `VITE_OPENROUTER_PROXY_URL` set in production env
- [ ] `VITE_SENTRY_DSN` set in production env
- [ ] Proxy deployed with `OPENROUTER_API_KEY`
- [ ] **Proxy `ALLOWED_ORIGINS` set** to your frontend origin(s) — e.g. `ALLOWED_ORIGINS=https://spinpick.app,http://localhost:5173` (blocks cross-site browser abuse; non-browser clients are only rate-limited — keep the URL unguessable)
- [ ] Domain configured (if custom domain)
- [ ] Analytics/Plausible configured

### Security scanning (Settings → Code security and analysis)

- [ ] **Dependabot alerts** enabled — automated alerts when a dependency has a known vulnerability
- [ ] **Dependabot security updates** enabled — auto-PRs that bump vulnerable deps to patched versions
- [ ] **Dependabot version updates** enabled — uses `.github/dependabot.yml` (weekly npm + GitHub Actions updates, auto-enabled on push)
- [ ] **Secret scanning** enabled — detects committed secrets; **push protection** recommended so secrets can't be pushed in the first place
- [ ] **Code scanning (CodeQL)** — fully automated via `.github/workflows/security.yml` (no manual setup); runs on every push/PR plus a weekly schedule and uploads results to the Security tab
- [ ] **Gitleaks secret scan** — repo ships `.gitleaks.toml` + CI `secret-scan` job + pre-commit hook; run `npm run secret:scan` before pushing to confirm zero findings

> 💡 GitHub automatically enables secret scanning and Dependabot alerts on **public** repos — verify the toggles in
> **Settings → Code security and analysis** anyway, especially if you create the repo as **private**.
> Code scanning is fully automated by the committed `security.yml` workflow — nothing to click; results appear in
> **Settings → Code security and analysis → Code scanning** after the first run.

---

## Quick Commands Reference

---

## Quick Commands Reference

```bash
# Full fresh deploy
git push origin main

# Force push (if needed)
git push -u origin main --force

# Delete remote branch
git push origin --delete branch-name

# Update remote URL
git remote set-url origin https://github.com/NEW_USER/spinpick.git

# View remote
git remote -v
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `remote origin already exists` | `git remote remove origin` then re-add |
| `rejected` on push | `git pull --rebase origin main` then push |
| `authentication failed` | `gh auth login` or use PAT in URL |
| `large file rejected` | Use Git LFS or remove from history |

---

## Ready to Ship 🚀

Your SpinPick project is production-ready. Push to GitHub, configure CI/CD, deploy the proxy, and you're live.

```bash
# Final push
cd /home/sage/Desktop/SpinPick
git push -u origin main
```

🎉 **SpinPick is ready for the world!**