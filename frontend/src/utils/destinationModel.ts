import { MissionResponse, SpacecraftDetail } from '../types/missionControl';

export type DestinationGroup =
  | 'EARTH'
  | 'LUNAR'
  | 'MARS'
  | 'OUTER'
  | 'SOLAR'
  | 'DEEP_SPACE';

export type DestinationFilter = 'ALL' | DestinationGroup;

export type DestinationBody =
  | 'earth'
  | 'mars'
  | 'lunar'
  | 'jupiter'
  | 'saturn'
  | 'ice_giant'
  | 'solar'
  | 'deep_space';

export type CoordinateFrame =
  | 'ECI_J2000'
  | 'LVLH'
  | 'MCI_J2000'
  | 'AREOCENTRIC'
  | 'LCI_J2000'
  | 'SELENOCENTRIC'
  | 'JOVIAN_CENTRIC'
  | 'SATURNIAN_CENTRIC'
  | 'RING_PLANE'
  | 'URANIAN_CENTRIC'
  | 'HELIOCENTRIC'
  | 'CORONAL_BODY'
  | 'BARYCENTRIC_INERTIAL';

export type SupportedSimulationMode =
  | 'KEPLERIAN_TWO_BODY_ECI'
  | 'AREOCENTRIC_KEPLERIAN'
  | 'SELENOCENTRIC_KEPLERIAN'
  | 'SCIENTIFIC_VISUALIZATION';

export interface AuthoritativeVisualizationContext {
  missionId: string | null;
  runId: string | null;
  spacecraftId: string;
  destinationBody: DestinationBody;
  coordinateFrame: CoordinateFrame;
  simulationMode: SupportedSimulationMode;
  stateVersion: number;
}

/**
 * Authoritative registry mapping all 52 spacecraft in the ASTRA fleet to their
 * exact, dedicated destination group.
 */
export const SPACECRAFT_DESTINATION_MAP: Record<string, DestinationGroup> = {
  // 1. Earth Orbit (10 vehicles)
  'AURA-1': 'EARTH',
  'TERRA-OBS': 'EARTH',
  'SOLIS-RELAY': 'EARTH',
  'GEO-COM-4': 'EARTH',
  'NAV-STAR-09': 'EARTH',
  'DEBRIS-TRAC-2': 'EARTH',
  'HELIOS-OBS': 'EARTH',
  'MERIDIAN-RELAY': 'EARTH',
  'VIGIL-TRACK': 'EARTH',
  'STRATUS-MET': 'EARTH',

  // 2. Lunar Operations (10 vehicles)
  'CHANDRA-ORB': 'LUNAR',
  'LUNAR-HALO-1': 'LUNAR',
  'SELENA-MAPPER': 'LUNAR',
  'ARTEMIS-RELAY': 'LUNAR',
  'LUNAR-RECON-X': 'LUNAR',
  'MOON-NAV-01': 'LUNAR',
  'SELENE-MAP': 'LUNAR',
  'POLARIS-LR': 'LUNAR',
  'LUNA-LINK': 'LUNAR',
  'ARGUS-LNAV': 'LUNAR',

  // 3. Mars Operations (10 vehicles)
  'ARES-ORBITER': 'MARS',
  'MARS-RELAY-1': 'MARS',
  'PHOBOS-SCOUT': 'MARS',
  'DEIMOS-OBS': 'MARS',
  'MARS-ATMOS-4': 'MARS',
  'AERO-MAP-02': 'MARS',
  'AREION-RECON': 'MARS',
  'AETHER-MET': 'MARS',
  'DEIMOS-RELAY': 'MARS',
  'BOREALIS-MAP': 'MARS',

  // 4. Outer Planets (9 vehicles)
  'JOVIAN-RADIATION': 'OUTER',
  'EUROPA-CLIPPER-S': 'OUTER',
  'CALLISTO-SURVEY': 'OUTER',
  'CHRONOS-SATURN': 'OUTER',
  'TITAN-RELAY': 'OUTER',
  'JOVE-SCOPE': 'OUTER',
  'ION-GUARD': 'OUTER',
  'TITAN-ORBIT': 'OUTER',
  'RHEA-SURVEY': 'OUTER',

  // 5. Solar Operations (6 vehicles)
  'HELIOS-CORONA': 'SOLAR',
  'SOLAR-STORM-01': 'SOLAR',
  'HELIO-WATCH': 'SOLAR',
  'CORONA-TRACE': 'SOLAR',
  'STORM-SENTINEL': 'SOLAR',
  'FLARE-ALERT': 'SOLAR',

  // 6. Deep Space & Asteroids (7 vehicles)
  'ASTEROID-SCOUT': 'DEEP_SPACE',
  'DEEP-NAV-ALPHA': 'DEEP_SPACE',
  'VOYAGER-EXP': 'DEEP_SPACE',
  'ODYSSEY-NAV': 'DEEP_SPACE',
  'VOYAGER-RELAY': 'DEEP_SPACE',
  'KEPLER-DRIFT': 'DEEP_SPACE',
  'FARPOINT-PROBE': 'DEEP_SPACE',
};

