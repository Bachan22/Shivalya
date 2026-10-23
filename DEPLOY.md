# Deployment & Operations Guide

This guide describes how to deploy Shivalya Agrotech on a production Virtual Private Server (VPS) running Ubuntu 22.04 LTS / 24.04 LTS or Windows Server, configure Nginx as a reverse proxy with SSL, and manage MySQL backups.

---

## 1. VPS Production Setup (Ubuntu / Debian)

### Step 1: Install Node.js LTS and MySQL Server

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL Installation
sudo mysql_secure_installation
```

---

### Step 2: Configure MySQL User & Database

Log in to MySQL as root:
```bash
sudo mysql
```

Run the following SQL commands:
```sql
CREATE DATABASE IF NOT EXISTS shivalya_agrotech 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'shivalya_user'@'localhost' IDENTIFIED BY 'StrongProductionPasswordHere#2026';
GRANT ALL PRIVILEGES ON shivalya_agrotech.* TO 'shivalya_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Step 3: Clone Code & Configure Environment

```bash
# Clone or copy application to web root
sudo mkdir -p /var/www/shivalya
cd /var/www/shivalya

# Assuming files are uploaded here:
npm install --production

# Create production .env file
cp .env.example .env
nano .env
```

Set production values in `.env`:
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=shivalya_user
DB_PASSWORD=StrongProductionPasswordHere#2026
DB_NAME=shivalya_agrotech
SESSION_SECRET=GENERATE_A_RANDOM_64_CHAR_HEX_STRING
ADMIN_EMAIL=admin@shivalya.com
ADMIN_INITIAL_PASSWORD=YourSecureAdminPassword
ALLOWED_ORIGINS=https://shivalyaagrotech.com
```

---

### Step 4: Run Database Migrations

```bash
npm run db:setup
npm run create-admin
```

---

### Step 5: Process Management with PM2

Install PM2 globally to manage Node.js processes, handle crashes, and restart on server reboot:

```bash
sudo npm install -g pm2

# Start server
pm2 start server/index.js --name "shivalya-web"

# Save PM2 process list
pm2 save

# Setup PM2 startup script on server boot
pm2 startup
```

Useful PM2 commands:
- `pm2 status`: View running status and memory usage.
- `pm2 logs shivalya-web`: View live server logs.
- `pm2 restart shivalya-web`: Gracefully restart application.

---

## 2. Nginx Reverse Proxy with SSL (Certbot)

### Step 1: Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Configure Virtual Host

Create `/etc/nginx/sites-available/shivalya.conf`:

```nginx
server {
    listen 80;
    server_name shivalyaagrotech.com www.shivalyaagrotech.com;

    # Maximum upload size for product images
    client_max_body_size 10M;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/shivalya.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Enable Free SSL with Let's Encrypt

```bash
sudo certbot --nginx -d shivalyaagrotech.com -d www.shivalyaagrotech.com
```

---

## 3. Database Backup & Restore

### Automated Nightly Backup Script

Create a backup directory:
```bash
sudo mkdir -p /var/backups/mysql
```

To take a complete backup manually:
```bash
mysqldump -u shivalya_user -p'StrongProductionPasswordHere#2026' \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  shivalya_agrotech > /var/backups/mysql/shivalya_$(date +%Y%m%d_%H%M%S).sql
```

Compress the backup:
```bash
gzip /var/backups/mysql/*.sql
```

### Restore Database from Backup

To restore from a backup file:
```bash
gunzip < /var/backups/mysql/shivalya_20260101_000000.sql.gz | mysql -u shivalya_user -p shivalya_agrotech
```

---

## 4. Windows Server Deployment

1. Install Node.js LTS and MySQL 8 using the Windows installers.
2. Use **NSSM** (Non-Sucking Service Manager) or PM2 to run Node.js as a native Windows Service:
   ```cmd
   npm install -g pm2
   pm2 start server\index.js --name "shivalya-web"
   npm install -g pm2-windows-service
   pm2-service-install
   ```
3. Use IIS or Nginx for Windows as the front-facing reverse proxy with URL Rewrite.
