# Requirements
## Emergency Response Coordination Platform — Version 2.0

This document lists all software required to run the system locally.

> **Good news:** Docker Desktop runs Node.js, PostgreSQL, and RabbitMQ automatically inside containers. You only need Docker Desktop and Node.js installed on your machine.

---

## Required Software

### 1. Docker Desktop (Required)
Runs all four backend microservices, all four PostgreSQL databases, and RabbitMQ in isolated containers. This replaces the need to install Node.js for the backend, PostgreSQL, or RabbitMQ manually.

Download: https://www.docker.com/products/docker-desktop

```bash
# Verify
docker --version
docker compose version
```

---

### 2. Node.js (≥ 20 LTS) — Required for the Website Only
Node.js is only needed to run the React web frontend locally. It is **not** needed for the backend — Docker handles that entirely.

Download: https://nodejs.org — choose the LTS version

```bash
# Verify
node -v    # should show v20.x.x
npm -v
```

---

### 3. Git
Version control for managing project files.

Download: https://git-scm.com/downloads

```bash
git --version
```

---

### 4. Visual Studio Code (Recommended)
Download: https://code.visualstudio.com

**Recommended Extensions:**

| Extension | Publisher | Purpose |
|---|---|---|
| Docker | Microsoft | Manage Docker containers from VS Code |
| ESLint | Microsoft | JavaScript/React code linting |
| REST Client | Huachao Mao | Test API endpoints from .http files |
| Prettier | Prettier | Code formatting |
| ES7+ React | dsznajder | React code snippets |

---

### 5. Postman (Optional)
GUI tool for testing REST API endpoints.

Download: https://www.postman.com/downloads/

---

## What You Do NOT Need to Install

Because Docker handles the backend completely, the following do **not** need to be installed on your machine:

- **PostgreSQL** — runs inside Docker containers
- **RabbitMQ** — runs inside a Docker container
- **Node.js for the backend** — Docker containers have Node.js built in

---

## Port Reference

| Service | Port | URL |
|---|---|---|
| Website (React) | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001/health |
| Incident Service | 3002 | http://localhost:3002/health |
| Dispatch Service | 3003 | http://localhost:3003/health |
| Analytics Service | 3004 | http://localhost:3004/health |
| Auth DB | 5433 | PostgreSQL (Docker) |
| Incident DB | 5434 | PostgreSQL (Docker) |
| Dispatch DB | 5435 | PostgreSQL (Docker) |
| Analytics DB | 5436 | PostgreSQL (Docker) |
| RabbitMQ AMQP | 5672 | Message broker |
| RabbitMQ UI | 15672 | http://localhost:15672 (guest/guest) |
