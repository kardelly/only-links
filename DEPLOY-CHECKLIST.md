# Deploy Checklist - Quick Start

Follow these steps in order. Total time: ~30 minutes.

---

## ✅ Pre-Deploy (Local Machine)

### 1. Prepare Deployment Package

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
./deploy-prepare.sh
```

This creates `onlylink-deploy.tar.gz`.

### 2. Get VPS Access Info from Hostinger

- Login to Hostinger dashboard
- Go to VPS section
- Note down:
  - [ ] VPS IP Address: `_______________`
  - [ ] SSH Username: `_______________` (usually `root`)
  - [ ] SSH Password: `_______________`

---

## ✅ Initial VPS Setup

### 3. Connect to VPS

```bash
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

### 4. Run Setup Script

```bash
# Upload setup script from local machine
scp vps-setup.sh root@YOUR_VPS_IP:~/

# On VPS, run it
bash ~/vps-setup.sh
```

Wait ~5 minutes for installation.

---

## ✅ Upload Application

### 5. Upload Files from Local Machine

```bash
scp onlylink-deploy.tar.gz onlylink@YOUR_VPS_IP:~/
```

### 6. Extract on VPS

```bash
# On VPS
su - onlylink
cd ~/onlylink
tar -xzf ../onlylink-deploy.tar.gz
```

### 7. Install Dependencies

```bash
npm install --production
```

---

## ✅ Configure Application

### 8. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output.

### 9. Create .env File

```bash
nano .env
```

Paste this (replace values):

```
NODE_ENV=production
PORT=3000
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
ALLOWED_ORIGINS=https://onlylinks.id,https://www.onlylinks.id
```

Save: `Ctrl+X` → `Y` → `Enter`

### 10. Test Application

```bash
npm start
```

See "🚀 onlylinks.id Server"? Good! Press `Ctrl+C`.

---

## ✅ Setup PM2 (Keep App Running)

### 11. Start with PM2

```bash
# Exit to root
exit

# Install PM2
npm install -g pm2

# Back to app user
su - onlylink
cd ~/onlylink

# Start app
pm2 start server.js --name onlylink
pm2 save

# Setup auto-start
pm2 startup
# Copy and run the command it shows (will need sudo)
```

---

## ✅ Configure Nginx (Web Server)

### 12. Create Nginx Config

```bash
# Exit to root
exit

# Create config
nano /etc/nginx/sites-available/onlylink
```

Paste this (replace `onlylinks.id` with your domain):

```nginx
server {
    listen 80;
    server_name onlylinks.id www.onlylinks.id;
    client_max_body_size 2M;

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
}
```

Save: `Ctrl+X` → `Y` → `Enter`

### 13. Enable Site

```bash
ln -s /etc/nginx/sites-available/onlylink /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## ✅ Configure Domain

### 14. Point Domain to VPS

In Hostinger DNS Manager:

**Add A Record:**
- Type: `A`
- Name: `@`
- Points to: `YOUR_VPS_IP`
- TTL: `3600`

**Add WWW Record:**
- Type: `A`
- Name: `www`
- Points to: `YOUR_VPS_IP`
- TTL: `3600`

**Wait 5-15 minutes** for DNS propagation.

### 15. Test Domain

```bash
# On local machine
dig onlylinks.id +short
# Should show your VPS IP
```

---

## ✅ Setup SSL (HTTPS)

### 16. Get SSL Certificate

```bash
# On VPS as root
certbot --nginx -d onlylinks.id -d www.onlylinks.id
```

Follow prompts:
- Enter email: `your-email@example.com`
- Agree to Terms: `Y`
- Redirect HTTP to HTTPS: `2`

---

## ✅ Verify Everything Works

### 17. Test in Browser

Open: `https://onlylinks.id`

- [ ] Page loads
- [ ] Can register account
- [ ] Can create bookmark
- [ ] SSL padlock shows (HTTPS)

---

## ✅ Post-Deploy Tasks

### 18. Database Permissions

```bash
su - onlylink
chmod 600 ~/onlylink/database.sqlite
```

### 19. Setup Backups

```bash
# Create backup script
nano ~/backup-db.sh
```

Paste:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
cp ~/onlylink/database.sqlite ~/backups/database-$DATE.sqlite
find ~/backups -name "database-*.sqlite" -mtime +7 -delete
```

Save and make executable:

```bash
chmod +x ~/backup-db.sh

# Add to crontab (daily 3 AM)
crontab -e
# Add line:
0 3 * * * /home/onlylink/backup-db.sh
```

### 20. Monitor Logs

```bash
pm2 logs onlylink
```

---

## 🎉 Done!

Your app is now live at:
- **Production URL:** https://onlylinks.id
- **PM2 Dashboard:** `pm2 monit`
- **Logs:** `pm2 logs onlylink`

---

## 📞 Need Help?

### Common Issues

**502 Bad Gateway:**
```bash
pm2 restart onlylink
systemctl restart nginx
```

**App not starting:**
```bash
pm2 logs onlylink --err
# Check for missing JWT_SECRET or port conflicts
```

**SSL failed:**
```bash
# Make sure DNS is pointing to VPS
dig onlylinks.id
# Then retry certbot
```

---

## 🔄 Update Application

When you make changes:

```bash
# Local machine
./deploy-prepare.sh
scp onlylink-deploy.tar.gz onlylink@YOUR_VPS_IP:~/

# VPS
su - onlylink
cd ~/onlylink
tar -xzf ../onlylink-deploy.tar.gz
npm install --production
pm2 restart onlylink
```

---

**Deployment Date:** _______________  
**VPS IP:** _______________  
**Domain:** onlylinks.id
