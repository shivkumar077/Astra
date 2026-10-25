-- ASTRA Multi-Destination Fleet Catalog & Destination Schema
-- Version: V3 (Multi-Destination Fleet Expansion & Durable Persistence)

-- 1. Add destination metadata columns to spacecraft_records
ALTER TABLE spacecraft_records ADD COLUMN IF NOT EXISTS destination VARCHAR(255);
ALTER TABLE spacecraft_records ADD COLUMN IF NOT EXISTS destination_group VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_spacecraft_dest_group ON spacecraft_records(destination_group);

-- 2. Idempotent Baseline Seeding for All 28 Spacecraft Records Across 5 Destination Groups

-- GROUP 1: EARTH ORBIT (6 vehicles)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'AURA-1', 'AURA-1', 'Aura-1 Earth Observation Platform', 'Earth Observation (SSO)', 1450.0, 280.0,
    'NOMINAL', 'NOMINAL', 94.5, 1280.0,
    7080.0, 0.0012, 98.2, 25.0, 90.0, 0.0,
    'Earth (Sun-Synchronous LEO, 702 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'AURA-1');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'TERRA-OBS', 'TERRA-OBS', 'Terra Multispectral Reconnaissance', 'LEO Reconnaissance', 980.0, 160.0,
    'SCIENCE_OPERATION', 'NOMINAL', 88.0, 1150.0,
    6880.0, 0.0008, 51.6, 120.0, 45.0, 60.0,
    'Earth (Low Earth Orbit, 502 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'TERRA-OBS');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'SOLIS-RELAY', 'SOLIS-RELAY', 'Solis High-Altitude Data Relay', 'HEO Comms Relay', 2100.0, 1250.0,
    'NOMINAL', 'NOMINAL', 99.0, 2400.0,
    24370.0, 0.72, 28.5, 200.0, 270.0, 0.0,
    'Earth (Highly Elliptical Orbit, 36,000 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'SOLIS-RELAY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'GEO-COM-4', 'GEO-COM-4', 'GeoCom-4 Equatorial Communications', 'Geostationary Relay', 2400.0, 1800.0,
    'NOMINAL', 'NOMINAL', 96.0, 4200.0,
    42164.0, 0.0002, 0.05, 110.0, 0.0, 180.0,
    'Earth (Geostationary Equatorial, 35,786 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'GEO-COM-4');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'NAV-STAR-09', 'NAV-STAR-09', 'NavStar-09 Precision Timing Beacon', 'MEO Navigation', 1600.0, 650.0,
    'NOMINAL', 'NOMINAL', 92.0, 2100.0,
    26560.0, 0.012, 55.0, 140.0, 60.0, 90.0,
    'Earth (Medium Earth Orbit, 20,200 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'NAV-STAR-09');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'DEBRIS-TRAC-2', 'DEBRIS-TRAC-2', 'DebrisTrac-2 Orbital Radar/Lidar', 'Orbital Debris Tracking', 750.0, 210.0,
    'SCIENCE_OPERATION', 'NOMINAL', 85.0, 950.0,
    7150.0, 0.002, 97.8, 45.0, 120.0, 210.0,
    'Earth (Polar LEO Lidar, 770 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'DEBRIS-TRAC-2');

-- GROUP 2: LUNAR EXPLORATION FLEET (6 vehicles)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'CHANDRA-ORB', 'CHANDRA-ORB', 'Chandra Lunar Ice Prospector', 'Lunar Polar Prospector', 680.0, 420.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.0, 850.0,
    68400.0, 0.04, 88.5, 10.0, 0.0, 45.0,
    'Lunar Polar Insertion (100 km orbit)', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'CHANDRA-ORB');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'LUNAR-HALO-1', 'LUNAR-HALO-1', 'Lunar Far-Side L2 Halo Relay', 'Lunar L2 Halo Relay', 1250.0, 840.0,
    'NOMINAL', 'NOMINAL', 95.0, 1850.0,
    65000.0, 0.18, 14.5, 30.0, 90.0, 120.0,
    'Earth-Moon L2 Halo Orbit', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'LUNAR-HALO-1');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'SELENA-MAPPER', 'SELENA-MAPPER', 'Selena Lunar Gravity Mapper', 'Lunar Geodesy Scout', 540.0, 220.0,
    'SCIENCE_OPERATION', 'NOMINAL', 89.5, 780.0,
    72000.0, 0.02, 86.2, 75.0, 45.0, 15.0,
    'Low Lunar Orbit (50 km Circular)', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'SELENA-MAPPER');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ARTEMIS-RELAY', 'ARTEMIS-RELAY', 'Artemis Surface Communications Node', 'Cislunar Comms Relay', 1850.0, 1100.0,
    'NOMINAL', 'NOMINAL', 97.2, 2200.0,
    54000.0, 0.15, 54.7, 210.0, 270.0, 0.0,
    'Near-Rectilinear Halo Orbit (NRHO)', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ARTEMIS-RELAY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'LUNAR-RECON-X', 'LUNAR-RECON-X', 'Lunar Reconnaissance Optical Scout', 'Surface Reconnaissance', 890.0, 310.0,
    'SCIENCE_OPERATION', 'NOMINAL', 84.0, 1100.0,
    62000.0, 0.05, 89.5, 15.0, 30.0, 240.0,
    'Lunar Equatorial Frozen Orbit', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'LUNAR-RECON-X');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'MOON-NAV-01', 'MOON-NAV-01', 'MoonNav Autonomous Timing Beacon', 'Cislunar Positioning', 720.0, 290.0,
    'NOMINAL', 'NOMINAL', 93.0, 950.0,
    75000.0, 0.015, 45.0, 180.0, 120.0, 60.0,
    'Cislunar Resonant Orbit (12-hour)', 'Lunar & Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'MOON-NAV-01');

