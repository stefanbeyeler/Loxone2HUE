# Home Assistant Add-on Dockerfile for Loxone2HUE Gateway
ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:3.18
FROM ${BUILD_FROM} AS base

# Install runtime dependencies only
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    bash

#---------------------------------------------
# Build stage for Go backend
FROM golang:1.22-alpine AS go-builder

WORKDIR /build
RUN apk add --no-cache git

# Copy Go source files from parent directory (repository root)
COPY go.mod go.sum* ./
RUN go mod download || go mod tidy

COPY cmd ./cmd
COPY internal ./internal
COPY configs ./configs

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway ./cmd/gateway

#---------------------------------------------
# Build stage for frontend
FROM node:20-alpine AS web-builder

WORKDIR /build/web

# Copy web source files from parent directory
COPY web/package.json web/package-lock.json* ./
RUN npm install

COPY web/ ./
RUN npm run build

#---------------------------------------------
# Final stage
FROM base

WORKDIR /app

# Copy built artifacts
COPY --from=go-builder /build/gateway ./gateway
COPY --from=web-builder /build/web/dist ./web/dist

# Copy rootfs (run script) from addon directory
COPY loxone2hue/rootfs /

# Create config directory
RUN mkdir -p /app/configs && \
    chmod a+x /run.sh

# Expose port
EXPOSE 8080

# Labels
LABEL \
    io.hass.name="Loxone2HUE Gateway" \
    io.hass.description="Gateway für Loxone zu Philips HUE Kommunikation" \
    io.hass.type="addon" \
    io.hass.version="1.0.0"

# Start gateway
CMD ["/run.sh"]
