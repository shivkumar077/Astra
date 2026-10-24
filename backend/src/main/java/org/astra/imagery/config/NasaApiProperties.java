package org.astra.imagery.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for external NASA Image and Video Library gateway.
 */
@Configuration
@ConfigurationProperties(prefix = "astra.imagery.nasa")
public class NasaApiProperties {

    /**
     * Upstream NASA Image and Video Library API base URL.
     * Documented at: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
     */
    private String baseUrl = "https://images-api.nasa.gov";

    /**
     * Connection timeout in milliseconds.
     */
    private int connectTimeoutMs = 5000;

    /**
     * Read timeout in milliseconds.
     */
    private int readTimeoutMs = 10000;

    /**
     * Cache Time-To-Live in seconds for search and asset metadata queries.
     */
    private int cacheTtlSeconds = 900;

    /**
     * Maximum capacity of in-memory cache entries.
     */
    private int cacheMaxEntries = 500;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public int getCacheTtlSeconds() {
        return cacheTtlSeconds;
    }

    public void setCacheTtlSeconds(int cacheTtlSeconds) {
        this.cacheTtlSeconds = cacheTtlSeconds;
    }

    public int getCacheMaxEntries() {
        return cacheMaxEntries;
    }

    public void setCacheMaxEntries(int cacheMaxEntries) {
        this.cacheMaxEntries = cacheMaxEntries;
    }
}
