#!/bin/bash
# Helper script to generate an access token for Google Cloud MCP server

# Activate service account
gcloud auth activate-service-account --key-file=/Users/avery/test2/gcp-key.json

# Print access token
echo "Access Token:"
gcloud auth print-access-token

echo ""
echo "Copy this token and update ~/.cursor/mcp.json"
echo "Replace 'YOUR_ACCESS_TOKEN_HERE' with the token above."
