-- =============================================================
-- HOSPITALS TABLE — add to analytics-db.sql
-- Tracks hospital capacity for medical emergency routing
-- =============================================================

CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id           SERIAL PRIMARY KEY,
    name                  VARCHAR(150)    NOT NULL,
    region                VARCHAR(100),
    latitude              DECIMAL(10,7),
    longitude             DECIMAL(10,7),
    total_beds            INT             DEFAULT 0,
    available_beds        INT             DEFAULT 0,
    total_ambulances      INT             DEFAULT 0,
    available_ambulances  INT             DEFAULT 0,
    emergency_capacity    INT             DEFAULT 0,
    accepting_patients    BOOLEAN         DEFAULT TRUE,
    updated_at            TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_region ON hospitals(region);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals(latitude, longitude);

-- Seed data — hospitals across Ghana
INSERT INTO hospitals (name, region, latitude, longitude, total_beds, available_beds, total_ambulances, available_ambulances, emergency_capacity, accepting_patients)
VALUES
('Korle Bu Teaching Hospital',    'Accra Central',  5.5502, -0.2333, 2000, 320, 12, 5, 200, TRUE),
('37 Military Hospital',          'Accra East',     5.5997, -0.1834, 800,  145, 8,  4, 80,  TRUE),
('Komfo Anokye Teaching Hospital','Kumasi',          6.6885, -1.6244, 1200, 210, 10, 3, 120, TRUE),
('Cape Coast Teaching Hospital',  'Cape Coast',     5.1053, -1.2466, 600,  88,  6,  2, 60,  TRUE),
('Tamale Teaching Hospital',      'Tamale',          9.4008, -0.8393, 700,  160, 7,  4, 70,  TRUE),
('Ridge Hospital',                'Accra North',    5.5764, -0.1948, 500,  95,  5,  3, 50,  TRUE),
('Greater Accra Regional Hospital','Accra Central', 5.5573, -0.2070, 900,  75,  6,  1, 90,  FALSE),
('Effia-Nkwanta Hospital',        'Sekondi-Takoradi',4.9328,-1.7584, 450, 120, 4,  2, 45,  TRUE);
