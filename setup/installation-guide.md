# Installation Guide
## Emergency Response Coordination Platform — Version 2.0

Follow each step in order. Estimated setup time: 15–20 minutes.

---

## Prerequisites

Make sure you have installed:
- **Docker Desktop** — running with "Engine running" status
- **Node.js 20 LTS** — for the React website only

> **Important:** Start Docker Desktop first and wait for "Engine running" before running any commands.

---

## Project Structure

Your files should be arranged like this:

```
emergency-response-system/
  ├── backend/
  ├── database/
  │   ├── auth-db.sql
  │   ├── incident-db.sql
  │   ├── dispatch-db.sql
  │   ├── analytics-db.sql
  │   └── hospitals-db.sql
  ├── frontend/          ← React website
  │   ├── src/
  │   └── package.json
  ├── infrastructure/
  │   └── docker-compose.yml
  └── setup/
```

---

## Step 1 — Start the Backend with Docker

Open a terminal and run:

```bash
cd infrastructure
docker compose up --build
```

> **First run:** Takes 5–10 minutes while Docker downloads images. Every run after this is much faster.

**Verify all services are running** — open these URLs in your browser:

| URL | Expected Response |
|---|---|
| http://localhost:3001/health | `{"status":"ok","service":"auth-service"}` |
| http://localhost:3002/health | `{"status":"ok","service":"incident-service"}` |
| http://localhost:3003/health | `{"status":"ok","service":"dispatch-service"}` |
| http://localhost:3004/health | `{"status":"ok","service":"analytics-service"}` |

---

## Step 2 — Load Hospitals Database (One Time Only)

Run these two commands to create the hospitals table and seed it with 8 Ghanaian hospitals:

```bash
docker cp database/hospitals-db.sql erp_analytics_db:/hospitals-db.sql
docker exec -it erp_analytics_db psql -U postgres -d analytics_db -f /hospitals-db.sql
```

Expected output:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
INSERT 0 8
```

> **One time only:** This only needs to be run once. The data persists in Docker volumes.

---

## Step 3 — Fix Demo Account Passwords

The seed data contains a placeholder password hash. Run this to generate the correct hash and update all accounts:

```bash
cd backend/auth-service
npm install
node -e "const b = require('bcryptjs'); b.hash('Password123!', 10).then(h => console.log(h));"
```

Copy the hash that is printed (starts with `$2b$10$...`), then run — replacing `PASTE_HASH_HERE`:

```bash
docker exec -it erp_auth_db psql -U postgres -d auth_db -c "UPDATE users SET password_hash = 'PASTE_HASH_HERE';"
```

This should return `UPDATE 4` confirming all 4 accounts were updated.

---

## Step 4 — Run the Website

Open a second terminal and run:

```bash
cd frontend
npm install
npm start
```

The browser will open automatically at **http://localhost:3000**

You should see a dark login screen with the ERP COMMAND logo.

### Demo Login Accounts

| Role | Email | Password |
|---|---|---|
| System Admin | admin@ercplatform.gov | Password123! |
| Hospital Admin | hospital@ercplatform.gov | Password123! |
| Police Admin | police@ercplatform.gov | Password123! |
| Fire Admin | fire@ercplatform.gov | Password123! |

---

## Daily Startup (After First Setup)

**Terminal 1 — Backend:**
```bash
cd infrastructure
docker compose up
```

**Terminal 2 — Website:**
```bash
cd frontend
npm start
```

**Shutdown:**
```bash
docker compose down
```

> No `--build` flag needed for daily use. Only use it if you changed backend code. `npm install` only needs to run once.

---

## API Documentation (Swagger)

Each service has interactive API docs:

| Service | URL |
|---|---|
| Auth Service | http://localhost:3001/api-docs |
| Incident Service | http://localhost:3002/api-docs |
| Dispatch Service | http://localhost:3003/api-docs |
| Analytics Service | http://localhost:3004/api-docs |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `docker compose: command not found` | Make sure Docker Desktop is running — look for whale icon in system tray |
| `UPDATE 0` when fixing passwords | Users table is empty. Run: `docker cp database/auth-db.sql erp_auth_db:/auth-db.sql` then: `docker exec -it erp_auth_db psql -U postgres -d auth_db -f /auth-db.sql` |
| Port already in use | Run: `docker compose down` then `docker compose up --build` |
| `npm install` fails | Run: `node -v` to confirm Node.js is installed |
| Website shows no data | Check all 4 health URLs — if any fail, restart Docker |
| Hospitals page is empty | You skipped Step 2. Run the hospitals-db.sql command |
| Login says invalid credentials | You skipped Step 3. Run the password hash fix command |
| Containers keep restarting | Run: `docker compose logs auth_service` to see the error |
