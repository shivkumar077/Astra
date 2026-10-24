package org.astra.core.math;

import java.util.Objects;

/**
 * Immutable three-dimensional Cartesian vector.
 * <p>
 * Standard Units in ASTRA Astrodynamics:
 * <ul>
 *   <li>Position vectors: kilometers [km]</li>
 *   <li>Velocity vectors: kilometers per second [km/s]</li>
 *   <li>Acceleration vectors: kilometers per second squared [km/s^2]</li>
 * </ul>
 * Coordinate frame convention is explicitly tracked at the orbit state level
 * (e.g. Earth-Centered Inertial ECI J2000).
 */
public record Vector3D(double x, double y, double z) {

    public static final Vector3D ZERO = new Vector3D(0.0, 0.0, 0.0);
    public static final Vector3D UNIT_X = new Vector3D(1.0, 0.0, 0.0);
    public static final Vector3D UNIT_Y = new Vector3D(0.0, 1.0, 0.0);
    public static final Vector3D UNIT_Z = new Vector3D(0.0, 0.0, 1.0);

    public Vector3D {
        if (Double.isNaN(x) || Double.isNaN(y) || Double.isNaN(z)) {
            throw new IllegalArgumentException("Vector3D components cannot be NaN: (" + x + ", " + y + ", " + z + ")");
        }
        if (Double.isInfinite(x) || Double.isInfinite(y) || Double.isInfinite(z)) {
            throw new IllegalArgumentException("Vector3D components cannot be infinite: (" + x + ", " + y + ", " + z + ")");
        }
        x = (x == 0.0) ? 0.0 : x;
        y = (y == 0.0) ? 0.0 : y;
        z = (z == 0.0) ? 0.0 : z;
    }

    public static Vector3D of(double x, double y, double z) {
        return new Vector3D(x, y, z);
    }

    public Vector3D add(Vector3D other) {
        Objects.requireNonNull(other, "other vector must not be null");
        return new Vector3D(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    public Vector3D subtract(Vector3D other) {
        Objects.requireNonNull(other, "other vector must not be null");
        return new Vector3D(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    public Vector3D multiply(double scalar) {
        return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    public Vector3D divide(double scalar) {
        if (scalar == 0.0) {
            throw new ArithmeticException("Division by zero in Vector3D");
        }
        return new Vector3D(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    public double dotProduct(Vector3D other) {
        Objects.requireNonNull(other, "other vector must not be null");
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    public Vector3D crossProduct(Vector3D other) {
        Objects.requireNonNull(other, "other vector must not be null");
        return new Vector3D(
                this.y * other.z - this.z * other.y,
                this.z * other.x - this.x * other.z,
                this.x * other.y - this.y * other.x
        );
    }

    public double norm() {
        return Math.sqrt(x * x + y * y + z * z);
    }

    public double normSq() {
        return x * x + y * y + z * z;
    }

    public Vector3D normalize() {
        double n = norm();
        if (n == 0.0) {
            throw new IllegalStateException("Cannot normalize a zero vector");
        }
        return divide(n);
    }

    public double distanceTo(Vector3D other) {
        return subtract(other).norm();
    }
}
