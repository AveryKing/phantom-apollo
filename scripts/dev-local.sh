#!/bin/bash
# Local Development Script for Discord Bot
# This script helps set up local development with ngrok tunneling

set -e

PORT=${PORT:-8080}
NGROK_PORT=${NGROK_PORT:-8080}

echo "🚀 Starting Local Development Environment"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Please create a .env file with your configuration"
    exit 1
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "⚠️  ngrok not found. Installing instructions:"
    echo "   brew install ngrok/ngrok/ngrok  (macOS)"
    echo "   or visit https://ngrok.com/download"
    echo ""
    echo "   After installing, authenticate with: ngrok config add-authtoken YOUR_TOKEN"
    echo "   Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    exit 1
fi

# Load environment variables
export SIMULATE_TASKS=true
export PORT=$PORT

echo "📋 Configuration:"
echo "   Port: $PORT"
echo "   Simulate Tasks: true (local mode)"
echo ""

# Start ngrok in background
echo "🌐 Starting ngrok tunnel..."
ngrok http $NGROK_PORT > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check ngrok logs: /tmp/ngrok.log"
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

echo "✅ ngrok tunnel active: $NGROK_URL"
echo ""
echo "📝 Next Steps:"
echo "   1. Update your Discord Application's Interactions Endpoint URL:"
echo "      $NGROK_URL/interactions"
echo "      Go to: https://discord.com/developers/applications"
echo "      → Your App → General Information → Interactions Endpoint URL"
echo ""
echo "   2. Start the development server in another terminal:"
echo "      npm run dev:server"
echo "      or"
echo "      SIMULATE_TASKS=true PORT=$PORT npm run dev:server"
echo ""
echo "   3. Test your bot by running /hunt or /prospect in Discord"
echo ""
echo "   Press Ctrl+C to stop ngrok"
echo ""

# Wait for user interrupt
trap "kill $NGROK_PID 2>/dev/null; echo ''; echo '👋 ngrok stopped'; exit" INT TERM

# Keep script running
wait $NGROK_PID