/**
 * Returns default coordinate frame for a given celestial destination body.
 */
export function getDefaultCoordinateFrame(body: DestinationBody): CoordinateFrame {
  switch (body) {
    case 'mars':
      return 'MCI_J2000';
    case 'lunar':
      return 'LCI_J2000';
    case 'saturn':
      return 'SATURNIAN_CENTRIC';
    case 'jupiter':
      return 'JOVIAN_CENTRIC';
    case 'ice_giant':
      return 'URANIAN_CENTRIC';
    case 'solar':
      return 'HELIOCENTRIC';
    case 'deep_space':
      return 'BARYCENTRIC_INERTIAL';
    case 'earth':
    default:
      return 'ECI_J2000';
  }
}

/**
 * Returns the simulation propagation mode for a given celestial destination body.
 */
export function getSupportedSimulationMode(body: DestinationBody): SupportedSimulationMode {
  switch (body) {
    case 'earth':
      return 'KEPLERIAN_TWO_BODY_ECI';
    case 'mars':
      return 'AREOCENTRIC_KEPLERIAN';
    case 'lunar':
      return 'SELENOCENTRIC_KEPLERIAN';
    default:
      return 'SCIENTIFIC_VISUALIZATION';
  }
}

/**
 * Resolves a spacecraft to its authoritative destination group.
 * Checks known IDs first, then explicit metadata, then robust keyword heuristics.
 * Phrases like "Sun-Synchronous" or "Solar array" on Earth crafts NEVER resolve to SOLAR.
 */
