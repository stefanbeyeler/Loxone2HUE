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

# Clone repository and build
ARG REPO_URL=https://github.com/stefanbeyeler/Loxone2HUE.git
ARG REPO_BRANCH=main
RUN git clone --depth 1 --branch ${REPO_BRANCH} ${REPO_URL} .

RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway ./cmd/gateway

#---------------------------------------------
# Build stage for frontend
FROM node:20-alpine AS web-builder

WORKDIR /build
RUN apk add --no-cache git

# Clone repository and build frontend
ARG REPO_URL=https://github.com/stefanbeyeler/Loxone2HUE.git
ARG REPO_BRANCH=main
RUN git clone --depth 1 --branch ${REPO_BRANCH} ${REPO_URL} .

WORKDIR /build/web
RUN npm install && npm run build

#---------------------------------------------
# Final stage
FROM base

WORKDIR /app

# Copy built artifacts
COPY --from=go-builder /build/gateway ./gateway
COPY --from=web-builder /build/web/dist ./web/dist

# Copy rootfs (run script)
COPY rootfs /

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
