FROM node:22-alpine

# Build deps for any native addons (e.g. kerberos in mongoose)
RUN apk add --no-cache python3 make g++

# YApi expects config.json two levels above server/:
#   /app/config.json   ← mounted at runtime
#   /app/vendors/      ← source code lives here
WORKDIR /app/vendors

# Install dependencies first (layer-cache friendly)
COPY package.json ./
# package-lock.json regenerated from scratch to avoid stale registry URLs
RUN npm install --legacy-peer-deps --ignore-scripts 2>&1 | tail -3

# Copy source
COPY . .

EXPOSE 3000

COPY deployment/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
