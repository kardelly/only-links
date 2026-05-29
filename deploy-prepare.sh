#!/bin/bash
# Prepare project for deployment
# Run this on your LOCAL machine before uploading to VPS

set -e

echo "🚀 Preparing onlylinks.id for deployment..."

# Check if in correct directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."

# Exclude development files
tar -czf onlylink-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=database.sqlite \
    --exclude='*.log' \
    --exclude=.DS_Store \
    --exclude=.env \
    --exclude=*.md \
    --exclude=deploy-*.sh \
    .

echo "✅ Deployment package created: onlylink-deploy.tar.gz"
echo ""
echo "📤 Next steps:"
echo "1. Upload to VPS:"
echo "   scp onlylink-deploy.tar.gz your-user@YOUR_VPS_IP:~/"
echo ""
echo "2. On VPS, extract:"
echo "   mkdir onlylink && cd onlylink"
echo "   tar -xzf ../onlylink-deploy.tar.gz"
echo "   npm install --production"
echo ""
echo "3. Follow DEPLOY.md for complete setup"
