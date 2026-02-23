#!/usr/bin/env bash
# Seed COA templates from Excel files in /COA Templates/
# Usage: bash scripts/seed-coa-templates.sh
#
# Prerequisites:
# - SUPABASE_URL and SUPABASE_ANON_KEY set in environment or .env.local
# - A valid access token (run: npx supabase login)
# - The import-coa-template edge function must be deployed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$PROJECT_DIR/COA Templates"

# Load env from .env.local if present
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -E '^VITE_SUPABASE_(URL|ANON_KEY)=' "$PROJECT_DIR/.env.local" | sed 's/^VITE_//' | xargs)
fi

SUPABASE_URL="${SUPABASE_URL:-}"
if [ -z "$SUPABASE_URL" ]; then
  echo "ERROR: SUPABASE_URL not set. Export it or add VITE_SUPABASE_URL to .env.local"
  exit 1
fi

FUNCTION_URL="$SUPABASE_URL/functions/v1/import-coa-template"

echo "Seeding COA templates from: $TEMPLATE_DIR"
echo "Target: $FUNCTION_URL"
echo ""

# You must provide a Bearer token (get one from supabase auth or the app)
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: Set SUPABASE_ACCESS_TOKEN to a valid user JWT"
  echo "  You can get one by logging into the app and copying the access_token from localStorage"
  exit 1
fi

import_template() {
  local file="$1"
  local name="$2"
  local entity_types="$3"
  local is_default="$4"

  echo "Importing: $name"
  echo "  File: $(basename "$file")"
  echo "  Entity types: $entity_types"
  echo "  Default: $is_default"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file" \
    -F "name=$name" \
    -F "entity_types=$entity_types" \
    -F "is_default=$is_default")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  OK: $BODY"
  else
    echo "  FAILED ($HTTP_CODE): $BODY"
  fi
  echo ""
}

# Import each template
import_template \
  "$TEMPLATE_DIR/KOVA_COA_Template_Operating_Homebuilder (1).xlsx" \
  "Operating Homebuilder" \
  "operating" \
  "true"

import_template \
  "$TEMPLATE_DIR/KOVA_COA_Template_Holding_Company (1).xlsx" \
  "Holding Company" \
  "holding_company" \
  "false"

import_template \
  "$TEMPLATE_DIR/KOVA_COA_Template_Investment_Fund (1).xlsx" \
  "Investment Fund" \
  "fund" \
  "true"

import_template \
  "$TEMPLATE_DIR/KOVA_COA_Template_SPE (1).xlsx" \
  "SPE - Development / Rental" \
  "spe_development,spe_rental,spe_scattered_lot,spe_community_dev,spe_lot_dev,spe_lot_purchase" \
  "true"

echo "Done! Check the Admin > COA Templates page."
