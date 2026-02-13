# Multi-stage build for AYB server
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git make nodejs npm

# Install pnpm
RUN npm install -g pnpm

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build admin UI
RUN cd ui && pnpm install --frozen-lockfile && pnpm build

# Build Go binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-s -w" \
    -o /ayb ./cmd/ayb

# Runtime image
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /ayb /usr/local/bin/ayb

EXPOSE 8090

ENTRYPOINT ["ayb"]
CMD ["start"]
