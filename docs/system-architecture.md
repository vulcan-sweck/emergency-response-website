# System Architecture
## Emergency Response Coordination Platform — Version 2.0

---

## Overview

The Emergency Response Platform is a distributed microservice-based system. Each service is independent, owns its own database, and communicates with other services asynchronously through RabbitMQ. The React web application communicates with all services via REST APIs and receives real-time GPS updates via Socket.IO WebSockets.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web Frontend | React 18 + JavaScript | Admin dashboard, maps, analytics, incident management |
| API Layer | Node.js + Express | Four independent REST API microservices |
| Real-time | Socket.IO (WebSocket) | Live vehicle GPS tracking and broadcasts |
| Message Queue | RabbitMQ (AMQP) | Async event-driven communication between services |
| Database | PostgreSQL 15 | One isolated database per microservice |
| Authentication | JWT (JSON Web Tokens) | Stateless auth with access + refresh token pattern |
| Maps | OpenStreetMap + Leaflet.js | Free tile-based maps, no API key required |
| Charts | Recharts | Analytics dashboard visualisations |
| Containerisation | Docker + Docker Compose | One-command startup for all backend services |

---

## Microservices

### Auth Service — Port 3001
- Manages user registration, login, and JWT token lifecycle
- **Database:** `auth_db` — tables: `users`, `refresh_tokens`
- Issues short-lived access tokens (15 min) and long-lived refresh tokens (7 days)
- Passwords hashed with bcrypt (10 salt rounds) — never stored as plain text
- Roles supported: `system_admin`, `hospital_admin`, `police_admin`, `fire_admin`

### Incident Service — Port 3002
- Records and manages the full emergency incident lifecycle
- **Database:** `incident_db` — table: `incidents`
- Statuses: `created` → `dispatched` → `in_progress` → `resolved`
- Uses Haversine formula in a PostgreSQL query to find nearest available responder
- Publishes `incident.created`, `incident.dispatched`, `incident.resolved` to RabbitMQ

### Dispatch Service — Port 3003
- Manages the vehicle fleet and tracks real-time GPS coordinates
- **Database:** `dispatch_db` — tables: `vehicles`, `location_history`
- Runs Socket.IO WebSocket server alongside REST API on the same port
- Consumes `incident.created` events from RabbitMQ to auto-dispatch nearest vehicle
- Broadcasts `vehicle:location_update` to all connected web clients on GPS change

### Analytics Service — Port 3004
- Aggregates performance statistics for the dashboard charts
- **Database:** `analytics_db` — tables: `analytics_events`, `hospitals`
- Consumes `incident.resolved` events to record metrics automatically
- Also manages hospital capacity data for medical emergency routing

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│              React Web Application                        │
│   Dashboard │ Incidents │ Tracking │ Hospitals │ Analytics│
└──┬──────────┬──────────┬──────────┬───────────┬──────────┘
   │ REST     │ REST     │REST+WS   │ REST      │ REST
   ▼          ▼          ▼          └───────────┘
┌──────┐  ┌──────┐  ┌────────┐          ▼
│ Auth │  │Incid.│  │Dispatch│     ┌──────────┐
│ :3001│  │:3002 │  │ :3003  │     │Analytics │
└──┬───┘  └──┬───┘  └───┬────┘     │  :3004   │
   │         │           │          └────┬─────┘
   ▼         │           ▼               │
auth_db      │      dispatch_db    analytics_db
             │           │          (+ hospitals)
             │     ┌─────────────────────┐
             └────►│      RabbitMQ        │
                   │  emergency_events    │
                   │  incident.*          │
                   └──────┬──────────────┘
                          │ consume
               ┌──────────┴──────────┐
          dispatch_service      analytics_service
          (auto-dispatch)       (record metrics)
```

---

## Authentication Flow

```
1. User → POST /auth/login { email, password }
         ← { accessToken (15min), refreshToken (7days) }

2. User → Any API request with header:
         Authorization: Bearer <accessToken>
         ← 200 OK  or  401 Unauthorized

3. Access token expires →
   User → POST /auth/refresh-token { refreshToken }
         ← { new accessToken }
```

---

## RabbitMQ Event Design

**Exchange:** `emergency_events` (topic type, durable)

| Routing Key | Published By | Consumed By | Triggers |
|---|---|---|---|
| `incident.created` | Incident Service | Dispatch Service | Auto-dispatch nearest available vehicle |
| `incident.dispatched` | Incident Service | *(extensible)* | Status change notification |
| `incident.resolved` | Incident Service | Analytics Service | Record performance metrics to analytics_db |

---

## Real-Time Tracking Flow

```
GPS source (simulation or real driver app)
  │
  │  socket.emit('vehicle:update_location', { vehicleId, lat, lng })
  ▼
Dispatch Service (Socket.IO server)
  │  1. Save new coordinates to dispatch_db
  │  2. Save to location_history table
  │
  │  io.emit('vehicle:location_update', { vehicleId, lat, lng })
  ▼
All connected React clients
  │  Marker re-renders at new position on Leaflet map
  ▼
Admin sees vehicle moving in real time
```

---

## Role-Based Access Control

| Role | Pages | Incident Filter | Can Create Incidents |
|---|---|---|---|
| `system_admin` | All pages | All types | Yes |
| `hospital_admin` | Dashboard, Incidents, Tracking, Hospitals, Analytics | Medical only | No |
| `police_admin` | Dashboard, Incidents, Tracking, Analytics | Crime only | No |
| `fire_admin` | Dashboard, Incidents, Tracking, Analytics | Fire only | No |

---

## Database Design Summary

| Database | Key Tables | Key Fields |
|---|---|---|
| `auth_db` | users, refresh_tokens | user_id, email, password_hash, role |
| `incident_db` | incidents | incident_id, citizen_name, type, lat, lng, status, assigned_unit |
| `dispatch_db` | vehicles, location_history | vehicle_id, service_type, current_lat, current_lng, status |
| `analytics_db` | analytics_events, hospitals | response_time, resolution_time, region, service_type, available_beds |

---

## Data Isolation

Each microservice connects **only** to its own database. Cross-service data references are **soft references** — foreign key enforcement is handled at the application layer, not via cross-database constraints.
