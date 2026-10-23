# Shivalya Agrotech Producer Company Limited

Production-ready full-stack website and local database system for **Shivalya Agrotech Producer Company Limited**, an Indian supplier of agricultural mulching film, jute thread, agricultural plastic rolls, pre-cut mulch sheets, yarn cones, and custom industrial films.

---

## System Architecture Overview

- **Frontend**: Plain HTML5, CSS3, and JavaScript (vanilla) served directly by Express. Zero frameworks or build steps required. Clean `js/api.js` client with graceful fallback if backend is offline.
- **Backend**: Node.js + Express REST API (`/api/v1`) with MySQL connection pool, transaction support, audit logging, rate limiting, and security headers (Helmet, CORS).
- **Database**: Local MySQL 8 database (`shivalya_agrotech`) with 13 tables, UTF-8 Unicode support (`utf8mb4`), indexes, fulltext search, and cascade rules.
- **Admin Panel**: Lightweight, responsive management area at `/admin` protected by session-based authentication and CSRF double-submit tokens.

---

## Quick Start Guide (Windows)

Follow these step-by-step instructions to run the website on your local Windows machine.

### Prerequisites

1. **Node.js**: Install Node.js LTS (v20+ or v22+) from [nodejs.org](https://nodejs.org/).
   - Verify in terminal: `node -v` and `npm -v`.
2. **MySQL Server 8.0**: Install MySQL Community Server from [dev.mysql.com](https://dev.mysql.com/downloads/installer/).
   - Ensure MySQL service is running: Run `net start MySQL80` or check Windows Services (`services.msc`).

---

### Step 1: Configure Environment Variables

Create your `.env` file from the provided `.env.example`:

```powershell
Copy-Item .env.example .env
```

Open `.env` in any text editor and adjust your MySQL password:

```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=shivalya_agrotech

# Session & Admin Auth
SESSION_SECRET=shivalya_production_secret_key_change_me_random_string_2026
ADMIN_EMAIL=admin@shivalya.com
ADMIN_INITIAL_PASSWORD=Admin@123

# Email & Notifications (Graceful fallback if blank)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=shivalyaagrotechproducercompany@gmail.com
WHATSAPP_NUMBER=919950337442

# Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000
```

---

### Step 2: Install Dependencies

```powershell
npm install
```

---

### Step 3: Initialize Database (Idempotent Setup)

Run the automated database setup runner. This script creates the database `shivalya_agrotech`, runs the schema, creates all indexes, and seeds the real catalog:

```powershell
npm run db:setup
```

> **Note**: This command is 100% idempotent. You can run it multiple times safely without errors or data duplication.

---

### Step 4: Create Initial Admin Account

Create the administrator user defined in your `.env` (`ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`):

```powershell
npm run create-admin
```

---

### Step 5: Start the Server

To run with automatic file reloading in development:
```powershell
npm run dev
```

Or for normal production startup:
```powershell
npm start
```

---

### Step 6: Access the Application

- **Public Website**: Open [http://localhost:3000](http://localhost:3000)
  - Home, Products, Product Detail (`product.html?id=mulching-film`), About Us, Industries, Quality, Infrastructure, Gallery, Contact.
- **Admin Panel**: Open [http://localhost:3000/admin](http://localhost:3000/admin)
  - Default Login Email: `admin@shivalya.com`
  - Default Initial Password: `Admin@123` (or as set in `.env`)
  - *On first sign-in, you will be prompted to change your password.*

---

## Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts server with Node watch mode (`node --watch server/index.js`) |
| `npm start` | Starts server for production |
| `npm run db:setup` | Runs `000_create_database.sql`, `001_schema.sql`, `002_indexes.sql`, and `003_seed.sql` |
| `npm run db:seed` | Runs only seed migration `003_seed.sql` |
| `npm run db:reset` | Drops database and recreates/seeds from scratch |
| `npm run create-admin` | Seeds or updates the admin account with bcrypt hash |
| `npm test` | Runs API endpoint & security automated tests |
| `npm run test:e2e` | Runs Playwright browser tests across all pages |

---

## Troubleshooting Common Issues

### 1. `ECONNREFUSED 127.0.0.1:3306`
- **Cause**: MySQL Server is not running on port 3306.
- **Fix**: Open PowerShell as Administrator and run:
  ```powershell
  net start MySQL80
  ```
  Or open `services.msc`, locate `MySQL80` (or `MySQL`), right-click and select **Start**.

### 2. `ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost'`
- **Cause**: The password specified in `.env` does not match your MySQL root password.
- **Fix**:
  1. Verify your password in MySQL Command Line Client: `mysql -u root -p`.
  2. Update `DB_PASSWORD=...` in `.env` to match.

### 3. `ER_NOT_SUPPORTED_AUTH_MODE` or `caching_sha2_password` Error
- **Cause**: MySQL 8 default authentication plugin incompatibility with older clients.
- **Fix**: Run in MySQL console:
  ```sql
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
  FLUSH PRIVILEGES;
  ```

### 4. `EADDRINUSE: address already in use :::3000`
- **Cause**: Another process is already running on port 3000.
- **Fix**:
  1. Change `PORT=3001` in your `.env`.
  2. Or stop the process holding port 3000:
     ```powershell
     Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
     ```

### 5. `ER_BAD_DB_ERROR: Unknown database 'shivalya_agrotech'`
- **Cause**: The database has not been created yet.
- **Fix**: Run `npm run db:setup`. It will automatically execute `000_create_database.sql` first.