export function getSpacecraftDestinationGroup(
  craft: Partial<SpacecraftDetail> | string | null | undefined
): DestinationGroup {
  if (!craft) return 'EARTH';

  const id = (typeof craft === 'string' ? craft : craft.id || '').toUpperCase().trim();
  if (id && SPACECRAFT_DESTINATION_MAP[id]) {
    return SPACECRAFT_DESTINATION_MAP[id];
  }

  if (typeof craft === 'object' && craft !== null) {
    if (craft.destinationGroup) {
      const g = craft.destinationGroup.toUpperCase().trim();
      if (g.includes('EARTH')) return 'EARTH';
      if (g.includes('LUNAR') || g.includes('MOON')) return 'LUNAR';
      if (g.includes('MARS')) return 'MARS';
      if (
        g.includes('OUTER') ||
        g.includes('JUPITER') ||
        g.includes('SATURN') ||
        g.includes('URANUS') ||
        g.includes('NEPTUNE')
      ) {
        return 'OUTER';
      }
      if (
        (g.includes('SOLAR') || g.includes('SUN')) &&
        !g.includes('EARTH') &&
        !g.includes('SYNCHRONOUS')
      ) {
        return 'SOLAR';
      }
      if (
        g.includes('DEEP') ||
        g.includes('INTERSTELLAR') ||
        g.includes('ASTEROID')
      ) {
        return 'DEEP_SPACE';
      }
    }

    if (craft.destination) {
      return getMissionDestinationGroup(craft.destination);
    }

    const role = (craft.modelType || '').toLowerCase();
    const name = (craft.name || '').toLowerCase();

    // Earth sun-synchronous / LEO / GEO checks
    if (
      role.includes('earth') ||
      role.includes('sso') ||
      role.includes('leo') ||
      role.includes('geo') ||
      name.includes('earth')
    ) {
      return 'EARTH';
    }
    if (role.includes('lunar') || role.includes('seleno') || name.includes('lunar')) {
      return 'LUNAR';
    }
    if (role.includes('mars') || role.includes('areo') || name.includes('mars')) {
      return 'MARS';
    }
    if (
      role.includes('jupiter') ||
      role.includes('saturn') ||
      role.includes('titan') ||
      role.includes('jovian') ||
      role.includes('outer')
    ) {
      return 'OUTER';
    }
    if (
      (role.includes('solar') || role.includes('coronal') || role.includes('helios')) &&
      !role.includes('earth') &&
      !role.includes('synchronous')
    ) {
      return 'SOLAR';
    }
    if (
      role.includes('deep space') ||
      role.includes('interstellar') ||
      role.includes('asteroid') ||
      role.includes('deep-space')
    ) {
      return 'DEEP_SPACE';
    }
  }

  // ID Prefix checks
  if (
    id.startsWith('AURA') ||
    id.startsWith('TERRA') ||
    id.startsWith('SOLIS') ||
    id.startsWith('GEO') ||
    id.startsWith('NAV-STAR') ||
    id.startsWith('DEBRIS') ||
    id.startsWith('STRATUS') ||
    id.startsWith('VIGIL') ||
    id.startsWith('MERIDIAN') ||
    id.startsWith('SENTINEL')
  ) {
    return 'EARTH';
  }
  if (
    id.startsWith('CHANDRA') ||
    id.startsWith('LUNAR') ||
    id.startsWith('SELENA') ||
    id.startsWith('SELENE') ||
    id.startsWith('ARTEMIS') ||
    id.startsWith('MOON') ||
    id.startsWith('POLARIS') ||
    id.startsWith('ARGUS')
  ) {
    return 'LUNAR';
  }
  if (
    id.startsWith('ARES') ||
    id.startsWith('MARS') ||
    id.startsWith('PHOBOS') ||
    id.startsWith('DEIMOS') ||
    id.startsWith('AERO') ||
    id.startsWith('AREION') ||
    id.startsWith('AETHER') ||
    id.startsWith('BOREALIS') ||
    (id.startsWith('ODYSSEY') && id !== 'ODYSSEY-NAV')
  ) {
    return 'MARS';
  }
  if (
    id.startsWith('JOVIAN') ||
    id.startsWith('EUROPA') ||
    id.startsWith('CALLISTO') ||
    id.startsWith('CHRONOS') ||
    id.startsWith('TITAN') ||
    id.startsWith('JOVE') ||
    id.startsWith('ION') ||
    id.startsWith('RHEA') ||
    id.startsWith('CASSINI')
  ) {
    return 'OUTER';
  }
  if (
    ((id.startsWith('HELIOS') && id !== 'HELIOS-OBS') ||
      id.startsWith('SOLAR') ||
      id.startsWith('CORONA') ||
      id.startsWith('STORM') ||
      id.startsWith('FLARE') ||
      id.startsWith('HELIO-') ||
      id.startsWith('PARKER'))
  ) {
    return 'SOLAR';
  }
  if (
    id.startsWith('ASTEROID') ||
    id.startsWith('DEEP') ||
    id.startsWith('VOYAGER') ||
    id.startsWith('ODYSSEY-NAV') ||
    id.startsWith('KEPLER') ||
    id.startsWith('FARPOINT')
  ) {
    return 'DEEP_SPACE';
  }

  // Default fallback is EARTH
  return 'EARTH';
}

/**
 * Resolves a mission or destination string to its authoritative destination group.
 */
