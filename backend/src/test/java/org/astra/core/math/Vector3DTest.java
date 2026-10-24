package org.astra.core.math;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Vector3D Mathematical Invariants")
class Vector3DTest {

    @Test
    @DisplayName("Vector addition, subtraction and scaling are exact")
    void testBasicLinearAlgebra() {
        Vector3D v1 = new Vector3D(1.0, 2.0, 3.0);
        Vector3D v2 = new Vector3D(4.0, 5.0, 6.0);

        Vector3D sum = v1.add(v2);
        assertThat(sum).isEqualTo(new Vector3D(5.0, 7.0, 9.0));

        Vector3D diff = v2.subtract(v1);
        assertThat(diff).isEqualTo(new Vector3D(3.0, 3.0, 3.0));

        Vector3D scaled = v1.multiply(2.5);
        assertThat(scaled).isEqualTo(new Vector3D(2.5, 5.0, 7.5));

        Vector3D divided = v2.divide(2.0);
        assertThat(divided).isEqualTo(new Vector3D(2.0, 2.5, 3.0));
    }

    @Test
    @DisplayName("Dot product and cross product obey Euclidean geometry")
    void testDotAndCrossProduct() {
        Vector3D i = Vector3D.UNIT_X;
        Vector3D j = Vector3D.UNIT_Y;
        Vector3D k = Vector3D.UNIT_Z;

        // Orthogonal unit vectors
        assertThat(i.dotProduct(j)).isEqualTo(0.0);
        assertThat(i.dotProduct(i)).isEqualTo(1.0);

        // Right-hand rule cross products
        assertThat(i.crossProduct(j)).isEqualTo(k);
        assertThat(j.crossProduct(k)).isEqualTo(i);
        assertThat(k.crossProduct(i)).isEqualTo(j);

        // Anti-commutativity
        assertThat(j.crossProduct(i)).isEqualTo(k.multiply(-1.0));
    }

    @Test
    @DisplayName("Norm and normalization compute correct Euclidean magnitude")
    void testNormAndNormalization() {
        Vector3D v = new Vector3D(3.0, 4.0, 0.0);
        assertThat(v.norm()).isEqualTo(5.0);
        assertThat(v.normSq()).isEqualTo(25.0);

        Vector3D unit = v.normalize();
        assertThat(unit.norm()).isCloseTo(1.0, within(1.0e-12));
        assertThat(unit.x()).isCloseTo(0.6, within(1.0e-12));
        assertThat(unit.y()).isCloseTo(0.8, within(1.0e-12));
    }

    @Test
    @DisplayName("Rejects NaN, infinite components and zero-division")
    void testValidation() {
        assertThatThrownBy(() -> new Vector3D(Double.NaN, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Vector3D(0.0, Double.POSITIVE_INFINITY, 0.0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Vector3D.ZERO.normalize())
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> Vector3D.UNIT_X.divide(0.0))
                .isInstanceOf(ArithmeticException.class);
    }
}
