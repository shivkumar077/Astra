-- ASTRA Content Expansion: Spacecraft Fleet & Mission Library Expansion
-- Version: V4 (Expand Fleet to 52 Spacecraft & Catalogue to 45 Mission Definitions Across 6 Destination Groups)

-- 1. Normalize existing spacecraft destination groups
UPDATE spacecraft_records SET destination_group = 'Deep Space' WHERE id IN ('ASTEROID-SCOUT', 'DEEP-NAV-1', 'VOYAGER-EXP');
UPDATE spacecraft_records SET destination_group = 'Solar' WHERE id IN ('HELIOS-CORONA', 'SOLAR-STORM-01');

-- 2. Insert 24 New Spacecraft Records (4 per destination group across all 6 groups)

-- GROUP 1: EARTH ORBIT (4 new vehicles: HELIOS-OBS, MERIDIAN-RELAY, VIGIL-TRACK, STRATUS-MET)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'HELIOS-OBS', 'HELIOS-OBS', 'HELIOS-OBS Earth Observation & Multispectral Sweep', 'Earth Observation (SSO)', 1520.0, 290.0,
    'SCIENCE_OPERATION', 'NOMINAL', 95.0, 1450.0,
    7088.0, 0.0011, 98.3, 35.0, 90.0, 45.0,
    'Earth (Sun-Synchronous Polar LEO, 710 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'HELIOS-OBS');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'MERIDIAN-RELAY', 'MERIDIAN-RELAY', 'Meridian-Relay High-Throughput Comms Platform', 'MEO Comms Relay', 1950.0, 1100.0,
    'NOMINAL', 'NOMINAL', 96.5, 3100.0,
    26560.0, 0.010, 55.0, 190.0, 60.0, 120.0,
    'Earth (Medium Earth Orbit, 20,200 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'MERIDIAN-RELAY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'VIGIL-TRACK', 'VIGIL-TRACK', 'Vigil-Track Orbital Debris Radar/Lidar', 'Orbital Debris Tracking', 820.0, 230.0,
    'SCIENCE_OPERATION', 'NOMINAL', 89.0, 1020.0,
    7128.0, 0.0018, 98.0, 60.0, 110.0, 180.0,
    'Earth (Polar LEO Lidar Tracking, 750 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'VIGIL-TRACK');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'STRATUS-MET', 'STRATUS-MET', 'Stratus-Met Atmospheric & Weather Monitor', 'Atmospheric / Weather Monitor', 1100.0, 310.0,
    'NOMINAL', 'NOMINAL', 93.0, 1200.0,
    7028.0, 0.0025, 63.4, 15.0, 270.0, 10.0,
    'Earth (Inclined LEO Weather Sounder, 650 km)', 'Earth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'STRATUS-MET');

-- GROUP 2: LUNAR EXPLORATION (4 new vehicles: SELENE-MAP, POLARIS-LR, LUNA-LINK, ARGUS-LNAV)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'SELENE-MAP', 'SELENE-MAP', 'Selene-Map Lunar Surface & Polar Mapper', 'Lunar Polar Prospector', 710.0, 440.0,
    'SCIENCE_OPERATION', 'NOMINAL', 94.0, 890.0,
    1837.0, 0.0010, 90.0, 15.0, 0.0, 45.0,
    'Moon (Low Lunar Polar Orbit, 100 km)', 'Lunar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'SELENE-MAP');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'POLARIS-LR', 'POLARIS-LR', 'Polaris-LR Lunar Polar Volatiles Prospector', 'Lunar Resource Prospector', 690.0, 410.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.0, 780.0,
    1802.0, 0.0190, 86.2, 45.0, 90.0, 120.0,
    'Moon (Frozen Polar Elliptical, 100x30 km)', 'Lunar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'POLARIS-LR');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'LUNA-LINK', 'LUNA-LINK', 'Luna-Link Farside Halo Comms Relay', 'Lunar Communications Relay', 1180.0, 820.0,
    'NOMINAL', 'NOMINAL', 98.0, 1600.0,
    64500.0, 0.0800, 14.5, 90.0, 180.0, 0.0,
    'Moon-Earth L2 Halo Orbit (Farside Relay)', 'Lunar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'LUNA-LINK');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ARGUS-LNAV', 'ARGUS-LNAV', 'Argus-LNav Orbital Survey & PNT Beacon', 'Lunar Navigation / Survey', 840.0, 530.0,
    'NOMINAL', 'NOMINAL', 93.0, 980.0,
    1812.0, 0.0138, 54.0, 120.0, 60.0, 240.0,
    'Moon (Frozen Eccentric Survey Orbit)', 'Lunar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ARGUS-LNAV');