-- GROUP 3: MARS EXPLORATION FLEET (6 vehicles)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ARES-ORBITER', 'ARES-ORBITER', 'Ares Mars Reconnaissance Orbiter', 'Mars Surface Spectrometer', 1050.0, 720.0,
    'SCIENCE_OPERATION', 'NOMINAL', 87.5, 950.0,
    37900.0, 0.003, 93.0, 50.0, 90.0, 0.0,
    'Mars (Areostationary & Polar Elliptical)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ARES-ORBITER');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'MARS-RELAY-1', 'MARS-RELAY-1', 'Mars Surface Telemetry Gateway', 'Areostationary Relay', 1420.0, 980.0,
    'NOMINAL', 'NOMINAL', 96.0, 1450.0,
    20428.0, 0.0005, 1.2, 160.0, 0.0, 180.0,
    'Areostationary Equatorial Orbit', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'MARS-RELAY-1');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'PHOBOS-SCOUT', 'PHOBOS-SCOUT', 'Phobos Co-Orbital Spectral Surveyor', 'Martian Moon Scout', 480.0, 240.0,
    'SCIENCE_OPERATION', 'NOMINAL', 90.2, 650.0,
    9376.0, 0.015, 1.08, 90.0, 30.0, 45.0,
    'Phobos Co-orbital Insertion (200 km)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'PHOBOS-SCOUT');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'DEIMOS-OBS', 'DEIMOS-OBS', 'Deimos Outer Moon Reconnaissance', 'Outer Moon Surveyor', 420.0, 190.0,
    'SCIENCE_OPERATION', 'NOMINAL', 92.5, 580.0,
    23460.0, 0.0002, 1.79, 210.0, 150.0, 90.0,
    'Deimos Reconnaissance Orbit', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'DEIMOS-OBS');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'MARS-ATMOS-4', 'MARS-ATMOS-4', 'Mars Aeronomy & Dust Sounder', 'Atmospheric Profiler', 650.0, 320.0,
    'SCIENCE_OPERATION', 'NOMINAL', 86.0, 820.0,
    18650.0, 0.045, 74.5, 115.0, 270.0, 30.0,
    'Mars Polar Aeronomy Orbit', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'MARS-ATMOS-4');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'AERO-MAP-02', 'AERO-MAP-02', 'AeroMap Polar Topography Scanner', 'Topography Lidar', 780.0, 380.0,
    'SCIENCE_OPERATION', 'NOMINAL', 89.0, 920.0,
    19820.0, 0.002, 92.8, 30.0, 45.0, 150.0,
    'Mars Sun-Synchronous Polar LMO', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'AERO-MAP-02');

