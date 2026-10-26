package org.astra.missions.domain;

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Server-authoritative validator for spacecraft and destination operational compatibility.
 * Mirrors the single authoritative destination model across Earth, Lunar, Mars, Outer Planets,
 * Solar, and Deep Space fleets.
 */
public final class DestinationCompatibilityValidator {

    private static final Map<String, String> SPACECRAFT_DESTINATION_MAP;

    static {
        Map<String, String> map = new HashMap<>();

        // 1. Earth Orbit Fleet
        map.put("AURA-1", "EARTH");
        map.put("TERRA-OBS", "EARTH");
        map.put("SOLIS-RELAY", "EARTH");
        map.put("GEO-COM-4", "EARTH");
        map.put("NAV-STAR-09", "EARTH");
        map.put("DEBRIS-TRAC-2", "EARTH");
        map.put("HELIOS-OBS", "EARTH");
        map.put("MERIDIAN-RELAY", "EARTH");
        map.put("VIGIL-TRACK", "EARTH");
        map.put("STRATUS-MET", "EARTH");

        // 2. Lunar Operations Fleet
        map.put("CHANDRA-ORB", "LUNAR");
        map.put("LUNAR-HALO-1", "LUNAR");
        map.put("SELENA-MAPPER", "LUNAR");
        map.put("ARTEMIS-RELAY", "LUNAR");
        map.put("LUNAR-RECON-X", "LUNAR");
        map.put("MOON-NAV-01", "LUNAR");
        map.put("SELENE-MAP", "LUNAR");
        map.put("POLARIS-LR", "LUNAR");
        map.put("LUNA-LINK", "LUNAR");
        map.put("ARGUS-LNAV", "LUNAR");

        // 3. Mars Operations Fleet
        map.put("ARES-ORBITER", "MARS");
        map.put("MARS-RELAY-1", "MARS");
        map.put("PHOBOS-SCOUT", "MARS");
        map.put("DEIMOS-OBS", "MARS");
        map.put("MARS-ATMOS-4", "MARS");
        map.put("AERO-MAP-02", "MARS");
        map.put("AREION-RECON", "MARS");
        map.put("AETHER-MET", "MARS");
        map.put("DEIMOS-RELAY", "MARS");
        map.put("BOREALIS-MAP", "MARS");
        map.put("MRO-ORBITER", "MARS");
        map.put("PERSEVERANCE-RELAY", "MARS");
        map.put("MAVEN-ORBITER", "MARS");

        // 4. Outer Planets Fleet
        map.put("JOVIAN-RADIATION", "OUTER");
        map.put("EUROPA-CLIPPER-S", "OUTER");
        map.put("EUROPA-CLIPPER", "OUTER");
        map.put("CALLISTO-SURVEY", "OUTER");
        map.put("CHRONOS-SATURN", "OUTER");
        map.put("TITAN-RELAY", "OUTER");
        map.put("JOVE-SCOPE", "OUTER");
        map.put("ION-GUARD", "OUTER");
        map.put("TITAN-ORBIT", "OUTER");
        map.put("RHEA-SURVEY", "OUTER");
        map.put("CASSINI-O", "OUTER");
        map.put("JUICE-EXP", "OUTER");

        // 5. Solar Operations Fleet
        map.put("HELIOS-CORONA", "SOLAR");
        map.put("SOLAR-STORM-01", "SOLAR");
        map.put("HELIO-WATCH", "SOLAR");
        map.put("CORONA-TRACE", "SOLAR");
        map.put("STORM-SENTINEL", "SOLAR");
        map.put("FLARE-ALERT", "SOLAR");
        map.put("PARKER-SOLAR-01", "SOLAR");
        map.put("SOHO-OBSERVER", "SOLAR");

        // 6. Deep Space Fleet
        map.put("ASTEROID-SCOUT", "DEEP_SPACE");
        map.put("DEEP-NAV-ALPHA", "DEEP_SPACE");
        map.put("VOYAGER-EXP", "DEEP_SPACE");
        map.put("ODYSSEY-NAV", "DEEP_SPACE");
        map.put("VOYAGER-RELAY", "DEEP_SPACE");
        map.put("KEPLER-DRIFT", "DEEP_SPACE");
        map.put("FARPOINT-PROBE", "DEEP_SPACE");
        map.put("VOYAGER-1", "DEEP_SPACE");
        map.put("VOYAGER-2", "DEEP_SPACE");

        SPACECRAFT_DESTINATION_MAP = Collections.unmodifiableMap(map);
    }

    private DestinationCompatibilityValidator() {
    }

