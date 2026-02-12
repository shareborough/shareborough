#!/bin/bash
# Launch EC2 instance to run full AYB + Shareborough test suite
# Runs: Go unit/integration tests, Shareborough vitest, Playwright E2E
#
# Usage: ./scripts/launch-ec2-tests.sh [--ayb-dir /path/to/ayb]
#
# Results stream to: s3://ayb-ci-artifacts/e2e-runs/<timestamp>/output.log
# Instance auto-terminates after tests complete or 2 hours

set -euo pipefail

INSTANCE_TYPE="t3.medium"  # 2 vCPU, 4GB RAM
AMI_ID="ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS (us-east-1)
REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
BUCKET="ayb-ci-artifacts"
KEY_NAME="jan2026"

# Default AYB repo location (sibling structure)
AYB_DIR="${AYB_DIR:-/Users/stuart/repos/allyourbase_root/allyourbase_dev}"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --ayb-dir) AYB_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

SHAREBOROUGH_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Shareborough + AYB E2E Test Launcher ==="
echo ""
echo "  AYB source:         ${AYB_DIR}"
echo "  Shareborough source: ${SHAREBOROUGH_DIR}"
echo ""

# Verify AYB dir exists
if [ ! -f "${AYB_DIR}/go.mod" ]; then
  echo "ERROR: AYB source not found at ${AYB_DIR} (no go.mod)"
  echo "Set AYB_DIR env var or use --ayb-dir flag"
  exit 1
fi

# [1/5] Create AYB source tarball
echo "[1/5] Creating AYB source tarball..."
tar -czf /tmp/ayb-source.tar.gz \
  -C "${AYB_DIR}" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='ui/dist' \
  --exclude='ui/node_modules' \
  --exclude='ayb_data' \
  --exclude='ayb_storage' \
  --exclude='examples' \
  --exclude='docs-site' \
  --exclude='*.tar.gz' \
  .
echo "   AYB tarball: $(du -h /tmp/ayb-source.tar.gz | cut -f1)"

# [2/5] Create Shareborough source tarball
echo "[2/5] Creating Shareborough source tarball..."
tar -czf /tmp/shareborough-source.tar.gz \
  -C "${SHAREBOROUGH_DIR}" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.secret' \
  --exclude='*.tar.gz' \
  .
echo "   Shareborough tarball: $(du -h /tmp/shareborough-source.tar.gz | cut -f1)"

# [3/5] Upload to S3
echo "[3/5] Uploading source to S3..."
aws s3 cp /tmp/ayb-source.tar.gz "s3://${BUCKET}/source.tar.gz" --quiet
aws s3 cp /tmp/shareborough-source.tar.gz "s3://${BUCKET}/shareborough-source.tar.gz" --quiet
echo "   Uploaded both tarballs"

# [4/5] Launch instance
echo "[4/5] Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region "${REGION}" \
  --image-id "${AMI_ID}" \
  --instance-type "${INSTANCE_TYPE}" \
  --key-name "${KEY_NAME}" \
  --security-group-ids sg-089784677dc281760 \
  --user-data file://scripts/run-integration-tests-ec2.sh \
  --iam-instance-profile Name=EC2-S3-Access \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=shareborough-e2e-${INSTANCE_TYPE}},{Key=Purpose,Value=e2e-tests},{Key=AutoShutdown,Value=true}]" \
  --instance-initiated-shutdown-behavior terminate \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "   Instance: ${INSTANCE_ID}"

# [5/5] Wait for public IP
echo "[5/5] Waiting for public IP..."
sleep 5
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "${INSTANCE_ID}" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null || echo "pending")

echo ""
echo "=========================================="
echo "  Shareborough E2E Test Run Launched"
echo "=========================================="
echo ""
echo "  Instance:    ${INSTANCE_ID}"
echo "  Type:        ${INSTANCE_TYPE}"
echo "  Public IP:   ${PUBLIC_IP}"
echo "  Region:      ${REGION}"
echo ""
echo "  S3 Results:  s3://${BUCKET}/e2e-runs/"
echo "  Auto-shutdown: 2 hours or on completion"
echo "  Shutdown behavior: terminate (will be deleted)"
echo ""
echo "--- Monitor ---"
echo ""
echo "  # Watch live output (updates every 30s):"
echo "  aws s3 cp s3://${BUCKET}/e2e-runs/\$(aws s3 ls s3://${BUCKET}/e2e-runs/ | tail -1 | awk '{print \$2}')output.log -"
echo ""
echo "  # Or use the monitor script:"
echo "  ./scripts/monitor-ec2-tests.sh ${INSTANCE_ID}"
echo ""
echo "  # SSH in (if needed):"
echo "  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "  # Manual terminate:"
echo "  aws ec2 terminate-instances --instance-ids ${INSTANCE_ID}"
echo ""
