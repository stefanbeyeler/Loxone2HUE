# Home Assistant Add-on Dockerfile for Loxone2HUE Gateway
# Supports multi-architecture builds (aarch64, amd64, armv7)

# Define build arguments at the top level
ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:3.18
ARG REPO_URL=https://github.com/stefanbeyeler/Loxone2HUE.git
ARG REPO_BRANCH=main

#---------------------------------------------
# Build stage for Go backend
FROM golang:1.22-alpine AS go-builder

WORKDIR /build
RUN apk add --no-cache git ca-certificates

# Clone repository and build
ARG REPO_URL
ARG REPO_BRANCH
RUN git clone --depth 1 --branch ${REPO_BRANCH} ${REPO_URL} .

# Build with optimizations
RUN go mod download && \
    CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s -X main.version=1.0.0 -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -a -installsuffix cgo \
    -o gateway ./cmd/gateway

#---------------------------------------------
# Build stage for frontend
FROM node:20-alpine AS web-builder

WORKDIR /build
RUN apk add --no-cache git

# Clone repository and build frontend
ARG REPO_URL
ARG REPO_BRANCH
RUN git clone --depth 1 --branch ${REPO_BRANCH} ${REPO_URL} .

WORKDIR /build/web
RUN npm ci --no-audit --no-fund && npm run build

#---------------------------------------------
# Final stage - Home Assistant base image
ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    bash

WORKDIR /app

# Copy built artifacts
COPY --from=go-builder /build/gateway ./gateway
COPY --from=web-builder /build/web/dist ./web/dist

# Copy rootfs (run script)
COPY rootfs /

# Create required directories and set permissions
RUN mkdir -p /app/configs /data /config/loxone2hue && \
    chmod a+x /run.sh && \
    chmod a+x /app/gateway

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Expose port
EXPOSE 8080

# Labels for Home Assistant
LABEL \
    io.hass.name="Loxone2HUE Gateway" \
    io.hass.description="Gateway für Loxone zu Philips HUE Kommunikation" \
    io.hass.type="addon" \
    io.hass.version="1.0.0" \
    io.hass.arch="aarch64|amd64|armv7"

# Start gateway
CMD ["/run.sh"]
