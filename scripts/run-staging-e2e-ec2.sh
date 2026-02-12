#!/bin/bash
# EC2 user-data script: Playwright E2E tests against live staging URL
# Lightweight — no AYB build, no Go tests. Just Playwright against a live URL.
# Auto-shuts down after completion or 1 hour.
# Streams progress to S3 so results survive crashes.

set -euo pipefail

BUCKET="ayb-ci-artifacts"
RUN_ID=$(date +%Y%m%d-%H%M%S)
S3_PREFIX="s3://${BUCKET}/staging-e2e/${RUN_ID}"
LOG="/tmp/test-output.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
upload_log() { aws s3 cp "$LOG" "${S3_PREFIX}/output.log" --quiet 2>/dev/null || true; }

# Upload log to S3 every 30 seconds in background
( while true; do sleep 30; upload_log; done ) &
LOG_UPLOADER_PID=$!

# Schedule shutdown in 1 hour as failsafe
( sleep 3600 && log "FAILSAFE: 1-hour timeout reached, shutting down" && upload_log && shutdown -h now ) &

# On exit: upload final log and shut down
cleanup() {
    log "=== CLEANUP: uploading final results ==="

    if [ -d "/tmp/shareborough/playwright-report" ]; then
        aws s3 sync /tmp/shareborough/playwright-report/ "${S3_PREFIX}/playwright-report/" --quiet 2>/dev/null || true
        log "Playwright HTML report uploaded to ${S3_PREFIX}/playwright-report/"
    fi

    if [ -d "/tmp/shareborough/test-results" ]; then
        aws s3 sync /tmp/shareborough/test-results/ "${S3_PREFIX}/test-results/" --quiet 2>/dev/null || true
    fi

    upload_log
    kill $LOG_UPLOADER_PID 2>/dev/null || true
    shutdown -h now
}
trap cleanup EXIT

log "=== Staging E2E Test Run: ${RUN_ID} ==="
log "=== S3 results: ${S3_PREFIX}/ ==="

# -------------------------------------------------------
# 1. Install system dependencies
# -------------------------------------------------------
log "--- Installing system dependencies ---"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>&1 | tail -1 | tee -a "$LOG"
apt-get install -y -qq git unzip curl wget \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    xvfb 2>&1 | tail -3 | tee -a "$LOG"

# Install Node.js 20 LTS
log "--- Installing Node.js 20 ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -1 | tee -a "$LOG"
apt-get install -y -qq nodejs 2>&1 | tail -1 | tee -a "$LOG"
log "Node: $(node --version), npm: $(npm --version)"

# Install AWS CLI
log "--- Installing AWS CLI ---"
curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
cd /tmp && unzip -qq awscliv2.zip && ./aws/install 2>&1 | tail -1 | tee -a "$LOG"

upload_log

# -------------------------------------------------------
# 2. Download and extract Shareborough source
# -------------------------------------------------------
log "--- Downloading Shareborough source from S3 ---"
cd /tmp
aws s3 cp s3://${BUCKET}/shareborough-source.tar.gz . 2>&1 | tee -a "$LOG"

mkdir -p /tmp/shareborough && cd /tmp/shareborough
tar -xzf ../shareborough-source.tar.gz
log "Shareborough source extracted"

# -------------------------------------------------------
# 3. Install dependencies + Playwright browsers
# -------------------------------------------------------
log "--- Installing npm dependencies ---"
npm ci 2>&1 | tail -5 | tee -a "$LOG"

log "--- Installing Playwright browsers ---"
npx playwright install chromium 2>&1 | tail -3 | tee -a "$LOG"

upload_log

# -------------------------------------------------------
# 4. Wait for staging URL to be live
# -------------------------------------------------------
STAGING_URL="${STAGING_URL:-https://staging.shareborough.pages.dev}"
log "--- Waiting for staging URL: ${STAGING_URL} ---"

for i in $(seq 1 30); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${STAGING_URL}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "Staging site is live (HTTP ${HTTP_CODE}) after ${i} attempts"
        break
    fi
    if [ $i -eq 30 ]; then
        log "WARNING: Staging site not responding after 30 attempts (HTTP ${HTTP_CODE}). Proceeding anyway."
    fi
    sleep 10
done

# -------------------------------------------------------
# 5. Run Playwright E2E against staging
# -------------------------------------------------------
log ""
log "=========================================="
log "  Staging E2E Tests (Playwright)"
log "  Target: ${STAGING_URL}"
log "=========================================="

export STAGING_URL
export VITE_AYB_URL="${VITE_AYB_URL:-https://api.shareborough.com}"

# Mailpail config for email e2e tests
export MAILPAIL_DOMAIN="test.shareborough.com"
export MAILPAIL_BUCKET="ayb-ci-artifacts"
export MAILPAIL_PREFIX="e2e-emails/"
export MAILPAIL_REGION="us-east-1"

E2E_PASS=true
if xvfb-run npx playwright test --config=playwright.config.staging.ts --reporter=list,html 2>&1 | tee -a "$LOG"; then
    log "STAGING E2E: PASSED"
else
    log "STAGING E2E: FAILED (exit code: $?)"
    E2E_PASS=false
fi
upload_log

# -------------------------------------------------------
# 6. Summary
# -------------------------------------------------------
log ""
log "=========================================="
log "  RESULTS SUMMARY"
log "=========================================="
log "  Staging URL:   ${STAGING_URL}"
log "  E2E Tests:     $([ "$E2E_PASS" = true ] && echo 'PASSED' || echo 'FAILED')"
log ""
log "  S3 results:    ${S3_PREFIX}/output.log"
log "  Playwright:    ${S3_PREFIX}/playwright-report/"
log "=========================================="

# Create summary JSON (used by sync-and-deploy.sh to check results)
cat > /tmp/summary.json <<SUMEOF
{
  "runId": "${RUN_ID}",
  "type": "staging-e2e",
  "stagingUrl": "${STAGING_URL}",
  "nodeVersion": "$(node --version)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "s3Prefix": "${S3_PREFIX}",
  "results": {
    "playwrightE2E": ${E2E_PASS}
  },
  "allPassed": ${E2E_PASS}
}
SUMEOF
aws s3 cp /tmp/summary.json "${S3_PREFIX}/summary.json" --quiet

log "=== Staging E2E complete. Instance will shut down. ==="
