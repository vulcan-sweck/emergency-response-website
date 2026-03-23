-- =============================================================
-- DISPATCH DATABASE SCHEMA
-- Emergency Response Coordination Platform
-- Tracks emergency vehicles, their GPS locations and status
-- =============================================================

DROP TABLE IF EXISTS location_history CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- =============================================================
-- VEHICLES TABLE
-- Represents all registered emergency response units
-- GPS coordinates updated in real-time via Socket.IO
-- =============================================================
CREATE TABLE vehicles (
    vehicle_id          VARCHAR(20)     PRIMARY KEY,  -- e.g. VH-F001, VH-A002
    name                VARCHAR(100)    NOT NULL,      -- Human-readable label
    service_type        VARCHAR(30)     NOT NULL CHECK (service_type IN (
                            'fire',
                            'ambulance',
                            'police',
                            'rescue'
                        )),
    current_latitude    DECIMAL(10, 7),
    current_longitude   DECIMAL(10, 7),
    status              VARCHAR(30)     NOT NULL DEFAULT 'available' CHECK (status IN (
                            'available',
                            'dispatched',
                            'on_scene',
                            'returning',
                            'maintenance'
                        )),
    assigned_incident   INT,                           -- References incidents.incident_id
    last_updated        TIMESTAMP       DEFAULT NOW(),
    registered_at       TIMESTAMP       DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_service_type    ON vehicles(service_type);
CREATE INDEX idx_vehicles_status          ON vehicles(status);
CREATE INDEX idx_vehicles_location        ON vehicles(current_latitude, current_longitude);

-- =============================================================
-- LOCATION HISTORY TABLE
-- Stores GPS breadcrumb trail for each vehicle
-- Used for route replay and analytics
-- =============================================================
CREATE TABLE location_history (
    history_id      SERIAL PRIMARY KEY,
    vehicle_id      VARCHAR(20)     NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    latitude        DECIMAL(10, 7)  NOT NULL,
    longitude       DECIMAL(10, 7)  NOT NULL,
    recorded_at     TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_location_history_vehicle   ON location_history(vehicle_id);
CREATE INDEX idx_location_history_time      ON location_history(recorded_at DESC);

-- =============================================================
-- SEED DATA — Demo fleet of emergency vehicles
-- =============================================================

INSERT INTO vehicles
    (vehicle_id, name, service_type, current_latitude, current_longitude, status, assigned_incident)
VALUES
('VH-F001', 'Fire Engine Alpha',     'fire',      5.6037, -0.1870, 'on_scene',    1),
('VH-F002', 'Fire Engine Bravo',     'fire',      5.5700, -0.2100, 'available',   NULL),
('VH-F003', 'Fire Ladder One',       'fire',      6.6885, -1.6244, 'available',   NULL),
('VH-F004', 'Fire Engine Kumasi',    'fire',      6.7102, -1.6350, 'returning',   5),
('VH-A001', 'Ambulance One',         'ambulance', 5.5900, -0.1950, 'available',   NULL),
('VH-A002', 'Ambulance Two',         'ambulance', 5.5502, -0.2174, 'dispatched',  2),
('VH-A003', 'Ambulance Three',       'ambulance', 5.1053, -1.2466, 'available',   NULL),
('VH-A005', 'Ambulance Cape Coast',  'ambulance', 5.1100, -1.2500, 'returning',   6),
('VH-A006', 'Ambulance Tamale',      'ambulance', 7.9465, -1.0232, 'dispatched',  8),
('VH-P001', 'Police Unit Alpha',     'police',    5.5950, -0.1880, 'available',   NULL),
('VH-P002', 'Police Unit Bravo',     'police',    5.6200, -0.2050, 'available',   NULL),
('VH-P003', 'Police Rapid Response', 'police',    5.6145, -0.2057, 'on_scene',    3);
