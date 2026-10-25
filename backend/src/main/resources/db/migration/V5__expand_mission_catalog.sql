-- ASTRA Mission Universe Expansion
-- V5 adds 12 additional curated scenarios across the existing six destination groups.
-- Idempotent inserts keep existing installations safe; MissionService hydrates these definitions at startup.

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'EARTH-THERMAL-CALIBRATION',
       'Thermal Balance & Eclipse Recovery Calibration',
       'Earth (Sun-Synchronous LEO, 710 km)', 'Earth',
       'THERMAL_MANAGEMENT', 'STANDARD', 'HELIOS-OBS',
       35, 'MODERATE',
       'Validate thermal control response across orbital day-night transitions and confirm radiator performance after eclipse exit.',
       '["Record radiator and payload-bay temperatures through one simulated eclipse","Verify heater duty cycle returns to nominal after sunlight acquisition","Compare thermal telemetry against the mission envelope"]',
       '["All monitored temperatures remain within the defined operating envelope","Thermal control returns to nominal without an unexpected safe-mode transition"]',
       '["Maintain continuous telemetry during eclipse transitions","Do not issue attitude changes during calibration sampling"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-THERMAL-CALIBRATION');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'EARTH-RELAY-HANDOVER',
       'Cross-Constellation Communications Handover Drill',
       'Earth (Medium Earth Orbit, 20,200 km)', 'Earth',
       'COMMUNICATIONS_RECOVERY', 'CHALLENGING', 'MERIDIAN-RELAY',
       40, 'HIGH',
       'Exercise a planned ground-link handover while preserving command acknowledgements and downlink continuity.',
       '["Acquire the alternate communications link","Verify command acknowledgement continuity across handover","Measure packet loss and link margin before and after transition"]',
       '["Alternate link is locked and verified","No command acknowledgement is lost during the handover"]',
       '["Abort the handover if link margin falls below the configured threshold","Keep the spacecraft in its approved communications attitude"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'EARTH-RELAY-HANDOVER');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'LUNAR-POLAR-ICE-SURVEY',
       'Permanently Shadowed Crater Volatile Survey',
       'Moon (Low Lunar Polar Orbit, 100 km)', 'Lunar',
       'PLANETARY_RECONNAISSANCE', 'CHALLENGING', 'POLARIS-LR',
       70, 'HIGH',
       'Survey a simulated lunar polar region for volatile signatures while balancing instrument temperature and power reserves.',
       '["Map the assigned polar survey corridor","Capture instrument readings over the designated shadowed region","Verify power and thermal margins after the observation pass"]',
       '["The survey corridor is completed and observation data is recorded","Power and thermal subsystems remain within operational limits"]',
       '["Preserve a minimum battery reserve for the return observation window","Suspend collection if instrument temperature leaves its safe range"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-POLAR-ICE-SURVEY');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'LUNAR-FARSIDE-RELAY',
       'Lunar Farside Relay Link-Routing Validation',
       'Moon-Earth L2 Halo Orbit (Farside Relay)', 'Lunar',
       'COMMUNICATIONS_RECOVERY', 'STANDARD', 'LUNA-LINK',
       45, 'MODERATE',
       'Validate relay routing and store-and-forward behaviour for a simulated lunar farside observation window.',
       '["Establish the relay link with the simulated ground network","Queue a science packet during the farside visibility gap","Verify packet forwarding and delivery acknowledgement"]',
       '["Queued science packet is delivered after relay visibility resumes","No packet corruption is reported by the receiver"]',
       '["Respect the configured link-visibility window","Retain queued packets through temporary link loss"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'LUNAR-FARSIDE-RELAY');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'MARS-ATMOSPHERE-PROFILE',
       'Mars Limb-Sounding Atmospheric Profile',
       'Mars (Areocentric Science Orbit)', 'Mars',
       'PLANETARY_RECONNAISSANCE', 'STANDARD', 'AETHER-MET',
       55, 'MODERATE',
       'Run a limb-sounding observation sequence to profile atmospheric structure and verify instrument stability through the scan.',
       '["Acquire a complete simulated limb-sounding scan","Track instrument temperature and power during the observation","Validate the profile packet before downlink"]',
       '["The profile contains all required scan segments","Instrument health remains nominal and the data packet passes validation"]',
       '["Maintain stable pointing during integration","Pause acquisition if thermal limits are exceeded"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-ATMOSPHERE-PROFILE');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'MARS-RELAY-RECOVERY',
       'Mars Relay Antenna Reacquisition Exercise',
       'Mars (Interplanetary Communications Relay Orbit)', 'Mars',
       'COMMUNICATIONS_RECOVERY', 'CHALLENGING', 'DEIMOS-RELAY',
       50, 'HIGH',
       'Simulate loss of a high-gain communications lock and recover the link using a staged antenna reacquisition procedure.',
       '["Detect the simulated carrier-lock loss","Execute the approved antenna reacquisition sequence","Confirm stable carrier lock and restored telemetry flow"]',
       '["Carrier lock is restored within the mission time limit","Telemetry resumes without an unresolved critical communications fault"]',
       '["Use the approved recovery sequence only","Preserve command link availability throughout the recovery attempt"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'MARS-RELAY-RECOVERY');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'JOVIAN-RADIATION-SURVEY',
       'Jovian Radiation Belt Mapping Pass',
       'Jupiter (Radiation Survey Orbit)', 'Outer Planets',
       'PLANETARY_RECONNAISSANCE', 'CHALLENGING', 'JOVE-SCOPE',
       65, 'HIGH',
       'Collect a simulated radiation-belt transect and validate instrument health while traversing a high-radiation environment.',
       '["Complete the assigned radiation-belt sampling transect","Monitor instrument dose and spacecraft subsystem health","Downlink the survey summary after leaving the observation sector"]',
       '["All planned transect samples are recorded","No critical subsystem fault remains unresolved at mission completion"]',
       '["Apply instrument safing thresholds at the configured dose limit","Prioritize spacecraft health over optional science samples"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'JOVIAN-RADIATION-SURVEY');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'SATURN-RING-PLANE-CROSSING',
       'Saturn Ring-Plane Imaging & Hazard Assessment',
       'Saturn (Ring-Plane Observation Trajectory)', 'Outer Planets',
       'PLANETARY_RECONNAISSANCE', 'CRITICAL', 'TITAN-ORBIT',
       80, 'SEVERE',
       'Conduct a simulated ring-plane observation pass with strict pointing, exposure, and spacecraft-health constraints.',
       '["Complete the planned ring-plane imaging sequence","Monitor attitude stability during each exposure","Evaluate the hazard assessment packet before leaving the observation arc"]',
       '["Required image sequence is captured and validated","Spacecraft remains in a recoverable operational state"]',
       '["Do not exceed the configured attitude-error envelope","Suspend optional imaging if a critical health alert appears"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SATURN-RING-PLANE-CROSSING');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'SOLAR-CORONA-THERMAL-DRILL',
       'Coronagraph Thermal Margin & Safe-Pointing Drill',
       'Sun (Coronagraph Observation Orbit)', 'Solar',
       'THERMAL_MANAGEMENT', 'CHALLENGING', 'CORONA-TRACE',
       45, 'SEVERE',
       'Exercise the coronagraph observation sequence while validating thermal margin and safe-pointing response to simulated solar flux changes.',
       '["Track thermal shield and instrument-bay telemetry during observation","Verify the safe-pointing trigger responds to the configured limit","Return to the approved observation attitude after the drill clears"]',
       '["Thermal limits are respected throughout the scenario","Safe-pointing response is recorded and the spacecraft returns to an approved mode"]',
       '["Thermal safing takes precedence over science collection","Do not continue observations beyond the configured flux threshold"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-CORONA-THERMAL-DRILL');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'SOLAR-L1-STATIONKEEPING',
       'Sun-Earth L1 Station-Keeping & Ephemeris Validation',
       'Sun-Earth L1 Lagrange Halo Orbit', 'Solar',
       'ORBITAL_SAFETY', 'STANDARD', 'STORM-SENTINEL',
       60, 'MODERATE',
       'Evaluate a planned station-keeping correction and verify that the post-maneuver state remains inside the configured halo-orbit envelope.',
       '["Capture the pre-maneuver state estimate","Validate the planned correction against propellant and pointing constraints","Compare the post-maneuver state with the target envelope"]',
       '["Post-maneuver state is inside the configured acceptance envelope","Propellant and attitude margins remain above minimum limits"]',
       '["Require a valid state estimate before maneuver authorization","Cancel the burn if propulsion health is degraded"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'SOLAR-L1-STATIONKEEPING');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'DEEP-OPTICAL-NAV-CALIBRATION',
       'Deep-Space Star-Field Optical Navigation Calibration',
       'Deep Space (Heliocentric Navigation Calibration Arc)', 'Deep Space',
       'DEEP_SPACE_SURVIVAL', 'STANDARD', 'KEPLER-DRIFT',
       95, 'MODERATE',
       'Calibrate an optical navigation solution against a simulated star field and verify state-estimator convergence without continuous ground tracking.',
       '["Acquire the scheduled star-field observation set","Calculate and compare successive navigation solutions","Verify the state-estimator uncertainty falls within the mission limit"]',
       '["Navigation solution converges within the configured uncertainty limit","Observation set is stored for later ground review"]',
       '["Respect the low-power observation schedule","Flag the solution if the reference star set is insufficient"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-OPTICAL-NAV-CALIBRATION');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'DEEP-LOW-POWER-SURVIVAL',
       'Interstellar Probe Low-Power Survival & Recovery',
       'Deep Space (Interstellar Cruise)', 'Deep Space',
       'DEEP_SPACE_SURVIVAL', 'CHALLENGING', 'FARPOINT-PROBE',
       100, 'HIGH',
       'Test a low-power operating profile, protect essential telemetry, and validate recovery when available energy returns above the reserve threshold.',
       '["Enter the approved low-power profile","Verify essential telemetry and command reception remain available","Restore non-essential loads after reserve recovery is confirmed"]',
       '["Essential telemetry remains available throughout the low-power interval","Recovery completes without a critical power or thermal fault"]',
       '["Do not disable essential command reception","Recovery requires confirmed reserve margin, not elapsed time alone"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-LOW-POWER-SURVIVAL');

INSERT INTO mission_definitions (
    id, title, destination, destination_group, category, difficulty, spacecraft_id,
    duration_minutes, risk_level, synopsis, objectives_json, completion_criteria_json,
    operational_constraints_json, is_simulated, created_at
)
SELECT 'DEEP-ASTEROID-SPECTRAL-SURVEY',
       'Near-Earth Asteroid Spectral Characterization',
       'Deep Space (Near-Earth Asteroid Flyby)', 'Deep Space',
       'PLANETARY_RECONNAISSANCE', 'CHALLENGING', 'ODYSSEY-NAV',
       75, 'HIGH',
       'Plan and execute a simulated asteroid flyby observation to characterize surface spectra and validate autonomous targeting performance.',
       '["Acquire the planned approach observations","Collect the visible and near-infrared spectral sequence","Verify the closest-approach data packet and navigation estimate"]',
       '["Spectral sequence and closest-approach packet are complete","Targeting error remains within the configured flyby corridor"]',
       '["Preserve a safe flyby distance if navigation uncertainty increases","Prioritize spacecraft pointing stability during spectral integration"]',
       TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mission_definitions WHERE id = 'DEEP-ASTEROID-SPECTRAL-SURVEY');