-- GROUP 4: OUTER PLANETS FLEET (5 vehicles)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'JOVIAN-RAD-01', 'JOVIAN-RAD-01', 'Jovian Radiation Belt Environmental Monitor', 'Radiation Monitor', 1650.0, 1200.0,
    'SCIENCE_OPERATION', 'NOMINAL', 93.0, 680.0,
    42000.0, 0.08, 12.4, 40.0, 90.0, 0.0,
    'Jupiter (Radiation Belt Orbit)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'JOVIAN-RAD-01');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'EUROPA-CLIPPER-S', 'EUROPA-CLIPPER-S', 'Europa Ice Shell Sub-surface Radar', 'Europa Sub-surface Radar', 1980.0, 1450.0,
    'SCIENCE_OPERATION', 'NOMINAL', 96.5, 820.0,
    48500.0, 0.03, 85.0, 110.0, 45.0, 180.0,
    'Europa Surface Reconnaissance (100 km orbit)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'EUROPA-CLIPPER-S');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'CALLISTO-SURVEY', 'CALLISTO-SURVEY', 'Callisto Outer Jovian Magnetosphere Scout', 'Outer Jovian Scout', 1120.0, 780.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.0, 740.0,
    52000.0, 0.01, 45.0, 190.0, 0.0, 90.0,
    'Callisto Polar Orbit', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'CALLISTO-SURVEY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'CHRONOS-SATURN', 'CHRONOS-SATURN', 'Chronos Saturn Ring Dynamics Surveyor', 'Saturn Ring Dynamics', 2200.0, 1850.0,
    'SCIENCE_OPERATION', 'NOMINAL', 94.0, 520.0,
    60000.0, 0.05, 26.7, 80.0, 270.0, 30.0,
    'Saturn (Equatorial Ring Plane)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'CHRONOS-SATURN');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'TITAN-RELAY', 'TITAN-RELAY', 'Titan Atmospheric Explorer & Lake Relay', 'Titan Ocean/Atmos Relay', 1450.0, 920.0,
    'NOMINAL', 'NOMINAL', 98.0, 610.0,
    56000.0, 0.02, 62.0, 140.0, 180.0, 210.0,
    'Titan Polar Circular Orbit', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'TITAN-RELAY');

-- GROUP 5: SOLAR & DEEP SPACE FLEET (5 vehicles)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'HELIOS-CORONA', 'HELIOS-CORONA', 'Helios Solar Magnetic Coronal Observatory', 'Solar Corona Observer', 890.0, 640.0,
    'SCIENCE_OPERATION', 'NOMINAL', 98.5, 3400.0,
    32000.0, 0.35, 7.2, 0.0, 0.0, 0.0,
    'Heliospheric Orbit (0.3 AU perihelion)', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'HELIOS-CORONA');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'SOLAR-STORM-01', 'SOLAR-STORM-01', 'Solar Storm L1 Early Warning Sentinel', 'Space Weather Sentinel', 1150.0, 520.0,
    'NOMINAL', 'NOMINAL', 97.0, 2800.0,
    45000.0, 0.02, 1.5, 30.0, 90.0, 180.0,
    'Sun-Earth L1 Lagrange Orbit', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'SOLAR-STORM-01');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ASTEROID-SCOUT', 'ASTEROID-SCOUT', 'Main Asteroid Belt Mineral Spectrometer', 'Asteroid Belt Scout', 620.0, 480.0,
    'SCIENCE_OPERATION', 'NOMINAL', 90.0, 750.0,
    58000.0, 0.22, 10.5, 120.0, 45.0, 90.0,
    'Main Asteroid Belt (2.7 AU)', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ASTEROID-SCOUT');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'DEEP-NAV-1', 'DEEP-NAV-1', 'Deep Space Autonomous Optical Navigation', 'Deep Space Navigation', 780.0, 550.0,
    'NOMINAL', 'NOMINAL', 93.5, 880.0,
    64000.0, 0.15, 3.8, 200.0, 180.0, 30.0,
    'Interplanetary Transfer Trajectory', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'DEEP-NAV-1');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'VOYAGER-EXP', 'VOYAGER-EXP', 'Interstellar Heliopause Boundary Explorer', 'Interstellar Boundary Probe', 950.0, 680.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.5, 420.0,
    78000.0, 0.40, 35.0, 270.0, 90.0, 240.0,
    'Interstellar Heliopause Boundary', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'VOYAGER-EXP');

-- 3. Update existing records with destinations if they were created earlier without them
UPDATE spacecraft_records SET destination = 'Earth (Sun-Synchronous LEO, 702 km)', destination_group = 'Earth' WHERE id = 'AURA-1' AND (destination IS NULL OR destination_group IS NULL);
UPDATE spacecraft_records SET destination = 'Earth (Low Earth Orbit, 502 km)', destination_group = 'Earth' WHERE id = 'TERRA-OBS' AND (destination IS NULL OR destination_group IS NULL);
UPDATE spacecraft_records SET destination = 'Earth (Highly Elliptical Orbit, 36,000 km)', destination_group = 'Earth' WHERE id = 'SOLIS-RELAY' AND (destination IS NULL OR destination_group IS NULL);