-- GROUP 3: MARS EXPLORATION (4 new vehicles: AREION-RECON, AETHER-MET, DEIMOS-RELAY, BOREALIS-MAP)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'AREION-RECON', 'AREION-RECON', 'Areion-Recon High-Resolution Mars Orbiter', 'Mars Reconnaissance Orbiter', 1080.0, 720.0,
    'SCIENCE_OPERATION', 'NOMINAL', 95.0, 1100.0,
    3676.0, 0.008, 92.8, 110.0, 270.0, 30.0,
    'Mars (Sun-Synchronous Science Orbit, 280 km)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'AREION-RECON');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'AETHER-MET', 'AETHER-MET', 'Aether-Met Mars Atmospheric Profiler', 'Mars Atmospheric Sounder', 760.0, 480.0,
    'SCIENCE_OPERATION', 'NOMINAL', 89.0, 780.0,
    5120.0, 0.280, 74.0, 45.0, 90.0, 150.0,
    'Mars (Atmospheric Sounding Elliptical, 250x3200 km)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'AETHER-MET');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'DEIMOS-RELAY', 'DEIMOS-RELAY', 'Deimos-Relay Surface UHF Data Relay', 'Mars Surface Support Relay', 920.0, 640.0,
    'NOMINAL', 'NOMINAL', 97.0, 940.0,
    23460.0, 0.0005, 1.8, 80.0, 0.0, 90.0,
    'Mars (Deimos Co-Orbital Stationary Relay, 23,460 km)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'DEIMOS-RELAY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'BOREALIS-MAP', 'BOREALIS-MAP', 'Borealis-Map Martian Polar Cap Surveyor', 'Mars Polar Surveyor', 810.0, 510.0,
    'SCIENCE_OPERATION', 'NOMINAL', 92.5, 840.0,
    3716.0, 0.002, 89.0, 160.0, 45.0, 210.0,
    'Mars (Low Circular Polar Mapping, 320 km)', 'Mars', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'BOREALIS-MAP');

-- GROUP 4: OUTER PLANETS (4 new vehicles: JOVE-SCOPE, ION-GUARD, TITAN-ORBIT, RHEA-SURVEY)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'JOVE-SCOPE', 'JOVE-SCOPE', 'Jove-Scope Jovian Magnetosphere Explorer', 'Jovian Magnetosphere Explorer', 1350.0, 1150.0,
    'SCIENCE_OPERATION', 'NOMINAL', 93.0, 520.0,
    850000.0, 0.65, 11.2, 70.0, 180.0, 30.0,
    'Jupiter (Highly Elliptical Jovian Magnetosphere Orbit)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'JOVE-SCOPE');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ION-GUARD', 'ION-GUARD', 'Ion-Guard Radiation Hardened Biosampler', 'Radiation-Hardened Probe', 990.0, 780.0,
    'NOMINAL', 'NOMINAL', 96.0, 460.0,
    670900.0, 0.04, 4.5, 150.0, 60.0, 180.0,
    'Jupiter System (Europa/Ganymede Resonance Orbit)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ION-GUARD');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'TITAN-ORBIT', 'TITAN-ORBIT', 'Titan-Orbit Synthetic Aperture Radar Sentinel', 'Titan Orbital Sentinel', 1520.0, 1020.0,
    'SCIENCE_OPERATION', 'NOMINAL', 94.0, 590.0,
    3775.0, 0.012, 88.5, 95.0, 90.0, 45.0,
    'Titan (Polar Radar Mapping Orbit, 1,200 km)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'TITAN-ORBIT');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'RHEA-SURVEY', 'RHEA-SURVEY', 'Rhea-Survey Saturnian Icy Moon Observer', 'Outer-Planet Moon Surveyor', 1120.0, 830.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.0, 540.0,
    527000.0, 0.001, 0.4, 210.0, 0.0, 270.0,
    'Saturn (Equatorial Ring & Moon Transit Orbit)', 'Outer Planets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'RHEA-SURVEY');

-- GROUP 5: SOLAR ENVIRONMENT (4 new vehicles: HELIO-WATCH, CORONA-TRACE, STORM-SENTINEL, FLARE-ALERT)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'HELIO-WATCH', 'HELIO-WATCH', 'Helio-Watch Solar Dynamics & Magnetic Observatory', 'Solar Dynamics Observatory', 920.0, 590.0,
    'SCIENCE_OPERATION', 'NOMINAL', 99.0, 4800.0,
    108000.0, 0.12, 3.4, 45.0, 180.0, 0.0,
    'Sun (Inner Heliospheric Orbit, 0.72 AU)', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'HELIO-WATCH');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'CORONA-TRACE', 'CORONA-TRACE', 'Corona-Trace Extreme Coronal Streamer Sounder', 'Solar Corona Sounder', 860.0, 620.0,
    'SCIENCE_OPERATION', 'NOMINAL', 97.5, 3900.0,
    18000.0, 0.78, 5.8, 15.0, 0.0, 0.0,
    'Sun (Solar Perihelion Skim Orbit, 0.08 AU)', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'CORONA-TRACE');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'STORM-SENTINEL', 'STORM-SENTINEL', 'Storm-Sentinel L1 Real-Time Space Weather Guard', 'Space Weather Sentinel', 1180.0, 560.0,
    'NOMINAL', 'NOMINAL', 98.0, 2900.0,
    46000.0, 0.015, 1.2, 10.0, 90.0, 90.0,
    'Sun-Earth L1 Lagrange Halo Orbit', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'STORM-SENTINEL');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'FLARE-ALERT', 'FLARE-ALERT', 'Flare-Alert Solar Chromosphere Burst Monitor', 'Solar Flare Monitor', 790.0, 480.0,
    'SCIENCE_OPERATION', 'NOMINAL', 96.0, 3100.0,
    149600.0, 0.005, 2.0, 60.0, 0.0, 60.0,
    'Sun-Earth L5 Lagrange Orbit (Early Warning)', 'Solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'FLARE-ALERT');

