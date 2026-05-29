#!/bin/bash
# VPS Initial Setup Script
# Run this on your VPS as ROOT user after first login

set -e

echo "🔧 Setting up VPS for onlylinks.id..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20 LTS
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Install Certbot
echo "📦 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install useful tools
echo "📦 Installing utilities..."
apt install -y htop curl wget nano ufw

# Create application user
echo "👤 Creating application user..."
if id "onlylink" &>/dev/null; then
    echo "User 'onlylink' already exists"
else
    adduser --disabled-password --gecos "" onlylink
    echo "onlylink:$(openssl rand -base64 12)" | chpasswd
    echo "✅ User 'onlylink' created"
fi

# Create directories
echo "📁 Creating directories..."
su - onlylink -c "mkdir -p ~/onlylink ~/backups"

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your application:"
echo "   scp onlylink-deploy.tar.gz onlylink@$(hostname -I | awk '{print $1}'):~/"
echo ""
echo "2. Switch to app user and extract:"
echo "   su - onlylink"
echo "   cd ~/onlylink"
echo "   tar -xzf ../onlylink-deploy.tar.gz"
echo ""
echo "3. Follow DEPLOY.md Step 4 onwards"
echo ""
echo "🔐 Important: Configure SSH key authentication and disable password login!"
