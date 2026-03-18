#!/bin/sh
set -e

RUNTIME_DIR="/app"
LOCK_FILE="${RUNTIME_DIR}/init.lock"
CONFIG_FILE="${RUNTIME_DIR}/config.json"

# ── Sanity check ────────────────────────────────────────────────────────────
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: config.json not found at $CONFIG_FILE"
  echo "       Mount your config file: -v /path/to/config.json:/app/config.json"
  exit 1
fi

# ── Wait for MongoDB ─────────────────────────────────────────────────────────
DB_HOST=$(node -e "const c=require('$CONFIG_FILE');console.log(c.db.servername||'mongo')")
DB_PORT=$(node -e "const c=require('$CONFIG_FILE');console.log(c.db.port||27017)")

echo "Waiting for MongoDB at ${DB_HOST}:${DB_PORT} ..."
until node -e "
  const net = require('net');
  const s = net.createConnection($DB_PORT, '$DB_HOST');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 1
done
echo "MongoDB is ready."

# ── First-boot initialisation ────────────────────────────────────────────────
if [ ! -f "$LOCK_FILE" ]; then
  echo "Running first-time database setup..."
  node server/install.js
  echo "Setup complete."
fi

# ── Start server ─────────────────────────────────────────────────────────────
exec node server/app.js
