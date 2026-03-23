# Deployment Guide
## Emergency Response Coordination Platform

This guide covers deploying the system so it is accessible from any browser anywhere, not just on your local machine.

---

## Options at a Glance

| Option | Best For | Cost | Difficulty |
|---|---|---|---|
| **Local Network** | Class presentation | Free | Easy |
| **Railway + Vercel** | Live public URL | Free tier | Medium |
| **Railway + CloudAMQP + Vercel** | Full cloud deployment | Free tier | Medium |

---

## Option A — Local Network Demo (Recommended for Presentations)

Share the website with anyone on the same Wi-Fi network during a presentation. No cloud accounts needed.

**Step 1 — Find your computer's IP address:**

```bash
# Windows
ipconfig
# Look for: IPv4 Address . . . . . . . . : 192.168.x.x

# macOS
ipconfig getifaddr en0
```

**Step 2 — Update API URLs in the frontend:**

Open `frontend/src/services/api.js` and replace `localhost` with your IP:

```javascript
const BASE = {
  auth:      'http://192.168.1.15:3001',   // replace with your IP
  incident:  'http://192.168.1.15:3002',
  dispatch:  'http://192.168.1.15:3003',
  analytics: 'http://192.168.1.15:3004',
};
```

**Step 3 — Start the system normally:**

```bash
# Terminal 1
cd infrastructure && docker compose up

# Terminal 2
cd frontend && npm start
```

Anyone on the same Wi-Fi can now visit `http://YOUR_IP:3000` to access the website.

> **Best for presentations:** Your lecturer can open the site on their own laptop or phone while you present.

---

## Option B — Full Cloud Deployment (Railway + CloudAMQP + Vercel)

### Part 1 — RabbitMQ on CloudAMQP

1. Go to https://www.cloudamqp.com and sign up
2. Create a new instance — choose the **free Lemur plan**
3. Copy the **AMQP URL** from the dashboard (looks like `amqps://user:pass@hostname/vhost`)
4. Keep this URL — you will need it for the Railway environment variables

---

### Part 2 — Backend on Railway

Railway can run Docker containers in the cloud.

**Step 1 — Create Railway Account:**
1. Go to https://railway.app and sign up with GitHub
2. Push your project to a GitHub repository first if you haven't already

**Step 2 — Add PostgreSQL Databases:**
1. In Railway, click **New Project**
2. Click **Add a Service → Database → PostgreSQL**
3. Repeat 4 times, one for each: `auth_db`, `incident_db`, `dispatch_db`, `analytics_db`
4. For each database, go to the **Connect** tab and copy the `DATABASE_URL`

**Step 3 — Deploy Each Microservice:**
1. In Railway, click **New Service → GitHub Repo**
2. Select your repository
3. Set the **Root Directory** to `backend/auth-service` (repeat for each)
4. Railway detects the Dockerfile and builds automatically

**Step 4 — Set Environment Variables for each service:**

```
DB_HOST=<from Railway PostgreSQL>
DB_PORT=5432
DB_NAME=auth_db
DB_USER=<from Railway>
DB_PASSWORD=<from Railway>
JWT_SECRET=<generate a strong random 32+ character string>
RABBITMQ_URL=<your CloudAMQP AMQP URL>
PORT=3001
```

Change `PORT` and `DB_NAME` for each service (3001–3004).

**Step 5 — Copy the public URLs Railway assigns to each service.**

---

### Part 3 — Frontend on Vercel

1. Update `frontend/src/services/api.js` with your Railway URLs:

```javascript
const BASE = {
  auth:      'https://your-auth-service.railway.app',
  incident:  'https://your-incident-service.railway.app',
  dispatch:  'https://your-dispatch-service.railway.app',
  analytics: 'https://your-analytics-service.railway.app',
};
```

2. Go to https://vercel.com and sign up with GitHub
3. Click **New Project → Import** your repository
4. Set **Root Directory** to `frontend`
5. Set **Build Command** to `npm run build`
6. Set **Output Directory** to `build`
7. Click **Deploy**

Vercel gives you a live URL like `https://erp-command.vercel.app`.

---

## After Deployment — Load Hospital Data

Once services are running in the cloud, load the hospitals seed data into the analytics database. Use Railway's built-in database console or connect via a PostgreSQL client using the Railway connection string, then run the contents of `database/hospitals-db.sql`.

---

## Notes

- The free Railway tier may sleep inactive services after a period of inactivity — the first request after sleeping takes a few seconds longer
- CloudAMQP free tier allows 1 million messages per month which is more than enough for a demo
- Vercel free tier has no limits for a project of this size
