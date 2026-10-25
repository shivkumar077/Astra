package org.astra.core.math;

/**
 * Fundamental astrodynamical and physical constants for planetary satellite simulation.
 * <p>
 * Reference Standards:
 * <ul>
 *   <li>WGS 84 / EGM96 Earth Gravitational Model</li>
 *   <li>IERS Numerical Standards</li>
 * </ul>
 */
public final class AstroConstants {

    private AstroConstants() {
        // Prevent instantiation of constants utility
    }

    /**
     * Standard gravitational parameter of Earth (&mu; = GM_earth) in km^3 / s^2.
     * WGS 84 / IERS 2010 standard value.
     */
    public static final double EARTH_MU_KM3_S2 = 398600.4418;

    /**
     * Equatorial radius of the Earth (WGS 84 semi-major axis) in kilometers [km].
     */
    public static final double EARTH_EQUATORIAL_RADIUS_KM = 6378.137;

    /**
     * Earth flattening factor (WGS 84).
     */
    public static final double EARTH_FLATTENING = 1.0 / 298.257223563;

    /**
     * Earth polar radius in kilometers [km].
     */
    public static final double EARTH_POLAR_RADIUS_KM = EARTH_EQUATORIAL_RADIUS_KM * (1.0 - EARTH_FLATTENING);

    /**
     * Mean solar radius in kilometers [km].
     */
    public static final double SUN_RADIUS_KM = 696340.0;

    /**
     * Astronomical Unit in kilometers [km].
     */
    public static final double ASTRONOMICAL_UNIT_KM = 149597870.7;

    /**
     * Standard vacuum speed of light in kilometers per second [km/s].
     */
    public static final double SPEED_OF_LIGHT_KM_S = 299792.458;

    /**
     * Standard solar flux constant at 1 AU in Watts per square meter [W/m^2].
     */
    public static final double SOLAR_FLUX_1AU_W_M2 = 1361.0;

    /**
     * Seconds in one standard Julian day.
     */
    public static final double SECONDS_PER_DAY = 86400.0;

    /**
     * Earth rotational angular velocity (&omega;_earth) in radians per second [rad/s].
     * (360 degrees per sidereal day: 86164.0905 seconds)
     */
    public static final double EARTH_ROTATION_RATE_RAD_S = 7.292115e-5;

    /**
     * Standard gravitational parameter of Mars (&mu; = GM_mars) in km^3 / s^2.
     * NASA JPL Planetary Data System value.
     */
    public static final double MARS_MU_KM3_S2 = 42828.3752;

    /**
     * Mean volumetric radius of Mars in kilometers [km].
     */
    public static final double MARS_EQUATORIAL_RADIUS_KM = 3396.2;

    /**
     * Standard gravitational parameter of Earth's Moon (&mu; = GM_moon) in km^3 / s^2.
     */
    public static final double MOON_MU_KM3_S2 = 4902.800066;

    /**
     * Mean radius of Earth's Moon in kilometers [km].
     */
    public static final double MOON_RADIUS_KM = 1737.4;

    /**
     * Standard gravitational parameter of Jupiter (&mu; = GM_jupiter) in km^3 / s^2.
     */
    public static final double JUPITER_MU_KM3_S2 = 126686534.0;

    /**
     * Equatorial radius of Jupiter in kilometers [km].
     */
    public static final double JUPITER_EQUATORIAL_RADIUS_KM = 71492.0;
}
