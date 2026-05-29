# Deploy Guide - Hostinger VPS

Complete guide to deploy onlylinks.id on Hostinger VPS.

## Prerequisites

- Hostinger VPS with SSH access
- Domain registered and pointing to VPS IP
- Local project ready to deploy

---

## Step 1: Connect to VPS

### Get SSH Credentials from Hostinger

1. Login to Hostinger → VPS section
2. Click "Setup" or "Access Details"
3. Note down:
   - **IP Address**: `123.45.67.89`
   - **SSH Port**: Usually `22`
   - **Username**: Usually `root`
   - **Password**: Provided by Hostinger

### Connect via Terminal

```bash
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

---

## Step 2: Initial VPS Setup

### Update System

```bash
apt update && apt upgrade -y
```

### Install Node.js (v20 LTS)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Install Git

```bash
apt install -y git
```

### Install Nginx (Reverse Proxy)

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### Install Certbot (SSL Certificates)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## Step 3: Create Application User

Security best practice: don't run apps as root.

```bash
# Create user
adduser onlylink
# Set a strong password when prompted

# Add to sudo group (if needed)
usermod -aG sudo onlylink

# Switch to new user
su - onlylink
```

---

## Step 4: Deploy Application

### Clone Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/delicious-orfans.git onlylink
cd onlylink
```

**OR** if uploading files manually:

```bash
# On your LOCAL machine:
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
tar -czf onlylink.tar.gz --exclude=node_modules --exclude=.git --exclude=database.sqlite .

# Upload to VPS
scp onlylink.tar.gz onlylink@YOUR_VPS_IP:~/

# On VPS:
cd ~
mkdir onlylink
cd onlylink
tar -xzf ~/onlylink.tar.gz
```

### Install Dependencies

```bash
cd ~/onlylink
npm install --production
```

### Create Environment File

```bash
nano .env
```

Add this content (generate real values):

```bash
# Generate JWT secret with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

NODE_ENV=production
PORT=3000
JWT_SECRET=YOUR_GENERATED_SECRET_HERE_MIN_64_CHARS

# CORS - your actual domain
ALLOWED_ORIGINS=https://onlylinks.id,https://www.onlylinks.id

# Rate limiting (optional, defaults shown)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy output and add to `.env` file.

### Test Application

```bash
npm start
```

If you see:
```
🚀 onlylinks.id Server
   Environment: production
   URL: http://localhost:3000
```

It's working! Press `Ctrl+C` to stop.

---

## Step 5: Setup PM2 (Process Manager)

PM2 keeps your app running 24/7 and auto-restarts on crashes.

### Install PM2 Globally

```bash
# Exit to root user first
exit

# Install PM2
npm install -g pm2

# Switch back to app user
su - onlylink
cd ~/onlylink
```

### Start Application with PM2

```bash
pm2 start server.js --name onlylink

# View status
pm2 status

# View logs
pm2 logs onlylink

# Setup auto-start on reboot
pm2 startup
# Copy and run the command it outputs (will need sudo)

pm2 save
```

### Useful PM2 Commands

```bash
pm2 restart onlylink    # Restart app
pm2 stop onlylink       # Stop app
pm2 delete onlylink     # Remove from PM2
pm2 logs onlylink       # View logs
pm2 monit               # Monitor CPU/memory
```

---

## Step 6: Configure Nginx (Reverse Proxy)

### Create Nginx Configuration

```bash
# Exit to root user
exit

# Create config file
nano /etc/nginx/sites-available/onlylink
```

Add this configuration (replace `onlylinks.id` with your domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name onlylinks.id www.onlylinks.id;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (for avatars)
    client_max_body_size 2M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Save and exit.

### Enable Site

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/onlylink /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## Step 7: Configure Domain DNS

In Hostinger DNS settings for your domain:

### Add A Records

```
Type: A
Name: @
Value: YOUR_VPS_IP
TTL: 3600

Type: A
Name: www
Value: YOUR_VPS_IP
TTL: 3600
```

Wait 5-15 minutes for DNS propagation.

### Test DNS

```bash
# On your local machine
dig onlylinks.id +short
# Should return your VPS IP
```

---

## Step 8: Setup SSL Certificate (HTTPS)

### Generate Certificate with Certbot

```bash
certbot --nginx -d onlylinks.id -d www.onlylinks.id
```

Follow prompts:
- Enter email for urgent renewal notices
- Agree to Terms of Service
- Choose: Redirect HTTP to HTTPS (option 2)

### Test Auto-Renewal

```bash
certbot renew --dry-run
```

If successful, certificates will auto-renew every 90 days.

---

## Step 9: Configure Firewall

```bash
# Allow SSH (IMPORTANT - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Step 10: Verify Deployment

