#!/bin/bash
# sync-shareborough.sh — Copy files from dev repo to public repo.
# Does NOT commit or push. See sync-and-deploy.sh for the full workflow.
set -euo pipefail

DEV_REPO="/Users/stuart/repos/shareborough_root/shareborough_dev"
PUB_REPO="/Users/stuart/repos/shareborough_root/shareborough"

echo "=== Syncing shareborough dev -> public ==="
echo "From: $DEV_REPO"
echo "To:   $PUB_REPO"
echo ""

# Source code
rsync -av --delete \
  "$DEV_REPO/src/" "$PUB_REPO/src/"

# Unit tests (exclude helpers/ — mailpail helper needs AWS credentials)
rsync -av --delete \
  --exclude='helpers/' \
  "$DEV_REPO/tests/" "$PUB_REPO/tests/"

# E2E tests (exclude AWS upload script)
rsync -av --delete \
  --exclude='run-and-upload.sh' \
  "$DEV_REPO/e2e/" "$PUB_REPO/e2e/"

# Public assets
rsync -av --delete \
  "$DEV_REPO/public/" "$PUB_REPO/public/"

# Worker
rsync -av --delete \
  "$DEV_REPO/worker/" "$PUB_REPO/worker/"

# Seed script (needed for CI/CD auto-seeding)
mkdir -p "$PUB_REPO/scripts"
cp "$DEV_REPO/scripts/seed.ts" "$PUB_REPO/scripts/seed.ts"

# Root config files (copy individually)
for file in index.html package.json package-lock.json .npmrc vite.config.ts tsconfig.json \
            postcss.config.js tailwind.config.js playwright.config.ts \
            playwright.config.prod.ts playwright.config.staging.ts \
            schema.sql .env.production README.md; do
  if [ -f "$DEV_REPO/$file" ]; then
    cp "$DEV_REPO/$file" "$PUB_REPO/$file"
  fi
done

echo ""
echo "=== Sync complete ==="
echo ""
echo "Next steps:"
echo "  cd $PUB_REPO"
echo "  git diff              # review what changed"
echo "  git add -A && git commit -m 'your message'"
echo "  git push"