-- GROUP 6: DEEP SPACE (4 new vehicles: ODYSSEY-NAV, VOYAGER-RELAY, KEPLER-DRIFT, FARPOINT-PROBE)
INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'ODYSSEY-NAV', 'ODYSSEY-NAV', 'Odyssey-Nav Autonomous Deep-Space Navigator', 'Deep Space Navigation', 840.0, 620.0,
    'NOMINAL', 'NOMINAL', 95.0, 890.0,
    374000.0, 0.16, 3.2, 130.0, 180.0, 45.0,
    'Deep Space (Interplanetary Cruise Trajectory, 2.5 AU)', 'Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'ODYSSEY-NAV');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'VOYAGER-RELAY', 'VOYAGER-RELAY', 'Voyager-Relay Ultra-Long-Baseline Telemetry Node', 'Long-Range Telemetry Relay', 1420.0, 980.0,
    'NOMINAL', 'NOMINAL', 92.0, 380.0,
    5236000.0, 0.38, 18.5, 260.0, 90.0, 180.0,
    'Deep Space (Heliocentric Long-Range Relay, 35.0 AU)', 'Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'VOYAGER-RELAY');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'KEPLER-DRIFT', 'KEPLER-DRIFT', 'Kepler-Drift Interplanetary Astrometry Calibrator', 'Astrometry / Calibration Drift', 890.0, 510.0,
    'SCIENCE_OPERATION', 'NOMINAL', 94.5, 920.0,
    209440.0, 0.08, 4.1, 80.0, 45.0, 90.0,
    'Deep Space (Heliocentric Navigation Calibration Drift, 1.4 AU)', 'Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'KEPLER-DRIFT');

INSERT INTO spacecraft_records (
    id, call_sign, name, model_type, dry_mass_kg, propellant_mass_kg,
    operational_mode, operational_status, battery_soc_percent, solar_array_watts,
    semi_major_axis_km, eccentricity, inclination_deg, raan_deg, arg_of_perigee_deg, true_anomaly_deg,
    destination, destination_group, created_at, updated_at
)
SELECT
    'FARPOINT-PROBE', 'FARPOINT-PROBE', 'Farpoint-Probe Long-Duration Interstellar Scout', 'Interstellar Boundary Probe', 960.0, 750.0,
    'SCIENCE_OPERATION', 'NOMINAL', 91.0, 310.0,
    9724000.0, 0.44, 32.0, 310.0, 120.0, 240.0,
    'Deep Space (Interstellar Heliopause Escape Trajectory, 65.0 AU)', 'Deep Space', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM spacecraft_records WHERE id = 'FARPOINT-PROBE');

-- 3. Normalize existing mission definitions destination groups
UPDATE mission_definitions SET destination_group = 'Deep Space' WHERE id IN ('ASTEROID-REDIRECT-SIM', 'DEEP-SPACE-SURVIVAL', 'INTERSTELLAR-TRAJECTORY-CAL');
UPDATE mission_definitions SET destination_group = 'Solar' WHERE id IN ('SOLAR-MINIMUM-SURVEY', 'CORONAL-MASS-EJECTION-SIM', 'SOLAR-PROBE-HEAT-SHIELD');

-- 4. Insert 24 New Distinct Mission Definitions (4 per destination group across all 6 groups)

