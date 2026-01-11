#!/bin/bash

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REPO_NAME="phantom-apollo"
SERVICE_ACCOUNT="github-actions-deployer"

echo "👻 Phantom Apollo: GCP Setup"
echo "---------------------------"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# 1. Enable APIs
echo "🔌 Enabling required APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  aiplatform.googleapis.com \
  iamcredentials.googleapis.com

# 2. Create Artifact Registry
echo "📦 Creating Artifact Registry Docker repo..."
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    echo "   Repo '$REPO_NAME' already exists."
else
    gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for Phantom Apollo"
    echo "   Repo created."
fi

# 3. Create Service Account for GitHub Actions
echo "👤 Creating Service Account ($SERVICE_ACCOUNT)..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    echo "   Service Account already exists."
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="GitHub Actions Deployer"
    echo "   Service account created. Waiting for propagation..."
    sleep 5
fi

# 4. Grant Permissions
echo "🔑 Granting IAM roles..."
ROLES=(
    "roles/run.admin"
    "roles/storage.admin"
    "roles/artifactregistry.admin"
    "roles/iam.serviceAccountUser"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role" > /dev/null
done
echo "   Permissions granted."

# 5. Export Key Instructions
echo ""
echo "✅ Setup Complete!"
echo "---------------------------"
echo "Next Steps for GitHub Actions:"
echo "1. Create a JSON Key for this service account:"
echo "   gcloud iam service-accounts keys create gcp-key.json --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "2. Copy the content of 'gcp-key.json' and add it as a GitHub Secret named 'GCP_SA_KEY'."
echo "3. Add 'GCP_PROJECT_ID' as a secret with value: $PROJECT_ID"
echo "4. Add 'DISCORD_PUBLIC_KEY', 'SUPABASE_URL', etc. as secrets."
echo ""
