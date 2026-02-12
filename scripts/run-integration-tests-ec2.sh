#!/bin/bash
# EC2 user-data script: full AYB + Shareborough test suite
# Phases: Go unit tests → Go integration tests → Shareborough vitest → Playwright E2E
# Auto-shuts down after completion or 2 hours
# Streams progress to S3 so results survive crashes

set -euo pipefail

BUCKET="ayb-ci-artifacts"
RUN_ID=$(date +%Y%m%d-%H%M%S)
S3_PREFIX="s3://${BUCKET}/e2e-runs/${RUN_ID}"
LOG="/tmp/test-output.log"
AYB_ADMIN_PASSWORD="ec2-test-admin-$(date +%s)"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
upload_log() { aws s3 cp "$LOG" "${S3_PREFIX}/output.log" --quiet 2>/dev/null || true; }

# Upload log to S3 every 30 seconds in background
( while true; do sleep 30; upload_log; done ) &
LOG_UPLOADER_PID=$!

# Schedule shutdown in 2 hours as failsafe
( sleep 7200 && log "FAILSAFE: 2-hour timeout reached, shutting down" && upload_log && shutdown -h now ) &

# On exit: upload final log and shut down
cleanup() {
    log "=== CLEANUP: uploading final results ==="

    # Upload Playwright report if it exists
    if [ -d "/tmp/shareborough/playwright-report" ]; then
        aws s3 sync /tmp/shareborough/playwright-report/ "${S3_PREFIX}/playwright-report/" --quiet 2>/dev/null || true
        log "Playwright HTML report uploaded to ${S3_PREFIX}/playwright-report/"
    fi

    # Upload Playwright screenshots/traces if they exist
    if [ -d "/tmp/shareborough/test-results" ]; then
        aws s3 sync /tmp/shareborough/test-results/ "${S3_PREFIX}/test-results/" --quiet 2>/dev/null || true
    fi

    upload_log
    kill $LOG_UPLOADER_PID 2>/dev/null || true
    shutdown -h now
}
trap cleanup EXIT

log "=== Shareborough + AYB Test Run: ${RUN_ID} ==="
log "=== S3 results: ${S3_PREFIX}/ ==="

# -------------------------------------------------------
# 1. Install system dependencies
# -------------------------------------------------------
log "--- Installing system dependencies ---"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>&1 | tail -1 | tee -a "$LOG"
apt-get install -y -qq docker.io git make unzip curl wget gcc libc6-dev \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    xvfb 2>&1 | tail -3 | tee -a "$LOG"

# Install Go 1.24
log "--- Installing Go 1.24 ---"
wget -q https://go.dev/dl/go1.24.0.linux-amd64.tar.gz -O /tmp/go.tar.gz
tar -C /usr/local -xzf /tmp/go.tar.gz
export PATH=/usr/local/go/bin:$PATH
export GOPATH=/root/go
export GOMODCACHE=/root/go/pkg/mod
export GOCACHE=/root/go/cache
export HOME=/root
export CGO_ENABLED=1
mkdir -p $GOPATH $GOMODCACHE $GOCACHE
log "Go version: $(go version)"

# Install Node.js 20 LTS
log "--- Installing Node.js 20 ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -1 | tee -a "$LOG"
apt-get install -y -qq nodejs 2>&1 | tail -1 | tee -a "$LOG"
log "Node: $(node --version), npm: $(npm --version)"

# Install AWS CLI
log "--- Installing AWS CLI ---"
curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
cd /tmp && unzip -qq awscliv2.zip && ./aws/install 2>&1 | tail -1 | tee -a "$LOG"

# Start Docker
log "--- Starting Docker ---"
systemctl start docker
systemctl enable docker
docker info 2>&1 | grep "Server Version" | tee -a "$LOG"

upload_log

# -------------------------------------------------------
# 2. Download and extract sources
# -------------------------------------------------------
log "--- Downloading sources from S3 ---"
cd /tmp
aws s3 cp s3://${BUCKET}/source.tar.gz . 2>&1 | tee -a "$LOG"
aws s3 cp s3://${BUCKET}/shareborough-source.tar.gz . 2>&1 | tee -a "$LOG"

# Extract AYB
mkdir -p ayb && cd ayb
tar -xzf ../source.tar.gz
log "AYB source extracted"

# Create ui/dist with proper index.html (needed for SPA fallback test)
mkdir -p ui/dist/assets
cat > ui/dist/index.html << 'UIEOF'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>AYB Admin</title></head>
<body><div id="root"></div><script type="module" src="/assets/index.js"></script></body>
</html>
UIEOF
echo "// placeholder" > ui/dist/assets/index.js

# Create .ayb directory (needed for CLI PID tests)
mkdir -p /root/.ayb

