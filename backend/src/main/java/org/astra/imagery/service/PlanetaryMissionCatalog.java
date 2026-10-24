package org.astra.imagery.service;

import org.astra.imagery.dto.MissionMetadata;
import org.astra.imagery.dto.PlanetaryDestination;
import org.astra.imagery.dto.RoverMetadata;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Curated planetary journey and mission verification catalog.
 * Defines astronomical context, real verified missions, surface rovers,
 * source attributions, and alternating UI storytelling layout rules.
 */
@Component
public class PlanetaryMissionCatalog {

    private final Map<String, PlanetaryDestination> destinations;

    public PlanetaryMissionCatalog() {
        Map<String, PlanetaryDestination> map = new LinkedHashMap<>();

        // 0. The Sun
        map.put("sun", new PlanetaryDestination(
                "sun",
                "Sun",
                "STAR",
                0,
                "LEFT_PLANET",
                "The central star of the Solar System, an almost perfect sphere of hot plasma powered by nuclear fusion.",
                List.of(
                        new MissionMetadata("PARKER", "Parker Solar Probe", "NASA", 2018, "OPERATIONAL", "Sun",
                                "First spacecraft to fly through the Sun's corona, measuring magnetic fields and solar wind heating.", "Parker Solar Probe corona"),
                        new MissionMetadata("SOHO", "Solar and Heliospheric Observatory", "ESA / NASA", 1995, "OPERATIONAL", "Sun",
                                "Continuous helioseismic and coronal mass ejection observation stationed at Lagrange Point L1.", "SOHO solar flare CME"),
                        new MissionMetadata("SDO", "Solar Dynamics Observatory", "NASA", 2010, "OPERATIONAL", "Sun",
                                "High-cadence extreme ultraviolet imaging of the solar atmosphere and magnetic activity.", "Solar Dynamics Observatory AIA ultraviolet")
                ),
                Collections.emptyList(),
                List.of("Sun corona ultraviolet", "Solar flare coronal mass ejection", "Parker Solar Probe solar wind"),
                "NASA / SDO / SOHO / Parker Solar Probe Science Team",
                "Curated solar science archive. Operational statuses verified against NASA Heliophysics System Fleet standards."
        ));

        // 1. Mercury (Desktop: planet left, mission options right)
        map.put("mercury", new PlanetaryDestination(
                "mercury",
                "Mercury",
                "TERRESTRIAL_PLANET",
                1,
                "LEFT_PLANET",
                "The smallest and innermost planet, characterized by a cratered surface, extreme temperature swings, and an iron-rich core.",
                List.of(
                        new MissionMetadata("MESSENGER", "MESSENGER", "NASA", 2004, "COMPLETED", "Mercury",
                                "First probe to orbit Mercury (2011–2015), discovering water ice in permanently shadowed polar craters.", "MESSENGER Mercury orbital geology"),
                        new MissionMetadata("MARINER_10", "Mariner 10", "NASA", 1973, "COMPLETED", "Mercury",
                                "Pioneered interplanetary gravitational assists, completing three historic close flybys of Mercury.", "Mariner 10 Mercury encounter flyby"),
                        new MissionMetadata("BEPICOLOMBO", "BepiColombo", "ESA / JAXA", 2018, "OPERATIONAL", "Mercury",
                                "Dual-orbiter mission (MPO & Mio) currently executing gravity assists en route to Mercury orbit insertion.", "BepiColombo Mercury gravity assist")
                ),
                Collections.emptyList(),
                List.of("Mercury crater Caloris Basin", "MESSENGER Mercury global mosaic", "BepiColombo Mercury flyby"),
                "NASA / Johns Hopkins University Applied Physics Laboratory / Carnegie Institution of Washington / ESA",
                "Verified planetary data. Orbital insertion records and mission lifespans cross-referenced with NASA NSSDC Master Catalog."
        ));

        // 2. Venus (Desktop: planet right, mission options left)
        map.put("venus", new PlanetaryDestination(
                "venus",
                "Venus",
                "TERRESTRIAL_PLANET",
                2,
                "RIGHT_PLANET",
                "Earth's twin in size and mass, veiled by thick carbon dioxide clouds and experiencing runaway greenhouse surface heating.",
                List.of(
                        new MissionMetadata("MAGELLAN", "Magellan", "NASA", 1989, "COMPLETED", "Venus",
                                "Synthetic aperture radar mapping spacecraft that mapped 98% of the surface with 100-meter resolution.", "Magellan Venus radar surface mosaic"),
                        new MissionMetadata("AKATSUKI", "Akatsuki (PLANET-C)", "JAXA", 2010, "OPERATIONAL", "Venus",
                                "Climate orbiter investigating atmospheric super-rotation and sulfuric acid cloud dynamics.", "Akatsuki Venus ultraviolet atmosphere"),
                        new MissionMetadata("PIONEER_VENUS", "Pioneer Venus Orbiter", "NASA", 1978, "COMPLETED", "Venus",
                                "Conducted radar altimetry and upper-atmospheric composition studies over 14 years.", "Pioneer Venus atmospheric ultraviolet clouds")
                ),
                Collections.emptyList(),
                List.of("Venus surface radar Magellan", "Venus ultraviolet atmosphere Akatsuki", "Venus clouds greenhouse"),
                "NASA / JPL-Caltech / JAXA",
                "Verified mission profiles. Radar imagery distinguishes surface topographic maps from cloud-top ultraviolet photography."
        ));

        // 3. Earth (Desktop: planet left, mission options right)
        map.put("earth", new PlanetaryDestination(
                "earth",
                "Earth",
                "TERRESTRIAL_PLANET",
                3,
                "LEFT_PLANET",
                "The cradle of life, possessing liquid oceans, an active nitrogen-oxygen atmosphere, and a protective geomagnetic shield.",
                List.of(
                        new MissionMetadata("TERRA", "Terra (EOS AM-1)", "NASA", 1999, "OPERATIONAL", "Earth",
                                "Flagship Earth observing satellite monitoring global climate, land cover, and aerosol distributions via MODIS.", "Terra MODIS Earth observation"),
                        new MissionMetadata("AQUA", "Aqua (EOS PM-1)", "NASA", 2002, "OPERATIONAL", "Earth",
                                "Studies Earth's water cycle including ocean evaporation, atmospheric moisture, and polar ice extent.", "Aqua MODIS Earth ocean chlorophyll"),
                        new MissionMetadata("LANDSAT_9", "Landsat 9", "NASA / USGS", 2021, "OPERATIONAL", "Earth",
                                "Continues the 50-year unbroken optical and thermal land-imaging record with 15m panchromatic resolution.", "Landsat 9 Earth surface multispectral")
                ),
                Collections.emptyList(),
                List.of("Earth from space Blue Marble", "Earth atmosphere nighttime lights ISS", "Terra MODIS hurricane ocean"),
                "NASA Goddard Space Flight Center / USGS / NOAA",
                "Verified Earth Observation System (EOS) fleet records. Real multispectral and natural-color satellite captures."
        ));

        // 4. Mars (Desktop: planet right, mission options left)
        map.put("mars", new PlanetaryDestination(
                "mars",
                "Mars",
                "TERRESTRIAL_PLANET",
                4,
                "RIGHT_PLANET",
                "The Red Planet, home to vast shield volcanoes, deep rift canyons, and active exploration rovers seeking past habitability.",
                List.of(
                        new MissionMetadata("MARS_2020", "Mars 2020", "NASA", 2020, "OPERATIONAL", "Mars",
                                "Mission delivering the Perseverance rover and Ingenuity helicopter to explore Jezero Crater.", "Mars 2020 Perseverance rover landing"),
                        new MissionMetadata("MSL", "Mars Science Laboratory", "NASA", 2011, "OPERATIONAL", "Mars",
                                "Delivered Curiosity rover to Gale Crater to assess past microbial habitability and aqueous history.", "Curiosity rover Mount Sharp Gale Crater"),
                        new MissionMetadata("MRO", "Mars Reconnaissance Orbiter", "NASA", 2005, "OPERATIONAL", "Mars",
                                "High-resolution orbital reconnaissance providing 25 cm/pixel surface imagery via HiRISE camera.", "Mars Reconnaissance Orbiter HiRISE canyon dune")
                ),
                List.of(
                        new RoverMetadata("Perseverance", "Jezero Crater (18.38°N, 77.58°E)", 2021, "ACTIVE",
                                List.of("Mastcam-Z", "SuperCam", "PIXL", "SHERLOC", "MOXIE", "MEDA", "RIMFAX"),
                                "Perseverance rover Jezero Crater Mastcam"),
                        new RoverMetadata("Curiosity", "Gale Crater (4.59°S, 137.44°E)", 2012, "ACTIVE",
                                List.of("Mastcam", "ChemCam", "MAHLI", "APXS", "SAM", "CheMin", "RAD", "REMS"),
                                "Curiosity rover Gale Crater Mastcam selfie"),
                        new RoverMetadata("Opportunity", "Meridiani Planum", 2004, "MISSION_ACCOMPLISHED",
                                List.of("Pancam", "Microscopic Imager", "Mössbauer Spectrometer", "APXS"),
                                "Opportunity rover Meridiani Planum Victoria Crater"),
                        new RoverMetadata("Spirit", "Gusev Crater", 2004, "MISSION_ACCOMPLISHED",
                                List.of("Pancam", "Microscopic Imager", "Mössbauer Spectrometer", "APXS"),
                                "Spirit rover Columbia Hills Gusev Crater")
                ),
                List.of("Mars Perseverance rover Jezero", "Mars Curiosity rover Gale Crater", "Mars HiRISE Olympus Mons Valles Marineris"),
                "NASA / JPL-Caltech / MSSS / University of Arizona",
                "Verified surface and orbital assets. Rover coordinates and instrument suites verified against NASA Mars Exploration Program records."
        ));

        // 5. Jupiter (Desktop: planet left, mission options right)
        map.put("jupiter", new PlanetaryDestination(
                "jupiter",
                "Jupiter",
                "GAS_GIANT",
                5,
                "LEFT_PLANET",
                "The largest planet in the Solar System, possessing a storm-swept hydrogen-helium atmosphere, the Great Red Spot, and oceanic icy moons.",
                List.of(
                        new MissionMetadata("JUNO", "Juno", "NASA", 2011, "OPERATIONAL", "Jupiter",
                                "Polar orbiter probing deep atmospheric composition, magnetic dynamo, gravity fields, and the Jovian core.", "Juno Jupiter Great Red Spot JunoCam"),
                        new MissionMetadata("GALILEO", "Galileo", "NASA", 1989, "COMPLETED", "Jupiter",
                                "First spacecraft to orbit Jupiter (1995–2003) and deploy an atmospheric descent probe; discovered Europa's subsurface ocean.", "Galileo Jupiter Europa Io volcanic"),
                        new MissionMetadata("VOYAGER_1", "Voyager 1", "NASA", 1977, "COMPLETED", "Jupiter",
                                "Historic 1979 flyby discovering Jupiter's ring system and active volcanism on moon Io.", "Voyager 1 Jupiter encounter Great Red Spot")
                ),
                Collections.emptyList(),
                List.of("Jupiter Great Red Spot JunoCam", "Jupiter moon Europa ice surface", "Jupiter atmospheric storms belts"),
                "NASA / JPL-Caltech / SwRI / MSSS",
                "Verified outer planet data. Atmospheric storm imagery and Galilean satellite discoveries verified with SwRI Juno Science Team."
        ));

        // 6. Saturn (Desktop: planet right, mission options left)
        map.put("saturn", new PlanetaryDestination(
                "saturn",
                "Saturn",
                "GAS_GIANT",
                6,
                "RIGHT_PLANET",
                "The jewel of the Solar System, adorned with a spectacular ring system and hosting enigmatic worlds Titan and Enceladus.",
                List.of(
                        new MissionMetadata("CASSINI", "Cassini-Huygens", "NASA / ESA / ASI", 1997, "COMPLETED", "Saturn",
                                "Thirteen-year orbital odyssey (2004–2017) revealing Enceladus water geysers and landing Huygens probe on Titan.", "Cassini Saturn rings Enceladus plumes"),
                        new MissionMetadata("VOYAGER_2", "Voyager 2", "NASA", 1977, "COMPLETED", "Saturn",
                                "1981 close encounter mapping ring structures and photographing moons Mimas, Enceladus, and Tethys.", "Voyager 2 Saturn ring system encounter"),
                        new MissionMetadata("PIONEER_11", "Pioneer 11", "NASA", 1973, "COMPLETED", "Saturn",
                                "First spacecraft to visit Saturn in 1979, discovering the narrow F-ring and measuring magnetospheric radiation.", "Pioneer 11 Saturn flyby silhouette")
                ),
                Collections.emptyList(),
                List.of("Saturn rings Cassini mosaic", "Saturn moon Enceladus ice geysers", "Saturn moon Titan surface atmosphere"),
                "NASA / JPL-Caltech / Space Science Institute / ESA",
                "Verified mission archive. Ring geometry and cryovolcanic plume measurements cross-checked with Cassini Imaging Science Subsystem (ISS)."
        ));

        // 7. Uranus (Desktop: planet left, mission options right)
        map.put("uranus", new PlanetaryDestination(
                "uranus",
                "Uranus",
                "ICE_GIANT",
                7,
                "LEFT_PLANET",
                "An ice giant tipped on its side with a 98° axial tilt, surrounded by faint rings and fractured icy moons.",
                List.of(
                        new MissionMetadata("VOYAGER_2", "Voyager 2", "NASA", 1977, "COMPLETED", "Uranus",
                                "Sole spacecraft to date to encounter Uranus (January 1986), discovering 10 new moons, 2 rings, and the tilted magnetic field.", "Voyager 2 Uranus crescent flyby"),
                        new MissionMetadata("HST", "Hubble Space Telescope", "NASA / ESA", 1990, "OPERATIONAL", "Uranus",
                                "Ongoing long-term monitoring of seasonal atmospheric cloud activity, aurorae, and ring occultations.", "Hubble Uranus ring system aurora")
                ),
                Collections.emptyList(),
                List.of("Uranus Voyager 2 crescent true color", "Uranus Hubble Space Telescope ring aurora", "Uranus moon Miranda cliff canyon"),
                "NASA / JPL-Caltech / Space Telescope Science Institute",
                "Verified ice giant records. 1986 Voyager 2 flyby remains the only in-situ exploration; recent imaging provided by HST and JWST."
        ));

        // 8. Neptune (Desktop: planet right, mission options left)
        map.put("neptune", new PlanetaryDestination(
                "neptune",
                "Neptune",
                "ICE_GIANT",
                8,
                "RIGHT_PLANET",
                "The most distant major planet, an intensely blue ice giant swept by supersonic winds exceeding 2,100 km/h.",
                List.of(
                        new MissionMetadata("VOYAGER_2", "Voyager 2", "NASA", 1977, "COMPLETED", "Neptune",
                                "August 1989 historic encounter discovering the Great Dark Spot, high-altitude cirrus clouds, and active geysers on moon Triton.", "Voyager 2 Neptune Great Dark Spot Triton"),
                        new MissionMetadata("JWST", "James Webb Space Telescope", "NASA / ESA / CSA", 2021, "OPERATIONAL", "Neptune",
                                "Infrared imaging revealing crisp views of Neptune's dust rings and high-altitude methane ice clouds.", "JWST Neptune infrared rings Triton")
                ),
                Collections.emptyList(),
                List.of("Neptune Great Dark Spot Voyager 2", "Neptune rings JWST NIRCam", "Neptune moon Triton nitrogen geysers"),
                "NASA / JPL-Caltech / STScI / ESA",
                "Verified planetary data. Voyager 2 encounter metrics verified with NASA JPL Planetary Data System."
        ));

        this.destinations = Collections.unmodifiableMap(map);
    }

    public List<PlanetaryDestination> getAllDestinations() {
        return List.copyOf(destinations.values());
    }

    public Optional<PlanetaryDestination> getDestination(String id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(destinations.get(id.toLowerCase().trim()));
    }
}
