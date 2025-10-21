#!/bin/bash
# Database Setup Script for Railway
# Run with: railway run bash scripts/setup-db.sh

set -e

echo "🔧 Setting up database..."
echo "Database URL: ${DATABASE_URL:0:50}..."

echo "📦 Generating Prisma Client..."
npx prisma generate

echo "🚀 Pushing schema to database..."
npx prisma db push --accept-data-loss

echo "✅ Database setup complete!"
