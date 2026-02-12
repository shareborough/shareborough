#!/bin/bash
# sync-and-deploy.sh — Full workflow: sync → test → staging → E2E → production.
#
# Usage:
#   ./scripts/sync-and-deploy.sh ["commit message"]              # full pipeline (staging → e2e → prod)
#   ./scripts/sync-and-deploy.sh ["commit message"] --prod-only  # skip staging e2e, deploy directly to prod
#   ./scripts/sync-and-deploy.sh ["commit message"] --staging-only # deploy to staging only, no prod
#
# Pipeline:
#   1. Sync dev → public repo
#   2. Run vitest locally (abort on failure)
#   3. Build check
#   4. Push to staging branch → Cloudflare deploys staging
#   5. Wait for staging CI/CD
#   6. Launch EC2 for Playwright E2E against live staging
#   7. Poll S3 for E2E results
#   8. If pass → push to main → Cloudflare deploys production → seed
#   9. If fail → stop, show errors, link to S3 report
#
# Aborts if any step fails. Run it and walk away.
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DEV_REPO="/Users/stuart/repos/shareborough_root/shareborough_dev"
PUB_REPO="/Users/stuart/repos/shareborough_root/shareborough"
GH_REPO="shareborough/shareborough"
BUCKET="ayb-ci-artifacts"
KEY_NAME="jan2026"
INSTANCE_TYPE="t3.medium"
AMI_ID="ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS (us-east-1)
REGION="us-east-1"
STAGING_URL="https://staging.shareborough.pages.dev"

# Parse args
COMMIT_MESSAGE="Sync from dev repo"
MODE="full"  # full | prod-only | staging-only
for arg in "$@"; do
  case "$arg" in
    --prod-only)   MODE="prod-only" ;;
    --staging-only) MODE="staging-only" ;;
    --*) echo -e "${RED}Unknown flag: $arg${NC}"; exit 1 ;;
    *) COMMIT_MESSAGE="$arg" ;;
  esac
done

