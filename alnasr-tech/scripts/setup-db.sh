#!/bin/bash
# Al-Nasr Tech ERP – Database Setup Script
# Usage: ./scripts/setup-db.sh

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Al-Nasr Tech ERP – Database Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load environment
if [ -f .env ]; then
    source .env
elif [ -f .env.example ]; then
    echo "⚠️  Using .env.example – copy to .env and configure for production"
    source .env.example
fi

DB_URL="${DATABASE_URL:-postgres://alnasr:alnasr_secure_2024@localhost:5432/alnasr_tech}"

echo ""
echo "Database URL: ${DB_URL%%@*}@****"
echo ""

# Create database if not exists
echo "📦 Ensuring database exists..."
createdb -h localhost -U alnasr alnasr_tech 2>/dev/null || echo "  Database already exists"

# Run migrations
echo "📋 Running migrations..."
if command -v sqlx &> /dev/null; then
    sqlx migrate run --database-url "$DB_URL"
else
    echo "  sqlx-cli not found, migrations will run on app startup"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Configure .env with your production values"
echo "  2. Run: docker compose up -d"
echo "  3. Test: curl http://localhost:3000/health"
