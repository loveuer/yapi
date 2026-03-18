#!/bin/sh
set -e

CONFIG_FILE="/app/config.json"

# ── Sanity check ────────────────────────────────────────────────────────────
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: config.json not found at $CONFIG_FILE"
  echo "       Mount your config file: -v /path/to/config.json:/app/config.json:ro"
  exit 1
fi

# ── Wait for MongoDB ─────────────────────────────────────────────────────────
DB_HOST=$(node -e "const c=require('$CONFIG_FILE');process.stdout.write(c.db.servername||'127.0.0.1')")
DB_PORT=$(node -e "const c=require('$CONFIG_FILE');process.stdout.write(String(c.db.port||27017))")

echo "Waiting for MongoDB at ${DB_HOST}:${DB_PORT} ..."
until node -e "
  const net = require('net');
  const s = net.createConnection(${DB_PORT}, '${DB_HOST}');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 1
done
echo "MongoDB is ready."

# ── First-boot initialisation (check via MongoDB, not lock file) ─────────────
# The container is stateless: all data lives in MongoDB.
# We query whether an admin user already exists to decide whether to run install.
if node -e "
  const { MongoClient } = require('mongodb');
  const c = require('$CONFIG_FILE');
  const auth = c.db.user
    ? encodeURIComponent(c.db.user) + ':' + encodeURIComponent(c.db.pass) + '@'
    : '';
  const qs   = c.db.authSource ? '?authSource=' + c.db.authSource : '';
  const url  = 'mongodb://' + auth + c.db.servername + ':' + (c.db.port || 27017) + '/' + c.db.DATABASE + qs;
  MongoClient.connect(url)
    .then(client => client.db().collection('user').findOne({ role: 'admin' })
      .then(u => { client.close(); process.exit(u ? 0 : 1); }))
    .catch(() => process.exit(1));
" 2>/dev/null; then
  echo "Database already initialised, skipping setup."
else
  echo "Running first-time database setup..."
  node /app/vendors/server/install.js
  echo "Setup complete."
fi

# ── Start server ─────────────────────────────────────────────────────────────
exec node /app/vendors/server/app.js
