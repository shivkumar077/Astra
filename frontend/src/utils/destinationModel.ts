import { MissionResponse, SpacecraftDetail } from '../types/missionControl';

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
 * Resolves the destination body strictly according to authoritative mission and spacecraft data.
 * 
 * ROOT-CAUSE SAFEGUARDS:
 * 1. Checks Earth missions explicitly FIRST. Phrases like "Sun-Synchronous LEO" or "solar array"
 *    MUST NEVER cause an Earth orbit to resolve to the Sun.
 * 2. Solar is strictly reserved for genuine coronal/heliocentric missions (e.g. Helios, Solar Probe).
 * 3. Never silently defaults to 'solar'; always falls back to 'earth' if unresolvable.
 */
export function resolveDestinationBody(
  missionOrDest?: string | MissionResponse | null,
  craftOrGroup?: string | SpacecraftDetail | null
): DestinationBody {
  let grp = '';
  let dst = '';
  let craft: SpacecraftDetail | null = null;

  if (typeof missionOrDest === 'string') {
    dst = missionOrDest.trim().toLowerCase();
    if (typeof craftOrGroup === 'string') {
      grp = craftOrGroup.trim().toLowerCase();
    } else if (craftOrGroup && typeof craftOrGroup === 'object') {
      craft = craftOrGroup;
    }
  } else if (missionOrDest && typeof missionOrDest === 'object') {
    grp = (missionOrDest.destinationGroup || '').trim().toLowerCase();
    dst = (missionOrDest.destination || '').trim().toLowerCase();
    if (craftOrGroup && typeof craftOrGroup === 'object') {
      craft = craftOrGroup;
    }
  } else if (craftOrGroup && typeof craftOrGroup === 'object') {
    craft = craftOrGroup;
  }

  // 1. Authoritative Destination String / Mission Resolution
  if (dst || grp) {
    // 1A. Explicit Solar Destination Group: When group is explicitly Solar (and not an Earth Sun-Synchronous mission)
    if (
      (grp === 'solar' || grp.includes('solar')) &&
      !dst.includes('sun-synchronous') &&
      !grp.includes('earth')
    ) {
      return 'solar';
    }

    // 1B. Earth System: Strict match taking precedence over any incidental "sun" mentions (e.g. "Sun-Synchronous")
    if (
      (grp === 'earth' ||
      grp.includes('earth') ||
      dst.startsWith('earth') ||
      dst.includes('(earth') ||
      dst.includes('earth') ||
      dst.includes('sun-synchronous') ||
      dst.includes('leo') ||
      dst.includes('gto') ||
      dst.includes('geostationary') ||
      dst.includes('molniya') ||
      dst.includes('low earth orbit')) &&
      !grp.includes('solar')
    ) {
      return 'earth';
    }

    // 1B. Mars System
    if (
      grp.includes('mars') ||
      dst.includes('mars') ||
      dst.includes('ares') ||
      dst.includes('phobos') ||
      dst.includes('deimos') ||
      dst.includes('jezero') ||
      dst.includes('valles marineris')
    ) {
      return 'mars';
    }

    // 1C. Lunar System
    if (
      grp.includes('lunar') ||
      grp.includes('moon') ||
      dst.includes('moon') ||
      dst.includes('lunar') ||
      dst.includes('luna') ||
      dst.includes('selene') ||
      dst.includes('shackleton') ||
      dst.includes('cislunar')
    ) {
      return 'lunar';
    }

    // 1D. Saturn System
    if (grp.includes('saturn') || dst.includes('saturn') || dst.includes('titan') || dst.includes('enceladus')) {
      return 'saturn';
    }

    // 1E. Jupiter / Outer System
    if (
      grp.includes('jupiter') ||
      grp.includes('outer') ||
      dst.includes('jupiter') ||
      dst.includes('jovian') ||
      dst.includes('europa') ||
      dst.includes('callisto') ||
      dst.includes('ganymede') ||
      /\bio\b/.test(dst) ||
      dst.includes('moon io')
    ) {
      return 'jupiter';
    }

    // 1F. Ice Giant System (Uranus / Neptune)
    if (grp.includes('uranus') || grp.includes('neptune') || dst.includes('uranus') || dst.includes('neptune') || dst.includes('triton')) {
      return 'ice_giant';
    }

    // 1G. Solar Environment (Strictly Sun-centered / Coronal)
    // NOTE: Must not match "sun-synchronous", "solar array", or Earth missions!
    if (
      (grp === 'solar' || grp.includes('solar') || grp === 'the sun') &&
      !dst.includes('earth') &&
      !dst.includes('synchronous')
    ) {
      return 'solar';
    }
    if (
      (dst.includes('helios') ||
        dst.includes('solar corona') ||
        dst.includes('solar storm sentinel') ||
        dst.includes('perihelion') ||
        dst.includes('l1 lagrange') ||
        dst.startsWith('sun ') ||
        dst.startsWith('sun(') ||
        dst.includes('(coronal')) &&
      !dst.includes('earth') &&
      !dst.includes('synchronous')
    ) {
      return 'solar';
    }

    // 1H. Deep Space & Asteroid Belt
    if (
      grp.includes('deep space') ||
      dst.includes('deep space') ||
      dst.includes('asteroid') ||
      dst.includes('interplanetary') ||
      dst.includes('heliopause') ||
      dst.includes('kuiper') ||
      dst.includes('voyager')
    ) {
      return 'deep_space';
    }
  }

  // 2. Authoritative Spacecraft Model / CallSign Resolution
  if (craft) {
    const id = (craft.id || '').toUpperCase();
    const role = (craft.modelType || '').toLowerCase();
    const name = (craft.name || '').toLowerCase();

    // Earth fleet crafts
    if (
      id.startsWith('AURA') ||
      id.startsWith('TERRA') ||
      id.startsWith('SOLIS') ||
      id.startsWith('GEO-COM') ||
      id.startsWith('NAV-STAR') ||
      id.startsWith('DEBRIS-TRAC') ||
      id.startsWith('SENTINEL') ||
      id.startsWith('DEBRIS-GUARD') ||
      id.startsWith('NAV-SAT') ||
      id.startsWith('ORBIT-RELAY') ||
      role.includes('earth observation') ||
      role.includes('leo reconnaissance') ||
      role.includes('geostationary relay') ||
      role.includes('meo navigation') ||
      role.includes('orbital debris tracking') ||
      name.includes('earth observation')
    ) {
      return 'earth';
    }

    // Mars fleet crafts
    if (
      id.startsWith('ARES') ||
      id.startsWith('MARS') ||
      id.startsWith('PHOBOS') ||
      id.startsWith('DEIMOS') ||
      id.startsWith('AERO') ||
      id.startsWith('HOPE') ||
      id.startsWith('MAVEN') ||
      id.startsWith('TIANWEN') ||
      id.startsWith('ODYSSEY') ||
      role.includes('mars') ||
      role.includes('areo')
    ) {
      return 'mars';
    }

    // Lunar fleet crafts
    if (
      id.startsWith('CHANDRA') ||
      id.startsWith('LUNAR') ||
      id.startsWith('SELENA') ||
      id.startsWith('SELENE') ||
      id.startsWith('ARTEMIS') ||
      id.startsWith('MOON') ||
      id.startsWith('CHANG-E') ||
      role.includes('lunar') ||
      role.includes('seleno')
    ) {
      return 'lunar';
    }

    // Saturn fleet crafts
    if (
      id.startsWith('CHRONOS') ||
      id.startsWith('TITAN') ||
      id.startsWith('CASSINI') ||
      role.includes('saturn') ||
      role.includes('ring dynamics')
    ) {
      return 'saturn';
    }

    // Jupiter fleet crafts
    if (
      id.startsWith('JOVIAN') ||
      id.startsWith('EUROPA') ||
      id.startsWith('CALLISTO') ||
      id.startsWith('JUICE') ||
      role.includes('jupiter') ||
      role.includes('galilean')
    ) {
      return 'jupiter';
    }

    // Solar fleet crafts (heliocentric coronal missions)
    if (
      (id.startsWith('HELIOS') ||
        id.startsWith('PARKER') ||
        id.startsWith('ADITYA') ||
        id === 'SOLAR-STORM-01' ||
        id.startsWith('SOLAR-ORBITER')) &&
      !role.includes('earth')
    ) {
      return 'solar';
    }

    // Deep space crafts
    if (
      id.startsWith('ASTEROID') ||
      id.startsWith('DEEP-NAV') ||
      id.startsWith('VOYAGER') ||
      id.startsWith('PIONEER') ||
      id.startsWith('NEW-HORIZONS') ||
      role.includes('asteroid') ||
      role.includes('deep-space') ||
      role.includes('heliopause')
    ) {
      return 'deep_space';
    }
  }

  // Authoritative default fallback is ALWAYS Earth (never Sun)
  return 'earth';
}

/**
 * Builds a complete AuthoritativeVisualizationContext given active mission,
 * craft, and state sequence version.
 */
export function buildVisualizationContext(
  mission?: Partial<MissionResponse> | string | null,
  craft?: SpacecraftDetail | null,
  stateVersion: number = 1
): AuthoritativeVisualizationContext {
  const destinationBody = resolveDestinationBody(mission as any, craft);
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

