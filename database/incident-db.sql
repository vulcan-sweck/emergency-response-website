-- =============================================================
-- INCIDENT DATABASE SCHEMA
-- Emergency Response Coordination Platform
-- Manages emergency incident reports and assignments
-- =============================================================

DROP TABLE IF EXISTS incidents CASCADE;

-- =============================================================
-- INCIDENTS TABLE
-- Core table tracking all emergency events from creation
-- through dispatch, response, and resolution
-- =============================================================
CREATE TABLE incidents (
    incident_id         SERIAL PRIMARY KEY,
    citizen_name        VARCHAR(100)    NOT NULL,
    incident_type       VARCHAR(50)     NOT NULL CHECK (incident_type IN (
                            'fire',
                            'medical',
                            'crime',
                            'accident',
                            'natural_disaster',
                            'other'
                        )),
    latitude            DECIMAL(10, 7)  NOT NULL,
    longitude           DECIMAL(10, 7)  NOT NULL,
    notes               TEXT,
    created_by_admin    INT             NOT NULL,   -- References users.user_id in auth-db
    assigned_unit       VARCHAR(50),                -- Vehicle ID from dispatch-db
    status              VARCHAR(30)     NOT NULL DEFAULT 'created' CHECK (status IN (
                            'created',
                            'dispatched',
                            'in_progress',
                            'resolved'
                        )),
    region              VARCHAR(100),               -- Derived city/district name
    resolved_at         TIMESTAMP,
    created_at          TIMESTAMP       DEFAULT NOW(),
    updated_at          TIMESTAMP       DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_incidents_status         ON incidents(status);
CREATE INDEX idx_incidents_type           ON incidents(incident_type);
CREATE INDEX idx_incidents_region         ON incidents(region);
CREATE INDEX idx_incidents_created_by     ON incidents(created_by_admin);
CREATE INDEX idx_incidents_created_at     ON incidents(created_at DESC);

-- Spatial index for nearest-responder calculations
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);

-- =============================================================
-- SEED DATA — Sample incidents across Ghana for demo
-- =============================================================

INSERT INTO incidents
    (citizen_name, incident_type, latitude, longitude, notes, created_by_admin, assigned_unit, status, region)
VALUES
(
    'Kwame Asante',
    'fire',
    5.6037, -0.1870,
    'Warehouse fire spreading to neighbouring buildings. Smoke visible from distance.',
    1, 'VH-F001', 'in_progress', 'Accra Central'
),
(
    'Abena Mensah',
    'medical',
    5.5502, -0.2174,
    'Elderly woman collapsed at market. Unresponsive.',
    1, 'VH-A002', 'dispatched', 'Kaneshie'
),
(
    'Yaw Darko',
    'crime',
    5.6145, -0.2057,
    'Armed robbery at petrol station. Suspects fled on motorbike.',
    3, 'VH-P003', 'in_progress', 'Dansoman'
),
(
    'Efua Boateng',
    'accident',
    5.5993, -0.1684,
    'Multi-vehicle collision on highway. At least 3 injured.',
    1, NULL, 'created', 'Tema Motorway'
),
(
    'Kofi Otieku',
    'fire',
    6.6885, -1.6244,
    'Bushfire approaching residential area.',
    4, 'VH-F004', 'resolved', 'Kumasi'
),
(
    'Akosua Frimpong',
    'medical',
    5.1053, -1.2466,
    'Pregnant woman in labour, no transport available.',
    5, 'VH-A005', 'resolved', 'Cape Coast'
),
(
    'Emmanuel Tetteh',
    'natural_disaster',
    5.5564, -0.1969,
    'Flooding in low-lying area. Families trapped on rooftops.',
    1, NULL, 'created', 'Accra East'
),
(
    'Patience Owusu',
    'medical',
    7.9465, -1.0232,
    'Child with high fever and seizures.',
    2, 'VH-A006', 'dispatched', 'Tamale'
);