# Extract Shareborough
mkdir -p /tmp/shareborough && cd /tmp/shareborough
tar -xzf ../shareborough-source.tar.gz
log "Shareborough source extracted"

upload_log

# -------------------------------------------------------
# 3. PHASE 1: Go Unit Tests (fast sanity check)
# -------------------------------------------------------
log ""
log "=========================================="
log "  PHASE 1: AYB Unit Tests"
log "=========================================="
cd /tmp/ayb
UNIT_PASS=true
if go test -count=1 ./... 2>&1 | tee -a "$LOG"; then
    log "UNIT TESTS: PASSED"
else
    log "UNIT TESTS: FAILED"
    UNIT_PASS=false
fi
upload_log

# -------------------------------------------------------
# 4. PHASE 2: Go Integration Tests (Docker Postgres)
# -------------------------------------------------------
log ""
log "=========================================="
log "  PHASE 2: AYB Integration Tests (Docker PG)"
log "=========================================="

PG_CID=$(docker run -d --rm \
    -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=testdb \
    -p 0:5432 postgres:16-alpine)
PG_PORT=$(docker port $PG_CID 5432/tcp | cut -d: -f2)
log "Postgres container: ${PG_CID:0:12} on port ${PG_PORT}"

log "Waiting for Postgres..."
until docker exec $PG_CID pg_isready -U test -q 2>/dev/null; do sleep 0.2; done
log "Postgres ready"

export TEST_DATABASE_URL="postgresql://test:test@localhost:${PG_PORT}/testdb?sslmode=disable"

INTEG_PASS=true
if go test -tags=integration -count=1 -v ./... 2>&1 | tee -a "$LOG"; then
    log "INTEGRATION TESTS: PASSED"
else
    log "INTEGRATION TESTS: FAILED (exit code: $?)"
    INTEG_PASS=false
fi

docker stop $PG_CID >/dev/null 2>&1 || true
upload_log

# -------------------------------------------------------
# 5. PHASE 3: Build AYB binary + start server
# -------------------------------------------------------
log ""
log "=========================================="
log "  PHASE 3: Build AYB + Start Server"
log "=========================================="
cd /tmp/ayb

log "Building AYB binary..."
go build -o /tmp/ayb-bin ./cmd/ayb 2>&1 | tee -a "$LOG"
log "Binary built: $(ls -la /tmp/ayb-bin | awk '{print $5}') bytes"

# Write config for E2E tests
cat > /tmp/ayb.toml << TOMLEOF
[server]
host = "0.0.0.0"
port = 8090

[database]
# empty = use embedded Postgres

[admin]
enabled = true
password = "${AYB_ADMIN_PASSWORD}"

[auth]
enabled = true
jwt_secret = "ec2-e2e-test-secret-${RUN_ID}-$(openssl rand -hex 16)"

[storage]
enabled = true
backend = "local"
local_path = "/tmp/ayb_storage"

[logging]
level = "info"
format = "text"
TOMLEOF

# Create non-root user for AYB (embedded Postgres initdb refuses to run as root)
log "Creating non-root user for AYB..."
useradd -m -d /home/aybuser aybuser 2>/dev/null || true
mkdir -p /home/aybuser/.ayb /tmp/ayb_storage
chown -R aybuser:aybuser /home/aybuser /tmp/ayb-bin /tmp/ayb.toml /tmp/ayb_storage
chmod 755 /tmp/ayb-bin

# Start AYB in background as non-root user
log "Starting AYB server (embedded Postgres) as aybuser..."
cd /tmp
runuser -u aybuser -- /tmp/ayb-bin start --config /tmp/ayb.toml > /tmp/ayb-server.log 2>&1 &
AYB_PID=$!
log "AYB PID: ${AYB_PID}"

# Wait for AYB to be ready (give extra time for first-run Postgres download)
log "Waiting for AYB to be ready..."
for i in $(seq 1 120); do
    if curl -sf http://localhost:8090/health > /dev/null 2>&1; then
        log "AYB ready after ${i}s"
        break
    fi
    if [ $i -eq 120 ]; then
        log "ERROR: AYB failed to start after 120s"
        cat /tmp/ayb-server.log | tail -50 | tee -a "$LOG"
        exit 1
    fi
    sleep 1
done

