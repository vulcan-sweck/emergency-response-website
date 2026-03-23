-- =============================================================
-- ANALYTICS DATABASE SCHEMA
-- Emergency Response Coordination Platform
-- Stores computed metrics and event logs for dashboard reporting
-- =============================================================

DROP TABLE IF EXISTS analytics_events CASCADE;

-- =============================================================
-- ANALYTICS EVENTS TABLE
-- Each row represents one completed incident response cycle.
-- Populated by the analytics service when an incident resolves.
-- =============================================================
CREATE TABLE analytics_events (
    event_id            SERIAL PRIMARY KEY,
    incident_id         INT             NOT NULL,           -- References incident-db
    response_time       INT             NOT NULL,           -- Seconds from creation to dispatch
    resolution_time     INT,                                -- Seconds from creation to resolved
    region              VARCHAR(100)    NOT NULL,
    service_type        VARCHAR(30)     NOT NULL CHECK (service_type IN (
                            'fire', 'ambulance', 'police', 'rescue'
                        )),
    incident_type       VARCHAR(50)     NOT NULL,
    outcome             VARCHAR(30)     DEFAULT 'resolved',
    timestamp           TIMESTAMP       DEFAULT NOW()
);

-- Indexes for dashboard query performance
CREATE INDEX idx_analytics_region        ON analytics_events(region);
CREATE INDEX idx_analytics_service       ON analytics_events(service_type);
CREATE INDEX idx_analytics_incident_type ON analytics_events(incident_type);
CREATE INDEX idx_analytics_timestamp     ON analytics_events(timestamp DESC);

-- =============================================================
-- SEED DATA — Sample resolved events for demo charts
-- =============================================================

INSERT INTO analytics_events
    (incident_id, response_time, resolution_time, region, service_type, incident_type, timestamp)
VALUES
(5,  312,  5400, 'Kumasi',          'fire',      'fire',             NOW() - INTERVAL '2 days'),
(6,  180,  2700, 'Cape Coast',      'ambulance', 'medical',          NOW() - INTERVAL '3 days'),
(1,  420,  NULL, 'Accra Central',   'fire',      'fire',             NOW() - INTERVAL '1 hour'),
(2,  250,  NULL, 'Kaneshie',        'ambulance', 'medical',          NOW() - INTERVAL '30 min'),
(3,  370,  NULL, 'Dansoman',        'police',    'crime',            NOW() - INTERVAL '45 min'),
-- Historical data for charts
(7,  290, 4800, 'Accra Central',  'ambulance', 'medical',          NOW() - INTERVAL '7 days'),
(8,  500, 7200, 'Accra East',     'fire',      'fire',             NOW() - INTERVAL '6 days'),
(9,  210, 3600, 'Kumasi',         'police',    'crime',            NOW() - INTERVAL '5 days'),
(10, 330, 4200, 'Tamale',         'ambulance', 'medical',          NOW() - INTERVAL '4 days'),
(11, 610, 9000, 'Accra Central',  'fire',      'natural_disaster', NOW() - INTERVAL '3 days'),
(12, 180, 2400, 'Cape Coast',     'police',    'accident',         NOW() - INTERVAL '2 days'),
(13, 270, 3900, 'Kaneshie',       'ambulance', 'medical',          NOW() - INTERVAL '1 day'),
(14, 460, 6300, 'Kumasi',         'fire',      'fire',             NOW() - INTERVAL '12 hours'),
(15, 140, 1800, 'Accra Central',  'police',    'crime',            NOW() - INTERVAL '8 hours'),
(16, 390, 5100, 'Dansoman',       'ambulance', 'accident',         NOW() - INTERVAL '4 hours');
