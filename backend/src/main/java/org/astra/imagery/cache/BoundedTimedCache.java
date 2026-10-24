package org.astra.imagery.cache;

import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Thread-safe, bounded, in-memory cache with Time-To-Live (TTL) expiration.
 * Evicts least-recently-used items when capacity limit is reached.
 *
 * @param <K> Key type
 * @param <V> Value type
 */
public class BoundedTimedCache<K, V> {

    private final int maxCapacity;
    private final Duration ttl;
    private final Map<K, CacheEntry<V>> map;
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

    public BoundedTimedCache(int maxCapacity, Duration ttl) {
        if (maxCapacity <= 0) {
            throw new IllegalArgumentException("maxCapacity must be > 0");
        }
        if (ttl == null || ttl.isNegative() || ttl.isZero()) {
            throw new IllegalArgumentException("ttl must be positive");
        }
        this.maxCapacity = maxCapacity;
        this.ttl = ttl;
        // LinkedHashMap in access-order mode (true) for LRU eviction
        this.map = new LinkedHashMap<>(Math.min(maxCapacity, 64), 0.75f, true);
    }

    public Optional<V> get(K key) {
        if (key == null) {
            return Optional.empty();
        }
        rwLock.writeLock().lock();
        try {
            CacheEntry<V> entry = map.get(key);
            if (entry == null) {
                return Optional.empty();
            }
            if (entry.isExpired()) {
                map.remove(key);
                return Optional.empty();
            }
            return Optional.of(entry.value());
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public void put(K key, V value) {
        if (key == null || value == null) {
            return;
        }
        rwLock.writeLock().lock();
        try {
            pruneExpiredInternal();
            if (map.size() >= maxCapacity && !map.containsKey(key)) {
                // Remove least recently used entry (first entry in LinkedHashMap)
                Iterator<K> iterator = map.keySet().iterator();
                if (iterator.hasNext()) {
                    iterator.next();
                    iterator.remove();
                }
            }
            map.put(key, new CacheEntry<>(value, Instant.now().plus(ttl)));
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public int size() {
        rwLock.readLock().lock();
        try {
            return map.size();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public void clear() {
        rwLock.writeLock().lock();
        try {
            map.clear();
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    private void pruneExpiredInternal() {
        Instant now = Instant.now();
        map.values().removeIf(entry -> entry.expiresAt().isBefore(now));
    }

    private record CacheEntry<V>(V value, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
