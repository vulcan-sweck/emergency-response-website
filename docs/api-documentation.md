# API Documentation
## Emergency Response Coordination Platform

All endpoints (except `/auth/register` and `/auth/login`) require:
```
Authorization: Bearer <access_token>
```

---

## Auth Service — Port 3001

### POST /auth/register
Create a new admin account.

**Request body:**
```json
{
  "name":     "Sarah Mitchell",
  "email":    "admin@example.com",
  "password": "Password123!",
  "role":     "system_admin"
}
```
Allowed roles: `system_admin`, `hospital_admin`, `police_admin`, `fire_admin`, `ambulance_admin`

**Response 201:**
```json
{
  "message": "User registered successfully.",
  "user": { "user_id": 1, "name": "Sarah Mitchell", "email": "...", "role": "system_admin" }
}
```

---

### POST /auth/login
Authenticate and receive JWT tokens.

**Request body:**
```json
{ "email": "admin@example.com", "password": "Password123!" }
```

**Response 200:**
```json
{
  "accessToken":  "<jwt>",
  "refreshToken": "<jwt>",
  "user": { "userId": 1, "name": "Sarah Mitchell", "email": "...", "role": "system_admin" }
}
```

---

### POST /auth/refresh-token
Get a new access token using a refresh token.

**Request body:**
```json
{ "refreshToken": "<refresh_jwt>" }
```

**Response 200:**
```json
{ "accessToken": "<new_jwt>" }
```

---

### GET /auth/profile *(Protected)*
Returns the authenticated user's profile.

**Response 200:**
```json
{
  "user": { "user_id": 1, "name": "Sarah Mitchell", "email": "...", "role": "...", "created_at": "..." }
}
```

---

## Incident Service — Port 3002

### POST /incidents *(Protected)*
Log a new emergency incident.

**Request body:**
```json
{
  "citizenName":  "Kwame Asante",
  "incidentType": "fire",
  "latitude":     5.6037,
  "longitude":    -0.1870,
  "notes":        "Warehouse fire, spreading fast.",
  "region":       "Accra Central"
}
```
Allowed types: `fire`, `medical`, `crime`, `accident`, `natural_disaster`, `other`

**Response 201:**
```json
{ "message": "Incident created.", "incident": { ... } }
```

---

### GET /incidents/open *(Protected)*
Returns all non-resolved incidents, newest first.

**Response 200:**
```json
{ "incidents": [ { "incident_id": 1, "citizen_name": "...", "status": "created", ... } ] }
```

---

### GET /incidents/:id *(Protected)*
Returns a single incident by ID.

**Response 200:**
```json
{ "incident": { "incident_id": 1, ... } }
```

---

### PUT /incidents/:id/status *(Protected)*
Update an incident's lifecycle status.

**Request body:**
```json
{ "status": "in_progress" }
```
Allowed values: `created`, `dispatched`, `in_progress`, `resolved`

**Response 200:**
```json
{ "message": "Status updated.", "incident": { ... } }
```

---

### PUT /incidents/:id/assign *(Protected)*
Assign a vehicle unit to an incident (triggers dispatch).

**Request body:**
```json
{ "unitId": "VH-F001" }
```

**Response 200:**
```json
{ "message": "Unit assigned.", "incident": { ... } }
```

---

## Dispatch Service — Port 3003

### POST /vehicles/register *(Protected)*
Register a new emergency vehicle.

**Request body:**
```json
{
  "vehicleId":   "VH-F010",
  "name":        "Fire Engine Delta",
  "serviceType": "fire"
}
```
Allowed types: `fire`, `ambulance`, `police`, `rescue`

**Response 201:**
```json
{ "message": "Vehicle registered.", "vehicle": { ... } }
```

---

### GET /vehicles *(Protected)*
Returns all vehicles. Optional filter: `?serviceType=fire`

**Response 200:**
```json
{ "vehicles": [ { "vehicle_id": "VH-F001", "status": "available", "current_latitude": 5.6037, ... } ] }
```

---

### GET /vehicles/nearest *(Protected)*
Find nearest available unit for an incident location.

**Query params:** `lat`, `lng`, `serviceType`

Example: `GET /vehicles/nearest?lat=5.6037&lng=-0.1870&serviceType=ambulance`

**Response 200:**
```json
{ "vehicle": { "vehicle_id": "VH-A002", "distance_km": 1.23, ... } }
```

---

### GET /vehicles/:id/location *(Protected)*
Returns current GPS coordinates of a vehicle.

**Response 200:**
```json
{
  "vehicleId":   "VH-F001",
  "latitude":    5.6037,
  "longitude":   -0.1870,
  "status":      "on_scene",
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

---

### Socket.IO Events (Port 3003)

**Client → Server** (push GPS from a device):
```js
socket.emit('vehicle:update_location', {
  vehicleId: 'VH-F001',
  latitude:  5.6037,
  longitude: -0.1870
});
```

**Server → All Clients** (broadcast updates):
```js
socket.on('vehicle:location_update', (data) => {
  // data: { vehicleId, latitude, longitude, timestamp }
});

socket.on('vehicle:status_update', (data) => {
  // data: { vehicleId, status, incidentId? }
});
```

---

## Analytics Service — Port 3004

### GET /analytics/response-times *(Protected)*
Average, min, and max response times per service type.

**Query:** `?days=30` (default: 30)

**Response 200:**
```json
{
  "period_days": 30,
  "data": [
    { "service_type": "ambulance", "avg_seconds": 245, "min_seconds": 120, "max_seconds": 610, "event_count": 8 },
    { "service_type": "fire",      "avg_seconds": 390, "min_seconds": 180, "max_seconds": 720, "event_count": 5 }
  ]
}
```

---

### GET /analytics/incidents-by-region *(Protected)*
Incident count grouped by region.

**Query:** `?days=30`

**Response 200:**
```json
{
  "period_days": 30,
  "data": [
    { "region": "Accra Central", "incident_count": 5 },
    { "region": "Kumasi",        "incident_count": 3 }
  ]
}
```

---

### GET /analytics/resource-utilization *(Protected)*
Events handled and average resolution time per service type.

**Query:** `?days=30`

**Response 200:**
```json
{
  "period_days": 30,
  "data": [
    { "service_type": "ambulance", "total_events": 8, "avg_resolution_minutes": 45.2 },
    { "service_type": "fire",      "total_events": 5, "avg_resolution_minutes": 90.0 }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{ "error": "Human-readable error message" }
```

| Code | Meaning |
|------|---------|
| 400 | Bad request / missing fields |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 500 | Internal server error |
