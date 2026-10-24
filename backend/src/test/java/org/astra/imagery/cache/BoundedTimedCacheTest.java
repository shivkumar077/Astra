package org.astra.imagery.cache;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BoundedTimedCacheTest {

    @Test
    @DisplayName("Should put and retrieve items within TTL")
    void testPutAndGet() {
        BoundedTimedCache<String, String> cache = new BoundedTimedCache<>(10, Duration.ofMinutes(5));
        cache.put("key1", "val1");
        cache.put("key2", "val2");

        assertThat(cache.get("key1")).contains("val1");
        assertThat(cache.get("key2")).contains("val2");
        assertThat(cache.get("nonexistent")).isEmpty();
        assertThat(cache.size()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should evict least recently used entry when max capacity is exceeded")
    void testCapacityEviction() {
        BoundedTimedCache<String, Integer> cache = new BoundedTimedCache<>(2, Duration.ofMinutes(5));
        cache.put("a", 1);
        cache.put("b", 2);

        // Access "a" to mark it recently used
        assertThat(cache.get("a")).contains(1);

        // Insert "c" - should evict "b" since "a" was accessed more recently
        cache.put("c", 3);

        assertThat(cache.get("a")).contains(1);
        assertThat(cache.get("b")).isEmpty();
        assertThat(cache.get("c")).contains(3);
        assertThat(cache.size()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should expire entries after TTL elapses")
    void testTtlExpiration() throws InterruptedException {
        BoundedTimedCache<String, String> cache = new BoundedTimedCache<>(10, Duration.ofMillis(30));
        cache.put("ephemeral", "data");

        assertThat(cache.get("ephemeral")).contains("data");

        Thread.sleep(50);

        assertThat(cache.get("ephemeral")).isEmpty();
        assertThat(cache.size()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should handle null keys and values safely")
    void testNullSafety() {
        BoundedTimedCache<String, String> cache = new BoundedTimedCache<>(5, Duration.ofMinutes(1));
        cache.put(null, "val");
        cache.put("key", null);

        assertThat(cache.size()).isEqualTo(0);
        assertThat(cache.get(null)).isEmpty();
    }

    @Test
    @DisplayName("Should reject invalid constructor parameters")
    void testConstructorValidation() {
        assertThatThrownBy(() -> new BoundedTimedCache<>(0, Duration.ofMinutes(1)))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> new BoundedTimedCache<>(5, Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