export function getMissionDestinationGroup(
  missionOrDest?: Partial<MissionResponse> | string | null | undefined,
  destinationGroup?: string
): DestinationGroup {
  if (!missionOrDest && !destinationGroup) return 'EARTH';

  let grp = (destinationGroup || '').trim().toLowerCase();
  let dst = '';

  if (typeof missionOrDest === 'string') {
    dst = missionOrDest.trim().toLowerCase();
  } else if (typeof missionOrDest === 'object' && missionOrDest !== null) {
    if (!grp) {
      grp = (missionOrDest.destinationGroup || '').trim().toLowerCase();
    }
    dst = (missionOrDest.destination || '').trim().toLowerCase();
  }

  // Direct group check
  if (grp) {
    if (grp.includes('earth')) return 'EARTH';
    if (grp.includes('lunar') || grp.includes('moon')) return 'LUNAR';
    if (grp.includes('mars')) return 'MARS';
    if (
      grp.includes('outer') ||
      grp.includes('jupiter') ||
      grp.includes('saturn') ||
      grp.includes('uranus') ||
      grp.includes('neptune')
    ) {
      return 'OUTER';
    }
    if (
      (grp.includes('solar') || grp.includes('sun')) &&
      !grp.includes('synchronous')
    ) {
      return 'SOLAR';
    }
    if (
      grp.includes('deep') ||
      grp.includes('interstellar') ||
      grp.includes('asteroid')
    ) {
      return 'DEEP_SPACE';
    }
  }

  // Destination string check
  if (dst) {
    // Sun-Earth L1 or solar corona / heliospheric targets resolve to SOLAR
    if (
      dst.includes('sun-earth l1') ||
      dst.includes('l1 lagrange') ||
      dst.includes('helios') ||
      dst.includes('corona') ||
      dst.includes('perihelion')
    ) {
      return 'SOLAR';
    }

    // Earth takes precedence for LEO, SSO, GTO, and general terrestrial orbits
    if (
      dst.includes('earth') ||
      dst.includes('sun-synchronous') ||
      dst.includes('leo') ||
      dst.includes('gto') ||
      dst.includes('geostationary') ||
      dst.includes('molniya') ||
      dst.includes('low earth orbit')
    ) {
      return 'EARTH';
    }
    if (
      dst.includes('mars') ||
      dst.includes('ares') ||
      dst.includes('phobos') ||
      dst.includes('deimos')
    ) {
      return 'MARS';
    }
    if (
      dst.includes('moon') ||
      dst.includes('lunar') ||
      dst.includes('luna') ||
      dst.includes('selene') ||
      dst.includes('shackleton') ||
      dst.includes('cislunar')
    ) {
      return 'LUNAR';
    }
    if (
      dst.includes('outer') ||
      dst.includes('jupiter') ||
      dst.includes('saturn') ||
      dst.includes('europa') ||
      dst.includes('callisto') ||
      dst.includes('titan') ||
      dst.includes('enceladus') ||
      dst.includes('jovian') ||
      dst.includes('ring') ||
      dst.includes('uranus') ||
      dst.includes('neptune')
    ) {
      return 'OUTER';
    }
    if (
      (dst.includes('solar') ||
        dst.startsWith('sun')) &&
      !dst.includes('earth') &&
      !dst.includes('synchronous')
    ) {
      return 'SOLAR';
    }
    if (
      dst.includes('deep space') ||
      dst.includes('asteroid') ||
      dst.includes('interplanetary') ||
      dst.includes('heliopause') ||
      dst.includes('kuiper') ||
      dst.includes('voyager') ||
      dst.includes('deep-space')
    ) {
      return 'DEEP_SPACE';
    }
  }

  return 'EARTH';
}

/**
 * Validates whether a spacecraft is compatible with a given destination.
 */
export function isSpacecraftCompatibleWithDestination(
  craft: Partial<SpacecraftDetail> | string,
  destination: string | DestinationGroup
): boolean {
  const craftGroup = getSpacecraftDestinationGroup(craft);
  const targetGroup =
    typeof destination === 'string' &&
    ['EARTH', 'LUNAR', 'MARS', 'OUTER', 'SOLAR', 'DEEP_SPACE'].includes(
      destination.toUpperCase().trim()
    )
      ? (destination.toUpperCase().trim() as DestinationGroup)
      : getMissionDestinationGroup(destination);
  return craftGroup === targetGroup;
}

/**
 * Filters a spacecraft list down to only vehicles compatible with the given destination.
 */