### Check Application

```bash
# As onlylink user
su - onlylink
pm2 status
pm2 logs onlylink --lines 50
```

### Test in Browser

1. Visit `https://onlylinks.id`
2. Should see your landing page
3. Register a test account
4. Create a test bookmark

### Check SSL

```bash
# On local machine
curl -I https://onlylinks.id
# Should return 200 OK with HTTPS
```

---

## Step 11: Post-Deploy Checklist

### Security

- [ ] JWT_SECRET is strong (64+ chars)
- [ ] NODE_ENV=production is set
- [ ] Firewall is enabled
- [ ] SSL certificate is active
- [ ] Rate limiting is working
- [ ] Database file permissions: `chmod 600 ~/onlylink/database.sqlite`

### Monitoring

```bash
# Setup log monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backups

```bash
# Create backup script
nano ~/backup-db.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
cp ~/onlylink/database.sqlite ~/backups/database-$DATE.sqlite
# Keep only last 7 days
find ~/backups -name "database-*.sqlite" -mtime +7 -delete
```

Make executable:

```bash
chmod +x ~/backup-db.sh
mkdir ~/backups
```

Add to crontab (daily backup at 3 AM):

```bash
crontab -e
# Add this line:
0 3 * * * /home/onlylink/backup-db.sh
```

---

## Maintenance Commands

### Update Application

```bash
su - onlylink
cd ~/onlylink

# Pull latest changes
git pull origin main
# OR upload new files via SCP

# Install new dependencies
npm install --production

# Restart app
pm2 restart onlylink
```

### View Logs

```bash
pm2 logs onlylink --lines 100
pm2 logs onlylink --err  # Errors only
```

### Monitor Resources

```bash
pm2 monit
# OR
htop
```

### Renew SSL Certificate (manual)

```bash
certbot renew
systemctl reload nginx
```

---

## Troubleshooting

### App Not Starting

```bash
pm2 logs onlylink --err
# Check for:
# - Missing JWT_SECRET
# - Port already in use
# - Database file permissions
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Restart both
pm2 restart onlylink
systemctl restart nginx
```

### SSL Certificate Failed

```bash
# Check DNS is pointing to VPS
dig onlylinks.id +short

# Check Nginx config
nginx -t

# Try manual certificate
certbot certonly --nginx -d onlylinks.id -d www.onlylinks.id
```

### Database Locked

```bash
# Check permissions
ls -la ~/onlylink/database.sqlite

# Fix if needed
chmod 600 ~/onlylink/database.sqlite
chown onlylink:onlylink ~/onlylink/database.sqlite
```

---

## Performance Optimization

### Enable Gzip Compression

Edit `/etc/nginx/nginx.conf`:

```nginx
http {
    # Add inside http block
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

Restart Nginx:

```bash
systemctl restart nginx
```

### PM2 Cluster Mode (Optional)

For better performance on multi-core VPS:

```bash
pm2 delete onlylink
pm2 start server.js --name onlylink -i max
pm2 save
```

---

## Security Hardening

### Disable Root Login via SSH

```bash
nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin no
```

Restart SSH:
```bash
systemctl restart sshd
```

### Setup Fail2Ban (Brute-force Protection)

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Costs & Resources

### Recommended VPS Specs

- **Minimum**: 1 CPU, 1GB RAM, 20GB SSD (~$3-5/month)
- **Recommended**: 2 CPU, 2GB RAM, 40GB SSD (~$8-12/month)
- **Optimal**: 2 CPU, 4GB RAM, 80GB SSD (~$15-20/month)

### Expected Load

- 100 users/day: Minimum VPS
- 1000 users/day: Recommended VPS
- 10000+ users/day: Optimal VPS or upgrade

---

## Support

If you encounter issues:

1. Check logs: `pm2 logs onlylink`
2. Check Nginx: `tail -f /var/log/nginx/error.log`
3. Check firewall: `ufw status`
4. Check DNS: `dig onlylinks.id`

---

**Last Updated:** May 2026  
**Platform:** Hostinger VPS (Ubuntu 20.04/22.04)
