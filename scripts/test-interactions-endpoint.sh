#!/bin/bash
# Test script to verify the Discord interactions endpoint is working

ENDPOINT_URL=${1:-"http://localhost:8080/interactions"}

echo "🧪 Testing Discord Interactions Endpoint"
echo "========================================="
echo "Endpoint: $ENDPOINT_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:8080/ | head -1
echo ""
echo ""

# Test 2: PING request (type 1) - Discord's verification request
echo "2️⃣ Testing PING (type 1) response..."
PING_RESPONSE=$(curl -s -X POST "$ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -d '{"type": 1}')

echo "Response: $PING_RESPONSE"
echo ""

# Test 3: Check if server is running
echo "3️⃣ Checking if server is running..."
if curl -s -f http://localhost:8080/ > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is NOT running on port 8080"
    echo "   Start it with: SIMULATE_TASKS=true npm run dev:server"
    exit 1
fi

echo ""
echo "📝 Notes:"
echo "- This test sends a basic type 1 request (without signature)"
echo "- Discord will send requests WITH signature headers"
echo "- If this fails, check:"
echo "  1. Server is running"
echo "  2. Endpoint URL is correct"
echo "  3. DISCORD_PUBLIC_KEY is set in .env"
echo "  4. ngrok is running (for external testing)"
