#!/usr/bin/with-contenv bashio
# Home Assistant Add-on Startup Script for Loxone2HUE Gateway

CONFIG_PATH=/data/options.json
APP_CONFIG_PATH=/app/configs/config.yaml

# Create config directory
mkdir -p /app/configs

# Read configuration from Home Assistant
HUE_BRIDGE_IP=$(bashio::config 'hue_bridge_ip')
HUE_APPLICATION_KEY=$(bashio::config 'hue_application_key')
LOG_LEVEL=$(bashio::config 'log_level')

# Generate config.yaml from HA options
cat > ${APP_CONFIG_PATH} << EOF
server:
  port: 8080
  host: "0.0.0.0"

hue:
  bridge_ip: "${HUE_BRIDGE_IP}"
  application_key: "${HUE_APPLICATION_KEY}"

loxone:
  enabled: true

logging:
  level: "${LOG_LEVEL}"
  format: "json"

mappings: []
EOF

# Check if we have existing config with mappings
if [ -f "/config/loxone2hue/config.yaml" ]; then
    bashio::log.info "Found existing config, using mappings from /config/loxone2hue/config.yaml"
    cp /config/loxone2hue/config.yaml ${APP_CONFIG_PATH}

    # Update HUE credentials if provided in HA config
    if [ -n "${HUE_BRIDGE_IP}" ]; then
        sed -i "s/bridge_ip:.*/bridge_ip: \"${HUE_BRIDGE_IP}\"/" ${APP_CONFIG_PATH}
    fi
    if [ -n "${HUE_APPLICATION_KEY}" ]; then
        sed -i "s/application_key:.*/application_key: \"${HUE_APPLICATION_KEY}\"/" ${APP_CONFIG_PATH}
    fi
fi

# Ensure config persistence directory exists
mkdir -p /config/loxone2hue

bashio::log.info "Starting Loxone2HUE Gateway..."
bashio::log.info "Web UI available at: $(bashio::addon.ingress_url)"

# Change to app directory and start gateway
cd /app
exec ./gateway -config ${APP_CONFIG_PATH}