-- EARTH ORBIT (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'EARTH-SURVEY-HIGHRES',
    'High-Resolution Multispectral Earth Surface & Thermal Sweep',
    'Earth (Sun-Synchronous Polar LEO, 710 km)',
    'Earth',
    'EARTH_OBSERVATION',
    'STANDARD',
    'HELIOS-OBS',
    50,
    'MODERATE',
    'Deploy high-resolution optical imager across day-night terminator. Verify multispectral band calibrations and Nadir sensor precision during rapid thermal transitions.',
    '["Maintain pointing error <= 0.04° along polar orbit track","Verify battery SOC remains >= 78% through eclipse","Capture and downlink 16 calibrated spectral frames"]',
    '["Terminator optical sweep completed with zero dropped frames","Spacecraft status remains NOMINAL"]',
    '["Radiator temperature <= +38.0°C","Max eclipse duration: 34 minutes"]',
    TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-SURVEY-HIGHRES');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'EARTH-DEBRIS-VIGIL',
    'Orbital Debris Tracking & Conjunction Avoidance Alert',
    'Earth (Polar LEO Lidar Tracking, 750 km)',
    'Earth',
    'ORBITAL_SAFETY',
    'CHALLENGING',
    'VIGIL-TRACK',
    40,
    'HIGH',
    'Track non-cooperative derelict rocket upper stage entering close proximity sphere. Calculate collision probability and verify emergency cold-gas avoidance readiness.',
    '["Track secondary object laser rangefinder return for 15 minutes","Confirm miss distance clearance >= 2.0 km","Maintain spacecraft telemetry lock with ground stations"]',
    '["Zero debris impact alerts unresolved","Propellant mass reserve intact >= 180 kg"]',
    '["High orbital inclination debris corridor","No thruster firing while payload sensors active"]',
    TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-DEBRIS-VIGIL');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'EARTH-RELAY-RESILIENCE',
    'MEO Communications Relay Resilience & Crosslink Trial',
    'Earth (Medium Earth Orbit, 20,200 km)',
    'Earth',
    'COMMUNICATIONS_RECOVERY',
    'STANDARD',
    'MERIDIAN-RELAY',
    60,
    'MODERATE',
    'Conduct sustained high-throughput crosslink data transfer trial across multiple LEO user constellations. Test automated carrier recovery under simulated radiation belt noise.',
    '["Establish dual-frequency Ka-band crosslink with simulated LEO platforms","Sustain 1.2 Gbps data throughput for 45 minutes","Re-acquire carrier lock within 5 seconds after simulated Van Allen belt interference"]',
    '["Bit error rate remains below 10^-8 across test duration","Downlink buffer utilization remains below 85%"]',
    '["Van Allen belt radiation flux limits payload duty cycle to 80%","Solar array pointing error <= 1.0°"]',
    TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-RELAY-RESILIENCE');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'EARTH-SOLAR-IMPACT',
    'Atmospheric Drag Surge & Severe Space Weather Response',
    'Earth (Inclined LEO Weather Sounder, 650 km)',
    'Earth',
    'THERMAL_MANAGEMENT',
    'CHALLENGING',
    'STRATUS-MET',
    55,
    'HIGH',
    'Evaluate thermospheric density expansion during simulated coronal mass ejection arrival. Execute altitude maintenance burn and safe-hold electrical power reconfiguration.',
    '["Detect atmospheric drag acceleration exceeding 0.05 m/s²","Execute autonomous RCS drag compensation impulse burn","Reorient solar arrays to minimize aerodynamic torque during perigee passage"]',
    '["Orbital altitude decay held to less than 150 meters","Battery SOC stays above 75% throughout storm passage"]',
    '["Propellant consumption must not exceed 8.5 kg","Aerodynamic cross-section must be kept within minimum envelope"]',
    TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-SOLAR-IMPACT');

-- LUNAR (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'LUNAR-SOUTH-POLE-ILLUM',
    'Lunar South Pole Shackleton Crater Illumination Sweep',
    'Moon (Low Lunar Polar Orbit, 100 km)',
    'Lunar',
    'PLANETARY_RECONNAISSANCE',
    'STANDARD',
    'SELENE-MAP',
    65,
    'MODERATE',
    'High-resolution multi-angle topographic survey of permanently shadowed regions inside Shackleton Crater rim. Map continuous solar illumination peaks for future surface assets.',
    '["Acquire 400 continuous stereo frames of Shackleton and Faustini crater rims","Maintain lunar nadir vector alignment within 0.03°","Correlate solar illumination fraction with digital elevation model"]',
    '["Stereo coverage of south polar zone >= 98%","Attitude control drift within standard deadband"]',
    '["Thermal extremes during transition into lunar shadow (-180°C)","No direct Earth communication during farside segment"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-SOUTH-POLE-ILLUM');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'LUNAR-POLAR-VOLATILES',
    'Lunar Permanently Shadowed Region Hydrogen Volatile Prospecting',
    'Moon (Frozen Polar Elliptical, 100x30 km)',
    'Lunar',
    'PLANETARY_RECONNAISSANCE',
    'CHALLENGING',
    'POLARIS-LR',
    75,
    'HIGH',
    'Conduct periapsis low-pass sweeps (30 km above lunar south pole) using pulsed neutron spectrometer to detect epithermal neutron suppression signatures indicative of subsurface water ice.',
    '["Perform periapsis altitude trim to exactly 30 km ± 1.5 km","Activate neutron spectrometer over Cabeus and Shoemaker craters","Measure epithermal neutron flux reduction with statistical significance > 5 sigma"]',
    '["Hydrogen concentration map generated for target craters","Spacecraft successfully completes periselene passage without altitude loss"]',
    '["Low altitude lunar mascon perturbations require active orbit trimming","Battery operations restricted during 45-minute polar shadow passages"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-POLAR-VOLATILES');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'LUNAR-RELAY-NETWORK',
    'Farside Lunar Halo Communications Availability & Handover Trial',
    'Moon-Earth L2 Halo Orbit (Farside Relay)',
    'Lunar',
    'COMMUNICATIONS_RECOVERY',
    'STANDARD',
    'LUNA-LINK',
    60,
    'LOW',
    'Verify uninterrupted UHF/S-band relay link continuity between simulated lunar farside south polar lander and Earth Deep Space Network ground stations.',
    '["Acquire automated beacon signal from simulated farside lander at 401 MHz","Establish 50 Mbps Ka-band return link to Earth Goldstone tracking station","Execute smooth relay handover to secondary orbiter without dropped packets"]',
    '["End-to-end telemetry packet loss < 0.01%","Relay contact sustained for minimum 45 continuous minutes"]',
    '["Halo orbit station-keeping deadband ± 500 km","Spacecraft solar array must maintain 90° sun-aspect angle"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-RELAY-NETWORK');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'LUNAR-ORBIT-NAV-CAL',
    'Lunar Positioning System Beacon Calibration & Triangulation',
    'Moon (Frozen Eccentric Survey Orbit)',
    'Lunar',
    'PAYLOAD_CALIBRATION',
    'STANDARD',
    'ARGUS-LNAV',
    50,
    'LOW',
    'Broadcast multi-channel pseudorange timing signals to calibrate lunar surface positioning and surface asset rendezvous corridors.',
    '["Synchronize onboard atomic clock reference with Earth master time to < 3 nanoseconds","Transmit calibrated L-band navigation signals across 60° lunar longitude corridor","Verify surface receiver positioning error estimate <= 5.0 meters"]',
    '["Timing drift error remains < 0.5 ns/hour","Ephemeris determination error < 1.0 meter 3D RMS"]',
    '["Doppler shift compensation during rapid periapsis passage","RF transmitter power draw <= 450 Watts"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-ORBIT-NAV-CAL');

