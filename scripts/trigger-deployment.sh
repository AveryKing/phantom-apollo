#!/bin/bash
# Script to trigger GitHub Actions deployment by making an empty commit

echo "🚀 Triggering deployment pipeline..."

# Make an empty commit
git commit --allow-empty -m "chore: trigger deployment after updating Langfuse secrets"

# Push to main branch
git push origin main

echo "✅ Deployment pipeline triggered!"
echo "📊 Check status at: https://github.com/AveryKing/phantom-apollo/actions"
