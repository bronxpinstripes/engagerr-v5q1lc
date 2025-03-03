#!/bin/bash
#
# Engagerr Database Seeding Script
# This script seeds the Engagerr PostgreSQL database with initial data
# across different environments (development, staging, production)
#
# Version: 1.0.0

# --- Initialize script variables ---
# Get the script directory and project root paths
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR="$ROOT_DIR/src/backend"

# Default values
ENVIRONMENT="dev"
RESET="false"
SAMPLE_DATA="false"

# --- Helper functions ---
# Display usage information
show_help() {
  echo "Engagerr Database Seeding Script"
  echo "--------------------------------"
  echo "Usage: $0 [environment] [options]"
  echo
  echo "Environment:"
  echo "  dev       Development environment (default)"
  echo "  staging   Staging environment"
  echo "  prod      Production environment"
  echo
  echo "Options:"
  echo "  --reset           Reset the database before seeding (runs prisma migrate reset)"
  echo "  --sample-data     Include sample data in the seeding process"
  echo "  --help            Display this help message"
  echo
  echo "Examples:"
  echo "  $0                       # Seed development database with minimal data"
  echo "  $0 staging               # Seed staging database with minimal data"
  echo "  $0 dev --sample-data     # Seed development database with sample data"
  echo "  $0 dev --reset           # Reset and seed development database"
  echo "  $0 prod                  # Seed production database with essential data only"
  echo
}

# --- Parse command line arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    dev|staging|prod)
      ENVIRONMENT="$1"
      shift
      ;;
    --reset)
      RESET="true"
      shift
      ;;
    --sample-data)
      SAMPLE_DATA="true"
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      show_help
      exit 1
      ;;
  esac
done

# --- Environment validation and setup ---
echo "🔍 Setting up for $ENVIRONMENT environment..."

# Check if backend directory exists
if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "❌ Error: Backend directory not found at $BACKEND_DIR"
  echo "Please ensure you're running this script from the correct location."
  exit 1
fi

# Navigate to the backend directory
cd "$BACKEND_DIR" || {
  echo "❌ Error: Failed to navigate to $BACKEND_DIR"
  exit 1
}

# Determine the environment file path
ENV_FILE="$BACKEND_DIR/.env.$ENVIRONMENT"
ENV_FILE_EXAMPLE="$BACKEND_DIR/.env.example"

# Check if the environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
  echo "⚠️ Warning: Environment file $ENV_FILE not found"
  
  if [[ -f "$ENV_FILE_EXAMPLE" ]]; then
    echo "🔄 Creating $ENV_FILE from example file..."
    cp "$ENV_FILE_EXAMPLE" "$ENV_FILE"
    echo "✅ Created $ENV_FILE from example file"
  else
    echo "❌ Error: Neither environment file nor example file found"
    echo "Please create a .env.$ENVIRONMENT file in the backend directory"
    exit 1
  fi
fi

# Load environment variables
echo "📝 Loading environment variables from $ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | xargs)

# --- Check for required tools ---
if ! command -v npm &>/dev/null; then
  echo "❌ Error: npm is not installed or not in PATH"
  exit 1
fi

echo "🔧 Preparing database operations..."

# --- Database operations ---
# Reset database if requested
if [[ "$RESET" == "true" ]]; then
  echo "⚠️ Resetting database. All data will be lost!"
  echo "⏳ Running prisma migrate reset..."
  
  npx prisma migrate reset --force
  
  if [[ $? -ne 0 ]]; then
    echo "❌ Error: Failed to reset database"
    exit 1
  fi
  echo "✅ Database reset successful"
else
  # Otherwise just run migrations to ensure schema is up to date
  echo "⏳ Running prisma migrate deploy..."
  
  npx prisma migrate deploy
  
  if [[ $? -ne 0 ]]; then
    echo "❌ Error: Failed to run migrations"
    exit 1
  fi
  echo "✅ Migrations applied successfully"
fi

# --- Seed the database ---
echo "🌱 Seeding database..."

# Set environment variable for sample data if needed
if [[ "$SAMPLE_DATA" == "true" ]]; then
  echo "🔍 Including sample data in seed operation"
  export SEED_SAMPLE_DATA="true"
else
  export SEED_SAMPLE_DATA="false"
fi

# Export environment variable to control environment-specific seeding
export SEED_ENVIRONMENT="$ENVIRONMENT"

# Run the Prisma seed command
npx prisma db seed

# Check if seeding was successful
if [[ $? -ne 0 ]]; then
  echo "❌ Error: Database seeding failed"
  exit 1
fi

# --- Completion ---
echo "✅ Database seeding completed successfully!"

if [[ "$ENVIRONMENT" == "dev" && "$SAMPLE_DATA" == "true" ]]; then
  echo "ℹ️ Development database seeded with sample data"
  echo "   Sample credentials: admin@engagerr.io / password123"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
  echo "ℹ️ Staging database seeded with test data"
elif [[ "$ENVIRONMENT" == "prod" ]]; then
  echo "ℹ️ Production database seeded with essential data only"
else
  echo "ℹ️ Database seeded with minimal data"
fi

# Environment-specific post-seeding notes
case "$ENVIRONMENT" in
  dev)
    echo "🧪 Development environment ready for testing"
    ;;
  staging)
    echo "🚀 Staging environment prepared for verification"
    ;;
  prod)
    echo "⚠️ Remember: Additional production data must be imported separately"
    echo "   Use the data migration tools for production data import"
    ;;
esac

echo "Done! 🎉"
exit 0