-- MARS (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'MARS-DUST-STORM',
    'Planet-Encircling Martian Dust Storm Optical Opacity Profiling',
    'Mars (Sun-Synchronous Science Orbit, 280 km)',
    'Mars',
    'PLANETARY_RECONNAISSANCE',
    'STANDARD',
    'AREION-RECON',
    60,
    'MODERATE',
    'Track onset and global propagation of high-opacity dust storm front across Chryse Planitia and Valles Marineris. Monitor atmospheric thermal structure.',
    '["Map optical depth tau values across 360° Martian longitude corridor","Capture limb-sounding infrared thermal profiles from 10 km to 80 km altitude","Calculate solar flux attenuation at surface rover operating coordinates"]',
    '["Global atmospheric dust opacity map delivered with 2 km spatial resolution","Spacecraft bus temperature remains within nominal bounds"]',
    '["Optical camera lens heaters must remain active","Solar power output reduction by up to 25% due to atmospheric backscatter"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-DUST-STORM');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'MARS-POLAR-ICE-CAP',
    'Planum Boreum Stratified Ice Layer Subsurface Radar Sounding',
    'Mars (Low Circular Polar Mapping, 320 km)',
    'Mars',
    'PLANETARY_RECONNAISSANCE',
    'CHALLENGING',
    'BOREALIS-MAP',
    70,
    'MODERATE',
    'Deploy shallow subsurface radar to penetrate CO2 and water ice cap strata at Planum Boreum. Map climate cycle layering down to 1.5 km depth.',
    '["Deploy 10-meter radar dipole antenna perpendicular to flight vector","Acquire 25 radar tracks across polar cap spiraled chasms","Resolve internal dielectric boundaries with 15-meter vertical resolution"]',
    '["Subsurface layer echo profile generated for all 25 orbital tracks","Attitude deadband error <= 0.05° throughout radar sounding pass"]',
    '["Polar eclipse durations up to 48 minutes","Radar pulse duty cycle limited to 15 minutes per orbit to conserve power"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-POLAR-ICE-CAP');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'MARS-TRACE-GAS',
    'Atmospheric Trace Gas Limb Occultation & Methane Detection Sweep',
    'Mars (Atmospheric Sounding Elliptical, 250x3200 km)',
    'Mars',
    'PLANETARY_RECONNAISSANCE',
    'STANDARD',
    'AETHER-MET',
    80,
    'LOW',
    'Conduct solar occultation infrared spectroscopy through the Martian atmosphere during sunrise and sunset transitions to detect trace methane and water vapor plumes.',
    '["Lock spectrometer optical axis onto solar disc during atmospheric occultation entry","Acquire 120 transmission spectra between 5 km and 60 km altitude","Achieve methane detection sensitivity threshold of 50 parts per trillion"]',
    '["Occultation spectral dataset acquired without pointing loss","Spectrometer cryocooler temperature maintained <= 65 Kelvin"]',
    '["Occultation window lasts only 3.5 minutes per orbit","Sun-pointing alignment must be acquired within 15 seconds of orbital sunrise"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-TRACE-GAS');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'MARS-ROVER-RECOVERY',
    'Surface Rover-to-Orbiter Emergency UHF Communications Recovery',
    'Mars (Areostationary Relay Orbit, 17,032 km)',
    'Mars',
    'COMMUNICATIONS_RECOVERY',
    'CRITICAL',
    'DEIMOS-RELAY',
    85,
    'SEVERE',
    'A simulated surface exploration rover fails to check in during scheduled direct-to-Earth pass. Reposition areostationary relay dish, perform wide-angle beacon sweep, and re-establish link.',
    '["Slew high-gain parabolic reflector toward emergency rover coordinates","Perform multi-channel UHF beacon acquisition sweep","Recover corrupted rover telemetry frames and stage emergency uplink telecommand","Verify rover battery recovery status and confirm bidirectional link"]',
    '["Rover emergency telemetry stream successfully locked and verified","Comms subsystem reports NOMINAL carrier tracking"]',
    '["Tight link budget margin at areostationary altitude","One-way light time: 16.2 minutes"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-ROVER-RECOVERY');