# Apply Shareborough schema
log "Applying Shareborough schema..."
ADMIN_TOKEN=$(curl -sf -X POST http://localhost:8090/api/admin/auth \
    -H "Content-Type: application/json" \
    -d "{\"password\": \"${AYB_ADMIN_PASSWORD}\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>&1) || true

if [ -z "$ADMIN_TOKEN" ]; then
    log "ERROR: Failed to get admin token"
    cat /tmp/ayb-server.log | tail -20 | tee -a "$LOG"
    exit 1
fi
log "Admin token obtained"

# Apply schema via SQL endpoint — write JSON body to file to avoid shell escaping issues
python3 -c "
import json
schema = open('/tmp/shareborough/schema.sql').read()
with open('/tmp/schema-payload.json', 'w') as f:
    json.dump({'query': schema}, f)
"

if curl -sf -X POST http://localhost:8090/api/admin/sql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -d @/tmp/schema-payload.json > /tmp/schema-result.json 2>&1; then
    log "Schema applied successfully"
else
    log "WARNING: Schema application returned non-zero (may be OK if tables already exist)"
    cat /tmp/schema-result.json 2>/dev/null | tee -a "$LOG" || true
fi

upload_log

# -------------------------------------------------------
# 5b. Seed demo data (idempotent — creates test user + sample libraries)
# -------------------------------------------------------
log ""
log "--- Seeding demo data ---"
cd /tmp/shareborough
export VITE_AYB_URL="http://localhost:8090"

if npx tsx scripts/seed.ts 2>&1 | tee -a "$LOG"; then
    log "SEED: Complete"
else
    log "SEED: Failed (non-fatal — tests will still run)"
fi
upload_log

# -------------------------------------------------------
# 6. PHASE 4: Shareborough vitest (component tests)
# -------------------------------------------------------
log ""
log "=========================================="
log "  PHASE 4: Shareborough Component Tests (vitest)"
log "=========================================="
cd /tmp/shareborough

log "Installing npm dependencies..."
npm ci 2>&1 | tail -5 | tee -a "$LOG"

VITEST_PASS=true
if npx vitest run 2>&1 | tee -a "$LOG"; then
    log "SHAREBOROUGH VITEST: PASSED"
else
    log "SHAREBOROUGH VITEST: FAILED"
    VITEST_PASS=false
fi
upload_log

# -------------------------------------------------------
# 7. PHASE 5: Playwright E2E Tests
# -------------------------------------------------------
log ""
log "=========================================="
log "  PHASE 5: Playwright E2E Tests"
log "=========================================="
cd /tmp/shareborough

log "Installing Playwright browsers..."
npx playwright install chromium 2>&1 | tail -3 | tee -a "$LOG"

# Set environment for E2E
export AYB_URL="http://localhost:8090"
export AYB_ADMIN_PASSWORD="${AYB_ADMIN_PASSWORD}"
export VITE_AYB_URL="http://localhost:8090"

# Mailpail config for email e2e tests (SES inbound + S3)
export MAILPAIL_DOMAIN="test.shareborough.com"
export MAILPAIL_BUCKET="ayb-ci-artifacts"
export MAILPAIL_PREFIX="e2e-emails/"
export MAILPAIL_REGION="us-east-1"

E2E_PASS=true
if xvfb-run npx playwright test --reporter=list,html 2>&1 | tee -a "$LOG"; then
    log "PLAYWRIGHT E2E: PASSED"
else
    log "PLAYWRIGHT E2E: FAILED (exit code: $?)"
    E2E_PASS=false
fi
upload_log

# -------------------------------------------------------
# 8. Final Summary
# -------------------------------------------------------
log ""
log "=========================================="
log "  RESULTS SUMMARY"
log "=========================================="
log "  Go Unit Tests:      $([ "$UNIT_PASS" = true ] && echo 'PASSED' || echo 'FAILED')"
log "  Go Integration:     $([ "$INTEG_PASS" = true ] && echo 'PASSED' || echo 'FAILED')"
log "  Shareborough vitest: $([ "$VITEST_PASS" = true ] && echo 'PASSED' || echo 'FAILED')"
log "  Playwright E2E:      $([ "$E2E_PASS" = true ] && echo 'PASSED' || echo 'FAILED')"
log ""
log "  S3 results:    ${S3_PREFIX}/output.log"
log "  Playwright:    ${S3_PREFIX}/playwright-report/"
log "=========================================="

# Create summary JSON
cat > /tmp/summary.json <<SUMEOF
{
  "runId": "${RUN_ID}",
  "goVersion": "$(go version)",
  "nodeVersion": "$(node --version)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "s3Prefix": "${S3_PREFIX}",
  "results": {
    "goUnit": ${UNIT_PASS},
    "goIntegration": ${INTEG_PASS},
    "shareboroughVitest": ${VITEST_PASS},
    "playwrightE2E": ${E2E_PASS}
  }
}
SUMEOF
aws s3 cp /tmp/summary.json "${S3_PREFIX}/summary.json" --quiet

# Stop AYB server
kill $AYB_PID 2>/dev/null || true

log "=== Test run complete. Instance will shut down. ==="
