# Build stage for Go backend
FROM golang:1.22-alpine AS go-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy source code first
COPY . .

# Download dependencies and build
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway ./cmd/gateway

# Build stage for React frontend
FROM node:20-alpine AS web-builder

WORKDIR /app/web

# Copy package files and install dependencies
COPY web/package.json ./
RUN npm install

# Copy source code
COPY web/ ./

# Build the frontend
RUN npm run build

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from go-builder
COPY --from=go-builder /app/gateway .

# Copy frontend build from web-builder
COPY --from=web-builder /app/web/dist ./web/dist

# Copy example config
COPY configs/config.example.yaml ./config.example.yaml

# Create config directory
RUN mkdir -p /app/configs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the binary
ENTRYPOINT ["./gateway"]
CMD ["-config", "/app/configs/config.yaml"]