-- OUTER PLANETS (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'JOVIAN-RADIATION-SURVEY',
    'Jupiter Inner Radiation Belt & Synchrotron Emission Mapping',
    'Jupiter (Highly Elliptical Jovian Magnetosphere Orbit)',
    'Outer Planets',
    'THERMAL_MANAGEMENT',
    'CRITICAL',
    'JOVE-SCOPE',
    90,
    'CRITICAL',
    'High-speed perijove pass deep within Jupiter strong radiation belts inside Io orbit. Measure relativistic electron flux, synchrotron RF emissions, and magnetic field multipoles.',
    '["Navigate perijove passage at 1.8 Jupiter radii under 150 krad/hr radiation dosage","Record 3-axis fluxgate magnetometer data at 64 samples/second","Monitor radiation-hardened vault internal temperature and single-event upset latch counts"]',
    '["Perijove telemetry packet successfully delivered during post-encounter outbound leg","Radiation vault shielding integrity intact with zero permanent processor fault"]',
    '["Extreme radiation environment limits high-rate science to 45 minutes","Round-trip light time: 48 minutes"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'JOVIAN-RADIATION-SURVEY');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'JOVIAN-MOON-CAMPAIGN',
    'Europa Plume & Ganymede Induced Magnetic Dipole Resonance Survey',
    'Jupiter System (Europa/Ganymede Resonance Orbit)',
    'Outer Planets',
    'PLANETARY_RECONNAISSANCE',
    'CHALLENGING',
    'ION-GUARD',
    100,
    'HIGH',
    'Conduct targeted close flyby (400 km) of Europa trailing hemisphere followed by Ganymede resonant orbit insertion. Probe subsurface ocean induction response.',
    '["Execute Europa closest approach flyby at 400 km ± 5 km","Analyze in-situ sputtered water vapor and sodium ion flux via mass spectrometer","Detect Ganymede internal magnetic field induction response to Jupiter rotating magnetosphere"]',
    '["Flyby trajectory executed within navigation covariance ellipse","Subsurface ocean salinity constraint calculated from induction amplitude"]',
    '["Low solar flux (50 W/m²); spacecraft operating on RTG and battery hybrid","Flyby relative velocity: 7.2 km/s"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'JOVIAN-MOON-CAMPAIGN');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'SATURN-RING-OBSERVATION',
    'Saturn F-Ring Dynamic Shepherding & Prometheus Resonance Survey',
    'Titan (Polar Radar Mapping Orbit, 1,200 km)',
    'Outer Planets',
    'PLANETARY_RECONNAISSANCE',
    'STANDARD',
    'TITAN-ORBIT',
    80,
    'MODERATE',
    'Observe gravitational shepherd interaction between moonlet Prometheus and Saturn narrow F-ring strands. Map ring particle optical depth and streamline wake kinks.',
    '["Record 200 high-phase angle images of F-ring core and streamer channels","Measure ring particle velocity dispersion across shepherd moon conjunctions","Correlate radar backscatter intensity with ring surface density variations"]',
    '["Complete high-resolution F-ring azimuth mosaic delivered","Attitude stability held to within 0.005° during long-exposure imaging"]',
    '["Ring plane crossing avoidance safety buffer >= 12,000 km","Spacecraft communication latency: 84 minutes"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SATURN-RING-OBSERVATION');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'OUTER-PLANET-NAV-CAL',
    'Kronian Moon Transit Optical Triangulation & Ephemeris Refinement',
    'Saturn (Equatorial Ring & Moon Transit Orbit)',
    'Outer Planets',
    'PAYLOAD_CALIBRATION',
    'STANDARD',
    'RHEA-SURVEY',
    75,
    'LOW',
    'Perform multi-body optical navigation by observing mutual occultations and transits between Rhea, Dione, and Tethys to refine Kronian system gravitational ephemerides.',
    '["Track limb crossings during Rhea-Dione mutual occultation event with millisecond timing","Calculate optical centroid vector offsets against background Gaia star catalog","Compute updated state vector correction burn parameters"]',
    '["Moon ephemeris uncertainties reduced by factor of 4","Zero thruster fuel consumed during passive optical tracking arc"]',
    '["Narrow field-of-view star tracker pointing calibration required","Saturn thermal infrared background illumination rejection"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'OUTER-PLANET-NAV-CAL');