header() { echo -e "\n${BLUE}${BOLD}── $1 ──${NC}\n"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()   { echo -e "${RED}✗ $1${NC}"; }

echo -e "${BLUE}${BOLD}========================================${NC}"
echo -e "${BLUE}${BOLD}  Shareborough Deploy Pipeline${NC}"
echo -e "${BLUE}${BOLD}  Mode: ${MODE}${NC}"
echo -e "${BLUE}${BOLD}========================================${NC}"

# Verify repos exist
if [ ! -d "$DEV_REPO" ]; then fail "Dev repo not found at $DEV_REPO"; exit 1; fi
if [ ! -d "$PUB_REPO" ]; then fail "Public repo not found at $PUB_REPO"; exit 1; fi

# ── Step 1: Sync ────────────────────────────────────────────────────────────────
header "Step 1/9: Syncing dev → public"
bash "$DEV_REPO/scripts/sync-shareborough.sh"

cd "$PUB_REPO"
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  warn "No changes detected. Public repo is already up to date."
  exit 0
fi
ok "Changes detected"
echo ""
git status --short
echo ""

# ── Step 2: Local tests ────────────────────────────────────────────────────────
header "Step 2/9: Running vitest (local)"
cd "$DEV_REPO"
if ! npx vitest run 2>&1; then
  fail "Unit tests failed! Aborting deploy."
  exit 1
fi
ok "Unit tests passed"

# ── Step 3: Build check ────────────────────────────────────────────────────────
header "Step 3/9: Build check"
cd "$PUB_REPO"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm ci
fi
if ! npm run build 2>&1; then
  fail "Build failed! Aborting deploy."
  exit 1
fi
ok "Build passed"

# ── Step 4: Commit to staging branch ────────────────────────────────────────────
header "Step 4/9: Committing to staging branch"
cd "$PUB_REPO"

# Ensure staging branch exists (create from main if not)
if ! git show-ref --verify --quiet refs/heads/staging; then
  echo "Creating staging branch from main..."
  git checkout -b staging main
else
  git checkout staging
  # Reset staging to match main before applying changes
  git reset --hard main
fi

git add -A
git commit -m "[staging] $COMMIT_MESSAGE"
ok "Committed to staging branch"

# ── Step 5: Push staging → trigger Cloudflare deploy ────────────────────────────
header "Step 5/9: Pushing staging branch"
git push origin staging --force
ok "Pushed staging branch"

echo ""
echo -e "${CYAN}Staging will deploy to: ${STAGING_URL}${NC}"

# Wait for staging CI/CD
echo ""
echo "Waiting for staging CI/CD..."
sleep 5  # Give GitHub a moment to register the push

if gh run watch --repo "$GH_REPO" --exit-status 2>&1; then
  ok "Staging CI/CD succeeded"
else
  fail "Staging CI/CD failed!"
  echo ""
  echo "Debug:"
  echo "  gh run list --repo $GH_REPO --limit 5"
  echo "  gh run view --repo $GH_REPO --log-failed"
  exit 1
fi

if [ "$MODE" = "staging-only" ]; then
  echo ""
  echo -e "${GREEN}${BOLD}========================================${NC}"
  echo -e "${GREEN}${BOLD}  Staging deploy complete!${NC}"
  echo -e "${GREEN}${BOLD}  URL: ${STAGING_URL}${NC}"
  echo -e "${GREEN}${BOLD}========================================${NC}"
  # Switch back to main
  cd "$PUB_REPO" && git checkout main
  exit 0
fi

# ── Step 6: Launch EC2 for staging E2E ──────────────────────────────────────────
if [ "$MODE" = "prod-only" ]; then
  echo ""
  warn "Skipping staging E2E (--prod-only mode)"
else
  header "Step 6/9: Launching EC2 for staging E2E tests"

  # Create Shareborough source tarball
  echo "Creating source tarball..."
  tar -czf /tmp/shareborough-source.tar.gz \
    -C "${DEV_REPO}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.secret' \
    --exclude='*.tar.gz' \
    .

  # Upload to S3
  echo "Uploading to S3..."
  aws s3 cp /tmp/shareborough-source.tar.gz "s3://${BUCKET}/shareborough-source.tar.gz" --quiet

  # Launch EC2 instance
  echo "Launching EC2 instance..."
  INSTANCE_ID=$(aws ec2 run-instances \
    --region "${REGION}" \
    --image-id "${AMI_ID}" \
    --instance-type "${INSTANCE_TYPE}" \
    --key-name "${KEY_NAME}" \
    --security-group-ids sg-089784677dc281760 \
    --user-data file://${DEV_REPO}/scripts/run-staging-e2e-ec2.sh \
    --iam-instance-profile Name=EC2-S3-Access \
    --associate-public-ip-address \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=staging-e2e-${INSTANCE_TYPE}},{Key=Purpose,Value=staging-e2e},{Key=AutoShutdown,Value=true}]" \
    --instance-initiated-shutdown-behavior terminate \
    --query 'Instances[0].InstanceId' \
    --output text)

  ok "EC2 instance launched: ${INSTANCE_ID}"
  echo ""
  echo -e "${CYAN}E2E tests running against: ${STAGING_URL}${NC}"
  echo -e "${CYAN}Results will be at: s3://${BUCKET}/staging-e2e/*/summary.json${NC}"

  # ── Step 7: Poll S3 for E2E results ────────────────────────────────────────────
  header "Step 7/9: Waiting for E2E results (polling S3 every 30s)..."

  MAX_WAIT=3600  # 1 hour max
  ELAPSED=0
  POLL_INTERVAL=30
  SUMMARY_PATH=""

  while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
    MINS=$((ELAPSED / 60))
    SECS=$((ELAPSED % 60))

    # Find the latest staging-e2e summary
    LATEST=$(aws s3 ls "s3://${BUCKET}/staging-e2e/" 2>/dev/null | sort | tail -1 | awk '{print $2}' || echo "")
    if [ -n "$LATEST" ]; then
      if aws s3 cp "s3://${BUCKET}/staging-e2e/${LATEST}summary.json" /tmp/staging-summary.json --quiet 2>/dev/null; then
        SUMMARY_PATH="s3://${BUCKET}/staging-e2e/${LATEST}"
        echo -e "${GREEN}Results found at ${SUMMARY_PATH} (${MINS}m${SECS}s)${NC}"
        break
      fi
    fi

    echo -e "  ${YELLOW}Still waiting... (${MINS}m${SECS}s elapsed)${NC}"

    # Check if instance is still running
    STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
      --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "unknown")
    if [ "$STATE" = "terminated" ] || [ "$STATE" = "shutting-down" ]; then
      echo "Instance $STATE — checking for results..."
      sleep 10
      LATEST=$(aws s3 ls "s3://${BUCKET}/staging-e2e/" 2>/dev/null | sort | tail -1 | awk '{print $2}' || echo "")
      if [ -n "$LATEST" ]; then
        aws s3 cp "s3://${BUCKET}/staging-e2e/${LATEST}summary.json" /tmp/staging-summary.json --quiet 2>/dev/null || true
        SUMMARY_PATH="s3://${BUCKET}/staging-e2e/${LATEST}"
      fi
      break
    fi
  done

  if [ ! -f /tmp/staging-summary.json ]; then
    fail "E2E results not found after ${MAX_WAIT}s"
    echo ""
    echo "Debug:"
    echo "  aws s3 ls s3://${BUCKET}/staging-e2e/ --recursive"
    echo "  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@<ip>"
    exit 1
  fi

  # Check results
  ALL_PASSED=$(python3 -c "import json; d=json.load(open('/tmp/staging-summary.json')); print(str(d.get('allPassed', False)).lower())")
  E2E_RESULT=$(python3 -c "import json; d=json.load(open('/tmp/staging-summary.json')); print(str(d['results']['playwrightE2E']).lower())")

  echo ""
  echo -e "  Playwright E2E: $([ "$E2E_RESULT" = "true" ] && echo "${GREEN}PASSED${NC}" || echo "${RED}FAILED${NC}")"
  echo -e "  S3 Output:      ${SUMMARY_PATH}output.log"
  echo -e "  Playwright:     ${SUMMARY_PATH}playwright-report/"
  echo ""

  if [ "$ALL_PASSED" != "true" ]; then
    fail "Staging E2E tests failed! NOT promoting to production."
    echo ""
    echo -e "${RED}${BOLD}========================================${NC}"
    echo -e "${RED}${BOLD}  DEPLOY BLOCKED — E2E failures${NC}"
    echo -e "${RED}${BOLD}========================================${NC}"
    echo ""
    echo "View full output:"
    echo "  aws s3 cp ${SUMMARY_PATH}output.log -"
    echo ""
    echo "View Playwright HTML report:"
    echo "  aws s3 sync ${SUMMARY_PATH}playwright-report/ /tmp/playwright-report/"
    echo "  open /tmp/playwright-report/index.html"
    echo ""
    echo "View screenshots/traces:"
    echo "  aws s3 ls ${SUMMARY_PATH}test-results/ --recursive"
    echo ""
    echo "Staging is still live at: ${STAGING_URL}"
    echo "Fix the failures and re-run this script."
    # Switch back to main
    cd "$PUB_REPO" && git checkout main
    exit 1
  fi

  ok "All staging E2E tests passed!"
