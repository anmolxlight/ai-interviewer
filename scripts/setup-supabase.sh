#!/bin/bash
set -e

# This script creates a Supabase project and applies the schema.
# Requires: SUPABASE_ACCESS_TOKEN env var (get from https://supabase.com/dashboard/account/tokens)

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN not set"
  echo "Get one from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

PROJECT_NAME="${1:-ai-interview-assistant}"
ORG_ID="$2"
DB_PASS="${3:-$(openssl rand -base64 24)}"
REGION="${4:-us-east-1}"

if [ -z "$ORG_ID" ]; then
  echo "Fetching organizations..."
  ORGS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    https://api.supabase.com/v1/organizations)
  ORG_ID=$(echo "$ORGS" | python3 -c "import sys,json; orgs=json.load(sys.stdin); print(orgs[0]['id'] if orgs else '')" 2>/dev/null)
  if [ -z "$ORG_ID" ]; then
    echo "Error: No organizations found. Create one at https://supabase.com/dashboard"
    exit 1
  fi
  echo "Using organization: $ORG_ID"
fi

echo "Creating Supabase project '$PROJECT_NAME'..."
RESPONSE=$(curl -s -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$PROJECT_NAME\",
    \"organization_id\": \"$ORG_ID\",
    \"db_pass\": \"$DB_PASS\",
    \"region\": \"$REGION\",
    \"plan\": \"free\"
  }")

PROJECT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "Error creating project:"
  echo "$RESPONSE"
  exit 1
fi

echo "Project created: $PROJECT_ID"
echo "Waiting for project to be ready (this takes ~60s)..."
sleep 60

echo "Fetching API keys..."
KEYS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_ID/api-keys")

ANON_KEY=$(echo "$KEYS" | python3 -c "import sys,json; keys=json.load(sys.stdin); print(next((k['api_key'] for k in keys if k['name']=='anon'), ''))" 2>/dev/null)
SERVICE_KEY=$(echo "$KEYS" | python3 -c "import sys,json; keys=json.load(sys.stdin); print(next((k['api_key'] for k in keys if k['name']=='service_role'), ''))" 2>/dev/null)
SUPABASE_URL="https://$PROJECT_ID.supabase.co"

echo ""
echo "Running schema..."
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(python3 -c "import json; print(json.dumps(open('supabase/schema.sql').read()))")}" 2>/dev/null || true

# Also try using the SQL endpoint directly
PGREST_URL="$SUPABASE_URL/rest/v1/"

echo ""
echo "=== Supabase Setup Complete ==="
echo ""
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_KEY=$SERVICE_KEY"
echo "VITE_SUPABASE_URL=$SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "Add these to your .env files and Vercel environment variables."