-- SOLAR (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'SOLAR-CORONA-CAMPAIGN',
    'Inner Heliospheric Coronal Streamer & Magnetic Topology Mapping',
    'Sun (Inner Heliospheric Orbit, 0.72 AU)',
    'Solar',
    'EARTH_OBSERVATION',
    'STANDARD',
    'HELIO-WATCH',
    70,
    'MODERATE',
    'Map large-scale coronal streamer structures and heliospheric current sheet crossings from 0.72 AU orbit. Measure in-situ solar wind proton bulk velocity and ion temperatures.',
    '["Acquire white-light coronagraph images from 2 to 30 solar radii","Measure solar wind proton density, speed, and alpha-to-proton ratio","Identify magnetic switchback flux rope boundaries in interplanetary field"]',
    '["3D coronal streamer morphology reconstructed","Spacecraft solar array output stable > 4000 W"]',
    '["High thermal radiation environment; radiator louvers fully open","Reaction wheel desaturation using magnetic torquers unavailable in solar orbit"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-CORONA-CAMPAIGN');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'SOLAR-FLARE-RESPONSE',
    'X-Class Solar Flare Prompt Emission & Hard X-Ray Spectroscopy',
    'Sun-Earth L5 Lagrange Orbit (Early Warning)',
    'Solar',
    'ORBITAL_SAFETY',
    'CHALLENGING',
    'FLARE-ALERT',
    50,
    'HIGH',
    'Autonomous detection of impulsive phase X-class solar flare eruption. Reorient spectrometer array within 20 seconds to capture hard X-ray brehmsstrahlung spectra.',
    '["Detect soft X-ray flux threshold exceedance (> 10^-4 W/m²) within 3 seconds","Execute slew to flare footpoint coordinates with reaction wheel cluster","Record 1 keV to 200 keV photon energy spectrum with 1-second cadence"]',
    '["Initial flare alert message dispatched to ground networks","Full spectroscopic energy profile captured without detector saturation"]',
    '["High energetic proton flux requires detector autonomous gain control","Spacecraft sunshield pointing error strictly <= 0.05°"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-FLARE-RESPONSE');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'SOLAR-SPACE-WEATHER-L1',
    'Lagrange L1 Interplanetary Shock Front Real-Time Sentinel Alarm',
    'Sun-Earth L1 Lagrange Halo Orbit',
    'Solar',
    'ORBITAL_SAFETY',
    'CHALLENGING',
    'STORM-SENTINEL',
    60,
    'HIGH',
    'Continuous monitoring of coronal shock fronts and energetic proton storms at Sun-Earth L1. Validate real-time autonomous alarm synthesis for terrestrial power grid alerts.',
    '["Analyze real-time solar wind plasma density and speed jump conditions","Detect interplanetary magnetic field southward Bz polarity turning","Broadcast priority alert packet to global infrastructure operations"]',
    '["Space-weather alert transmitted within 30 seconds of shock front arrival","Spacecraft bus health reports NOMINAL"]',
    '["Continuous uninterrupted telemetry feed required","L1 halo orbit station-keeping balance"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-SPACE-WEATHER-L1');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'SOLAR-CORONA-TRACE',
    'Solar Coronal Streamer Doppler Velocity Profiling',
    'Sun (Solar Perihelion Skim Orbit, 0.08 AU)',
    'Solar',
    'THERMAL_MANAGEMENT',
    'CRITICAL',
    'CORONA-TRACE',
    85,
    'SEVERE',
    'Ultra-close perihelion skim inside the Alfvén critical surface. Measure Doppler velocity shifts of coronal streamers to resolve the coronal heating paradox.',
    '["Measure coronal streamer ion acoustic Doppler velocity shifts","Monitor carbon-composite thermal shield front-face temperature (+1200°C)","Verify internal component bay temperatures remain stable <= +28°C"]',
    '["Streamer Doppler profile recorded with 0.1 km/s accuracy","No thermal sensor threshold breaches"]',
    '["Solar radiative flux exceeds 210,000 W/m²","Attitude error > 0.02° will destroy unprotected spacecraft elements"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-CORONA-TRACE');