fi

# ── Step 8: Promote to production ────────────────────────────────────────────────
header "Step 8/9: Promoting to production (staging → main)"
cd "$PUB_REPO"

git checkout main
git merge staging -m "Promote staging to production: $COMMIT_MESSAGE"
git push origin main
ok "Pushed to main — production deploy triggered"

# Wait for production CI/CD
echo ""
echo "Waiting for production CI/CD..."
sleep 5

if gh run watch --repo "$GH_REPO" --exit-status 2>&1; then
  ok "Production CI/CD succeeded"
else
  fail "Production CI/CD failed!"
  echo ""
  echo "Debug:"
  echo "  gh run list --repo $GH_REPO --limit 5"
  echo "  gh run view --repo $GH_REPO --log-failed"
  exit 1
fi

# ── Step 9: Seed production ──────────────────────────────────────────────────────
header "Step 9/9: Seeding production data"
cd "$DEV_REPO"
if VITE_AYB_URL="https://api.shareborough.com" npx tsx scripts/seed.ts 2>&1; then
  ok "Production seed complete"
else
  warn "Seed failed (non-fatal — backend may not be ready yet)"
  echo "Run manually: VITE_AYB_URL=https://api.shareborough.com npx tsx scripts/seed.ts"
fi

echo ""
echo -e "${GREEN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}  Production deploy complete!${NC}"
echo -e "${GREEN}${BOLD}  https://shareborough.com${NC}"
echo -e "${GREEN}${BOLD}========================================${NC}"
echo ""
echo "Monitor:"
echo "  gh run list --repo $GH_REPO --limit 5"
if [ -n "${SUMMARY_PATH:-}" ]; then
  echo "  E2E report: ${SUMMARY_PATH}playwright-report/"
fi
echo ""