    /**
     * Resolves the authoritative normalized destination group (EARTH, LUNAR, MARS, OUTER, SOLAR, DEEP_SPACE).
     */
    public static String resolveDestinationGroup(String destination, String destinationGroup) {
        if (destinationGroup != null && !destinationGroup.isBlank()) {
            String grp = destinationGroup.trim().toUpperCase(Locale.ROOT);
            if (grp.contains("EARTH")) return "EARTH";
            if (grp.contains("LUNAR") || grp.contains("MOON")) return "LUNAR";
            if (grp.contains("MARS")) return "MARS";
            if (grp.contains("OUTER") || grp.contains("JUPITER") || grp.contains("SATURN") || grp.contains("URANUS") || grp.contains("NEPTUNE")) return "OUTER";
            if ((grp.contains("SOLAR") || grp.contains("SUN")) && !grp.contains("SYNCHRONOUS")) return "SOLAR";
            if (grp.contains("DEEP") || grp.contains("INTERSTELLAR") || grp.contains("ASTEROID")) return "DEEP_SPACE";
        }

        if (destination != null && !destination.isBlank()) {
            String dst = destination.trim().toLowerCase(Locale.ROOT);
            // Sun-Earth L1 Lagrange / solar corona targets
            if (dst.contains("sun-earth l1") || dst.contains("l1 lagrange") || dst.contains("helios") || dst.contains("corona") || dst.contains("perihelion")) {
                return "SOLAR";
            }
            // Terrestrial Earth orbits
            if (dst.contains("earth") || dst.contains("sun-synchronous") || dst.contains("leo") || dst.contains("gto") || dst.contains("geostationary") || dst.contains("molniya")) {
                return "EARTH";
            }
            if (dst.contains("mars") || dst.contains("ares") || dst.contains("phobos") || dst.contains("deimos")) {
                return "MARS";
            }
            if (dst.contains("moon") || dst.contains("lunar") || dst.contains("luna") || dst.contains("selene") || dst.contains("shackleton") || dst.contains("cislunar")) {
                return "LUNAR";
            }
            if (dst.contains("outer") || dst.contains("jupiter") || dst.contains("saturn") || dst.contains("europa") || dst.contains("callisto") || dst.contains("titan") || dst.contains("enceladus") || dst.contains("uranus") || dst.contains("neptune")) {
                return "OUTER";
            }
            if (dst.contains("solar") || dst.startsWith("sun")) {
                return "SOLAR";
            }
            if (dst.contains("deep space") || dst.contains("asteroid") || dst.contains("interplanetary") || dst.contains("heliopause") || dst.contains("kuiper") || dst.contains("voyager")) {
                return "DEEP_SPACE";
            }
        }

        return "EARTH";
    }

    /**
     * Resolves the authoritative destination group of a spacecraft by ID or prefix heuristics.
     */
    public static String getSpacecraftDestinationGroup(String spacecraftId) {
        if (spacecraftId == null || spacecraftId.isBlank()) {
            return "EARTH";
        }
        String normalizedId = spacecraftId.trim().toUpperCase(Locale.ROOT);
        String known = SPACECRAFT_DESTINATION_MAP.get(normalizedId);
        if (known != null) {
            return known;
        }

        // Prefix heuristics for dynamic or custom spacecraft
        if (normalizedId.startsWith("AURA") || normalizedId.startsWith("TERRA") || normalizedId.startsWith("SOLIS") || normalizedId.startsWith("GEO") || normalizedId.startsWith("NAV-STAR") || normalizedId.startsWith("DEBRIS") || normalizedId.startsWith("VIGIL") || normalizedId.startsWith("STRATUS") || normalizedId.startsWith("MERIDIAN")) {
            return "EARTH";
        }
        if (normalizedId.startsWith("CHANDRA") || normalizedId.startsWith("LUNAR") || normalizedId.startsWith("SELENA") || normalizedId.startsWith("SELENE") || normalizedId.startsWith("ARTEMIS") || normalizedId.startsWith("MOON") || normalizedId.startsWith("POLARIS") || normalizedId.startsWith("ARGUS")) {
            return "LUNAR";
        }
        if (normalizedId.startsWith("ARES") || normalizedId.startsWith("MARS") || normalizedId.startsWith("PHOBOS") || normalizedId.startsWith("DEIMOS") || normalizedId.startsWith("AERO") || normalizedId.startsWith("AREION") || normalizedId.startsWith("AETHER") || normalizedId.startsWith("BOREALIS")) {
            return "MARS";
        }
        if (normalizedId.startsWith("JOVIAN") || normalizedId.startsWith("EUROPA") || normalizedId.startsWith("CALLISTO") || normalizedId.startsWith("CHRONOS") || normalizedId.startsWith("TITAN") || normalizedId.startsWith("JOVE") || normalizedId.startsWith("ION") || normalizedId.startsWith("RHEA")) {
            return "OUTER";
        }
        if (normalizedId.startsWith("HELIOS") || normalizedId.startsWith("SOLAR") || normalizedId.startsWith("HELIO") || normalizedId.startsWith("CORONA") || normalizedId.startsWith("STORM") || normalizedId.startsWith("FLARE")) {
            return "SOLAR";
        }
        if (normalizedId.startsWith("ASTEROID") || normalizedId.startsWith("DEEP") || normalizedId.startsWith("VOYAGER") || normalizedId.startsWith("ODYSSEY") || normalizedId.startsWith("KEPLER") || normalizedId.startsWith("FARPOINT")) {
            return "DEEP_SPACE";
        }

        return "EARTH";
    }

    /**
     * Verifies that the specified spacecraft is authoritatively compatible with the destination.
     */
    public static boolean isCompatible(String spacecraftId, String destination, String destinationGroup) {
        String craftGroup = getSpacecraftDestinationGroup(spacecraftId);
        String targetGroup = resolveDestinationGroup(destination, destinationGroup);
        return craftGroup.equalsIgnoreCase(targetGroup);
    }
}
