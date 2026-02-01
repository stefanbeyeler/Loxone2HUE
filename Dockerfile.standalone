# Standalone Dockerfile for Synology NAS / Generic Docker
# Does not depend on Home Assistant base images

#---------------------------------------------
# Build stage for Go backend
FROM golang:1.22-alpine AS go-builder

WORKDIR /build
RUN apk add --no-cache git ca-certificates

# Copy source code
COPY . .

# Regenerate go.sum and download dependencies
RUN rm -f go.sum && go mod tidy

# Build for target architecture
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build \
    -ldflags="-w -s" \
    -o gateway ./cmd/gateway

#---------------------------------------------
# Build stage for frontend
FROM node:20-alpine AS web-builder

WORKDIR /build

# Copy web source
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund

COPY web/ ./
RUN npm run build

#---------------------------------------------
# Final stage
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata

WORKDIR /app

# Copy built artifacts
COPY --from=go-builder /build/gateway ./gateway
COPY --from=web-builder /build/dist ./web/dist

# Create config directory
RUN mkdir -p /data && chmod +x /app/gateway

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'CONFIG_PATH=/data/config.yaml' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'if [ ! -f "$CONFIG_PATH" ]; then' >> /start.sh && \
    echo '  echo "Creating default config..."' >> /start.sh && \
    echo '  cat > $CONFIG_PATH << EOF' >> /start.sh && \
    echo 'server:' >> /start.sh && \
    echo '  port: 8080' >> /start.sh && \
    echo '  host: "0.0.0.0"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'hue:' >> /start.sh && \
    echo '  bridge_ip: ""' >> /start.sh && \
    echo '  application_key: ""' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'loxone:' >> /start.sh && \
    echo '  enabled: true' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'logging:' >> /start.sh && \
    echo '  level: "info"' >> /start.sh && \
    echo '  format: "json"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'mappings: []' >> /start.sh && \
    echo 'EOF' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'exec /app/gateway -config $CONFIG_PATH' >> /start.sh && \
    chmod +x /start.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:8080/api/health || exit 1

# Start gateway
CMD ["/start.sh"]
