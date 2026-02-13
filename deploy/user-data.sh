#!/bin/bash
set -euo pipefail

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Shareborough bootstrap started at $(date) ==="

# Install Docker
dnf install -y docker git
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install Caddy
dnf install -y 'dnf-command(copr)'
dnf copr enable -y @caddy/caddy
dnf install -y caddy
systemctl enable caddy

# Create app directory
mkdir -p /opt/shareborough
cd /opt/shareborough

# Write .env
cat > .env <<'ENVEOF'
POSTGRES_PASSWORD=q2CZnWB7P2bODP4acJ8vFFQ2IYx8SAC
JWT_SECRET=lRhMTP5cwXka9ojzS9YJlvVJPVySSCK6yYIK72QiR1GNCxW2TjFzKPn4J1VtJ
ADMIN_PASSWORD=5uFBYz1Wo4Xqc8O7Nlg
ENVEOF
chmod 600 .env

# Write docker-compose.yml (simplified — build from local binary instead of full repo clone)
cat > docker-compose.yml <<'DCEOF'
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ayb
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ayb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ayb"]
      interval: 5s
      timeout: 3s
      retries: 5

  ayb:
    image: golang:1.24-alpine
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    working_dir: /app
    command: ["/app/ayb", "start"]
    environment:
      AYB_DATABASE_URL: postgresql://ayb:${POSTGRES_PASSWORD}@postgres:5432/ayb?sslmode=disable
      AYB_SERVER_HOST: "0.0.0.0"
      AYB_SERVER_PORT: "8090"
      AYB_SERVER_CORS_ALLOWED_ORIGINS: "https://shareborough.com,https://www.shareborough.com"
      AYB_AUTH_ENABLED: "true"
      AYB_AUTH_JWT_SECRET: ${JWT_SECRET}
      AYB_ADMIN_ENABLED: "true"
      AYB_ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      AYB_STORAGE_ENABLED: "true"
      AYB_STORAGE_BACKEND: "local"
      AYB_STORAGE_LOCAL_PATH: "/data/storage"
      AYB_LOGGING_LEVEL: "info"
      AYB_LOGGING_FORMAT: "json"
    ports:
      - "127.0.0.1:8090:8090"
    volumes:
      - ./ayb:/app/ayb:ro
      - ./ui-dist:/app/ui/dist:ro
      - ayb_storage:/data/storage

volumes:
  pgdata:
  ayb_storage:
DCEOF

# Clone repo and build AYB binary
cd /tmp
git clone https://github.com/allyourbase/ayb.git ayb-src
cd ayb-src

# Install Go build dependencies
export PATH="/usr/local/go/bin:$PATH"
if ! command -v go &>/dev/null; then
  curl -fsSL "https://go.dev/dl/go1.24.0.linux-amd64.tar.gz" -o /tmp/go.tar.gz
  tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz
fi

# Build binary
CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o /opt/shareborough/ayb ./cmd/ayb

# Copy admin UI dist
cp -r ui/dist /opt/shareborough/ui-dist

cd /opt/shareborough
rm -rf /tmp/ayb-src

# Write Caddyfile
cat > /etc/caddy/Caddyfile <<'CADDYEOF'
api.shareborough.com {
	reverse_proxy localhost:8090
}
CADDYEOF

# Start services
docker compose up -d

# Wait for postgres to be ready
echo "Waiting for AYB to start..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8090/health > /dev/null 2>&1; then
    echo "AYB is healthy!"
    break
  fi
  sleep 2
done

# Start Caddy (will auto-provision TLS)
systemctl restart caddy

# Daily backup cron
cat > /etc/cron.d/ayb-backup <<'CRONEOF'
0 3 * * * root docker compose -f /opt/shareborough/docker-compose.yml exec -T postgres pg_dump -U ayb ayb | gzip > /opt/shareborough/backups/ayb-$(date +\%Y\%m\%d).sql.gz && find /opt/shareborough/backups -name "*.sql.gz" -mtime +7 -delete
CRONEOF
mkdir -p /opt/shareborough/backups

echo "=== Shareborough bootstrap completed at $(date) ==="