export function getCompatibleSpacecraftForDestination(
  crafts: SpacecraftDetail[],
  destination: string | DestinationGroup
): SpacecraftDetail[] {
  return crafts.filter((c) => isSpacecraftCompatibleWithDestination(c, destination));
}

/**
 * Maps a destination group (or filter) and optional craft to a 3D celestial body.
 */
export function destinationGroupToBody(
  group: DestinationFilter,
  craft?: SpacecraftDetail | null,
  destinationStr?: string | null
): DestinationBody {
  switch (group) {
    case 'EARTH':
      return 'earth';
    case 'LUNAR':
      return 'lunar';
    case 'MARS':
      return 'mars';
    case 'OUTER': {
      const destLower = (destinationStr || '').toLowerCase();
      if (
        destLower.includes('saturn') ||
        destLower.includes('titan') ||
        destLower.includes('enceladus')
      ) {
        return 'saturn';
      }
      if (
        destLower.includes('uranus') ||
        destLower.includes('neptune')
      ) {
        return 'ice_giant';
      }
      if (craft) {
        const id = (craft.id || '').toUpperCase();
        if (
          id.includes('SATURN') ||
          id.includes('TITAN') ||
          id.includes('CHRONOS') ||
          id.includes('RHEA')
        ) {
          return 'saturn';
        }
      }
      return 'jupiter';
    }
    case 'SOLAR':
      return 'solar';
    case 'DEEP_SPACE':
      return 'deep_space';
    case 'ALL':
    default:
      if (craft) {
        const cGroup = getSpacecraftDestinationGroup(craft);
        if (cGroup !== 'EARTH') return destinationGroupToBody(cGroup, craft, destinationStr);
      }
      return 'earth';
  }
}

/**
 * Resolves the destination body strictly according to authoritative mission,
 * spacecraft data, and optional active destinationFilter.
 */
export function resolveDestinationBody(
  missionOrDest?: string | MissionResponse | null,
  craftOrGroup?: string | SpacecraftDetail | null,
  destinationFilter?: DestinationFilter | null
): DestinationBody {
  const craft = typeof craftOrGroup === 'object' && craftOrGroup !== null ? craftOrGroup : null;
  const groupStr = typeof craftOrGroup === 'string' ? craftOrGroup : undefined;
  const destStr =
    typeof missionOrDest === 'string'
      ? missionOrDest
      : (missionOrDest as MissionResponse)?.destination || '';

  if (destinationFilter && destinationFilter !== 'ALL') {
    return destinationGroupToBody(destinationFilter, craft, destStr);
  }

  if (missionOrDest) {
    const group = getMissionDestinationGroup(missionOrDest, groupStr);
    return destinationGroupToBody(group, craft, destStr);
  }

  if (craft) {
    const group = getSpacecraftDestinationGroup(craft);
    return destinationGroupToBody(group, craft, destStr);
  }

  if (groupStr) {
    const group = getMissionDestinationGroup('', groupStr);
    return destinationGroupToBody(group, craft, destStr);
  }

  return 'earth';
}

/**
 * Builds a complete AuthoritativeVisualizationContext given active mission,
 * craft, state sequence version, and active destinationFilter.
 */
export function buildVisualizationContext(
  mission?: Partial<MissionResponse> | string | null,
  craft?: SpacecraftDetail | null,
  stateVersion: number = 1,
  destinationFilter?: DestinationFilter | null
): AuthoritativeVisualizationContext {
  const destinationBody = resolveDestinationBody(mission as any, craft, destinationFilter);
  const coordinateFrame = getDefaultCoordinateFrame(destinationBody);
  const simulationMode = getSupportedSimulationMode(destinationBody);

  const missionObj = typeof mission === 'object' && mission !== null ? mission : null;

  return {
    missionId: missionObj?.id || null,
    runId: missionObj?.activeRun?.runId || null,
    spacecraftId: craft?.id || missionObj?.spacecraftId || 'AURA-1',
    destinationBody,
    coordinateFrame,
    simulationMode,
    stateVersion,
  };
}

export const getAuthoritativeVisualizationContext = buildVisualizationContext;
