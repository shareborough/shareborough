#!/bin/bash
# deploy-staging.sh — Sync files to public repo and deploy to staging.
# Usage: ./scripts/deploy-staging.sh ["commit message"]
# Pushes to the 'staging' branch which triggers a staging deployment.
# Does NOT affect the main branch or production.
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEV_REPO="/Users/stuart/repos/shareborough_root/shareborough_dev"
PUB_REPO="/Users/stuart/repos/shareborough_root/shareborough"
GH_REPO="shareborough/shareborough"

COMMIT_MESSAGE="${1:-Staging deploy from dev repo}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Shareborough Deploy to Staging${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify repos exist
if [ ! -d "$DEV_REPO" ]; then
  echo -e "${RED}Error: Dev repo not found at $DEV_REPO${NC}"
  exit 1
fi

if [ ! -d "$PUB_REPO" ]; then
  echo -e "${RED}Error: Public repo not found at $PUB_REPO${NC}"
  exit 1
fi

# ── Step 1: Sync ──────────────────────────────────────────────────────────────
echo -e "${BLUE}Step 1: Running sync script...${NC}"
bash "$DEV_REPO/scripts/sync-shareborough.sh"
echo ""

# ── Step 2: Switch to staging branch ─────────────────────────────────────────
echo -e "${BLUE}Step 2: Switching to staging branch...${NC}"
cd "$PUB_REPO"

# Create or switch to staging branch (based off current main)
git fetch origin main 2>/dev/null || true
if git show-ref --verify --quiet refs/heads/staging; then
  git checkout staging
  git reset --hard origin/main 2>/dev/null || git reset --hard main
else
  git checkout -b staging
fi

# Re-sync after branch switch (reset may have wiped changes)
bash "$DEV_REPO/scripts/sync-shareborough.sh" > /dev/null 2>&1

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo -e "${YELLOW}No changes detected vs main. Nothing to deploy.${NC}"
  git checkout main
  exit 0
fi

echo -e "${GREEN}Changes detected for staging${NC}"
echo ""

# ── Step 3: Quick tests ──────────────────────────────────────────────────────
echo -e "${BLUE}Step 3: Running quick tests in dev repo...${NC}"
cd "$DEV_REPO"
if ! npx vitest run 2>&1; then
  echo -e "${RED}Unit tests failed! Aborting staging deploy.${NC}"
  cd "$PUB_REPO" && git checkout main
  exit 1
fi
echo -e "${GREEN}Tests passed${NC}"
echo ""

# ── Step 4: Commit & Push staging ────────────────────────────────────────────
echo -e "${BLUE}Step 4: Committing and pushing to staging...${NC}"
cd "$PUB_REPO"
git add -A
git commit -m "$COMMIT_MESSAGE"
git push origin staging --force

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Staging branch pushed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Switch back to main
git checkout main

echo -e "${BLUE}Staging deploy triggered. Monitor:${NC}"
echo ""
echo "  gh run watch --repo $GH_REPO                    # live CI updates"
echo "  gh run list --repo $GH_REPO --limit 5           # recent runs"
echo ""
echo -e "${YELLOW}Staging URL will be available at your Cloudflare Pages preview URL${NC}"
echo -e "${YELLOW}or at staging.shareborough.com if configured.${NC}"
echo ""