-- DEEP SPACE (4 missions)
INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'DEEP-NAV-DRIFT',
    'Autonomous Interplanetary Optical Navigation Drift Correction',
    'Deep Space (Heliocentric Navigation Calibration Drift, 1.4 AU)',
    'Deep Space',
    'DEEP_SPACE_SURVIVAL',
    'STANDARD',
    'KEPLER-DRIFT',
    120,
    'MODERATE',
    'Calibrate optical triangulation across main-belt asteroids and background guide stars. Calculate autonomous trajectory corrections without reliance on terrestrial DSN tracking.',
    '["Acquire optical images of target asteroids 4 Vesta and 2 Pallas against star fields","Compute autonomous state vector estimator solution via onboard Kalman filter","Verify position error variance estimate remains <= 12 km after 10-day drift arc"]',
    '["Autonomous navigation solution matches radiometric ephemeris to within 3 sigma","Zero commanding required from ground ground during determination phase"]',
    '["Camera thermal stability must be maintained within ± 0.2°C","Solar range 1.4 AU: battery conservation mode active"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-NAV-DRIFT');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'DEEP-COMMS-RESILIENCE',
    'Ultra-Long-Baseline Telemetry Reception & Carrier Phase Recovery',
    'Deep Space (Heliocentric Long-Range Relay, 35.0 AU)',
    'Deep Space',
    'COMMUNICATIONS_RECOVERY',
    'CRITICAL',
    'VOYAGER-RELAY',
    110,
    'HIGH',
    'Long-distance telemetry link trial at 35 AU. Test autonomous deep-space carrier frequency tracking and low-signal-to-noise ratio phase lock under high plasma noise.',
    '["Lock 3.7-meter high-gain antenna onto Earth tracking station vector","Acquire 8.4 GHz X-band carrier signal at received power of -165 dBm","Maintain carrier loop tracking through 60-minute solar conjunction turbulence"]',
    '["Downlink bit stream decoded with zero uncorrectable frame errors","Autonomous carrier re-acquisition achieved within 120 seconds"]',
    '["One-way light time: 4.85 hours","Electric power supplied strictly by RTG (380 W total bus margin)"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-COMMS-RESILIENCE');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'DEEP-SURVIVAL-ASSESSMENT',
    'Interstellar Boundary Probe Power & Thermal Degradation Assessment',
    'Deep Space (Interstellar Heliopause Escape Trajectory, 65.0 AU)',
    'Deep Space',
    'DEEP_SPACE_SURVIVAL',
    'CRITICAL',
    'FARPOINT-PROBE',
    140,
    'SEVERE',
    'Long-duration probe survivability assessment at 65 AU from the Sun. Evaluate thermocouple power decay, internal radioisotope heater block performance, and thruster line freeze margins.',
    '["Measure RTG thermal output and silicon-germanium couple degradation rate","Verify catalytic thruster line heaters maintain hydrazine propellant temperature >= +8.0°C","Test low-power autonomous emergency safe mode transition sequence"]',
    '["Electrical bus voltage remains stable at 28.0V ± 0.8V","Spacecraft survives 120-minute autonomous evaluation without battery depletion"]',
    '["Solar power 0 W (infinite distance)","Round-trip comms latency: 23.6 hours"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-SURVIVAL-ASSESSMENT');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT
    'DEEP-ASTEROID-RENDEZVOUS',
    'Outer Asteroid Belt Autonomous Rendezvous & Proximity Survey',
    'Deep Space (Interplanetary Cruise Trajectory, 2.5 AU)',
    'Deep Space',
    'PLANETARY_RECONNAISSANCE',
    'CHALLENGING',
    'ODYSSEY-NAV',
    90,
    'HIGH',
    'Autonomous slow-speed proximity approach to carbonaceous asteroid 10 Hygiea. Map gravitational field, surface regolith distribution, and stage laser altimetry sweep.',
    '["Execute autonomous proximity braking burn to achieve relative velocity < 1.0 m/s","Conduct continuous lidar surface elevation scan from 15 km orbital hold","Model asteroid mass and center-of-gravity through optical tracking"]',
    '["Proximity survey completed without trajectory overshoot","Laser altimetry profile generated and verified"]',
    '["Micro-gravity environment requires precise cold-gas impulse control","Communication latency: 21 minutes"]',
    FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-ASTEROID-RENDEZVOUS');
