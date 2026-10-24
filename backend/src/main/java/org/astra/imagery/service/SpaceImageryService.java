package org.astra.imagery.service;

import org.astra.imagery.cache.BoundedTimedCache;
import org.astra.imagery.client.NasaImageLibraryClient;
import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetResponse;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItemData;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItemLink;
import org.astra.imagery.client.dto.NasaRawDtos.NasaSearchResponse;
import org.astra.imagery.config.NasaApiProperties;
import org.astra.imagery.dto.PlanetaryDestination;
import org.astra.imagery.dto.SpaceImageryAssetManifest;
import org.astra.imagery.dto.SpaceImageryAssetManifest.SpaceImageryAsset;
import org.astra.imagery.dto.SpaceImageryItem;
import org.astra.imagery.dto.SpaceImagerySearchRequest;
import org.astra.imagery.dto.SpaceImagerySearchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Core service managing space imagery search, media asset retrieval, caching,
 * and planetary destination discovery.
 */
@Service
public class SpaceImageryService {

    private static final Logger log = LoggerFactory.getLogger(SpaceImageryService.class);

    private final NasaImageLibraryClient nasaClient;
    private final PlanetaryMissionCatalog catalog;
    private final BoundedTimedCache<String, SpaceImagerySearchResult> searchCache;
    private final BoundedTimedCache<String, SpaceImageryAssetManifest> assetCache;
    private final BoundedTimedCache<String, SpaceImageryItem> recordCache;

    public SpaceImageryService(NasaImageLibraryClient nasaClient, PlanetaryMissionCatalog catalog, NasaApiProperties properties) {
        this.nasaClient = nasaClient;
        this.catalog = catalog;

        Duration ttl = Duration.ofSeconds(properties.getCacheTtlSeconds());
        int maxCapacity = properties.getCacheMaxEntries();

        this.searchCache = new BoundedTimedCache<>(maxCapacity, ttl);
        this.assetCache = new BoundedTimedCache<>(maxCapacity, ttl);
        this.recordCache = new BoundedTimedCache<>(maxCapacity, ttl);
    }

    /**
     * Search NASA's public media library with query, pagination, and media filters.
     */
    public SpaceImagerySearchResult search(SpaceImagerySearchRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search request must not be null");
        }

        String effectiveQuery = request.query() != null ? request.query().trim() : "";
        if (effectiveQuery.isBlank() && request.planet() != null && !request.planet().isBlank()) {
            Optional<PlanetaryDestination> dest = catalog.getDestination(request.planet());
            effectiveQuery = dest.map(d -> !d.presetQueries().isEmpty() ? d.presetQueries().get(0) : d.name())
                    .orElse(request.planet());
        }

        if (effectiveQuery.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search query must not be blank");
        }

        int page = request.page() != null ? Math.max(request.page(), 1) : 1;
        int pageSize = request.pageSize() != null ? Math.min(Math.max(request.pageSize(), 1), 100) : 20;

        String cacheKey = buildSearchCacheKey(effectiveQuery, page, pageSize, request.mediaType(),
                request.yearStart(), request.yearEnd(), request.center());

        Optional<SpaceImagerySearchResult> cached = searchCache.get(cacheKey);
        if (cached.isPresent()) {
            log.debug("Serving space imagery search from cache for key: {}", cacheKey);
            return cached.get();
        }

        NasaSearchResponse rawResponse = nasaClient.search(
                effectiveQuery,
                page,
                request.mediaType(),
                request.yearStart(),
                request.yearEnd(),
                request.center()
        );

        long totalHits = rawResponse.collectionOrEmpty().totalHits();
        List<NasaItem> rawItems = rawResponse.collectionOrEmpty().itemsOrEmpty();

        List<SpaceImageryItem> mappedItems = new ArrayList<>();
        for (NasaItem item : rawItems) {
            mapItem(item).ifPresent(mappedItems::add);
            if (mappedItems.size() >= pageSize) {
                break;
            }
        }

        int totalPages = totalHits > 0 ? (int) Math.ceil((double) totalHits / pageSize) : 0;
        boolean hasMore = page < totalPages;

        SpaceImagerySearchResult result = new SpaceImagerySearchResult(
                effectiveQuery,
                page,
                pageSize,
                totalHits,
                totalPages,
                hasMore,
                Collections.unmodifiableList(mappedItems)
        );

        searchCache.put(cacheKey, result);
        return result;
    }

    /**
     * Retrieve available asset links (original, large, medium, small, thumb, metadata) for a NASA media item.
     */
    public SpaceImageryAssetManifest getAssetManifest(String nasaId) {
        if (nasaId == null || nasaId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nasaId must not be blank");
        }

        String normalizedId = nasaId.trim();
        String cacheKey = "asset:" + normalizedId;

        Optional<SpaceImageryAssetManifest> cached = assetCache.get(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        NasaAssetResponse rawResponse = nasaClient.getAssetManifest(normalizedId);
        List<NasaAssetItem> rawItems = rawResponse.itemsOrEmpty();

        String origUrl = null;
        String largeUrl = null;
        String mediumUrl = null;
        String smallUrl = null;
        String thumbUrl = null;
        List<SpaceImageryAsset> assetList = new ArrayList<>();

        for (NasaAssetItem item : rawItems) {
            String href = item.href();
            if (href == null || href.isBlank()) continue;

            String lower = href.toLowerCase();
            String category = "OTHER";
            String extension = extractExtension(lower);

            if (lower.contains("~orig.") || lower.endsWith("~orig.jpg") || lower.endsWith("~orig.tif") || lower.endsWith("~orig.png")) {
                category = "ORIGINAL";
                if (origUrl == null) origUrl = href;
            } else if (lower.contains("~large.")) {
                category = "LARGE";
                if (largeUrl == null) largeUrl = href;
            } else if (lower.contains("~medium.")) {
                category = "MEDIUM";
                if (mediumUrl == null) mediumUrl = href;
            } else if (lower.contains("~small.")) {
                category = "SMALL";
                if (smallUrl == null) smallUrl = href;
            } else if (lower.contains("~thumb.")) {
                category = "THUMB";
                if (thumbUrl == null) thumbUrl = href;
            } else if (lower.endsWith("metadata.json")) {
                category = "METADATA";
            } else if (lower.endsWith(".srt") || lower.endsWith(".vtt")) {
                category = "CAPTION";
            }

            assetList.add(new SpaceImageryAsset(href, category, extension));
        }

        // Fallback cascades if specific sizes are omitted by NASA
        if (mediumUrl == null && largeUrl != null) mediumUrl = largeUrl;
        if (mediumUrl == null && origUrl != null && !origUrl.endsWith(".tif")) mediumUrl = origUrl;
        if (thumbUrl == null && smallUrl != null) thumbUrl = smallUrl;

        SpaceImageryAssetManifest manifest = new SpaceImageryAssetManifest(
                normalizedId,
                origUrl,
                largeUrl,
                mediumUrl,
                smallUrl,
                thumbUrl,
                Collections.unmodifiableList(assetList)
        );

        assetCache.put(cacheKey, manifest);
        return manifest;
    }

    /**
     * Retrieve single record details by NASA ID.
     */
    public SpaceImageryItem getRecord(String nasaId) {
        if (nasaId == null || nasaId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nasaId must not be blank");
        }

        String normalizedId = nasaId.trim();
        String cacheKey = "record:" + normalizedId;

        Optional<SpaceImageryItem> cached = recordCache.get(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        Optional<NasaItem> rawItem = nasaClient.getRecord(normalizedId);
        if (rawItem.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media record not found in NASA archive: " + normalizedId);
        }

        Optional<SpaceImageryItem> mapped = mapItem(rawItem.get());
        if (mapped.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Malformed or empty NASA record for: " + normalizedId);
        }

        SpaceImageryItem item = mapped.get();
        recordCache.put(cacheKey, item);
        return item;
    }

    /**
     * Retrieve all 9 verified celestial destinations (Sun + 8 planets) with UI storytelling layout rules.
     */
    public List<PlanetaryDestination> getAllDestinations() {
        return catalog.getAllDestinations();
    }

    /**
     * Retrieve a specific planetary destination by ID (e.g. "mars", "jupiter").
     */
    public PlanetaryDestination getDestination(String destinationId) {
        return catalog.getDestination(destinationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Planetary destination not found: " + destinationId));
    }

    /**
     * Retrieve curated featured imagery for a destination using verified search presets.
     */
    public SpaceImagerySearchResult getFeaturedImageryForDestination(String destinationId) {
        PlanetaryDestination destination = getDestination(destinationId);
        String query = !destination.presetQueries().isEmpty()
                ? destination.presetQueries().get(0)
                : destination.name() + " planet";

        SpaceImagerySearchRequest request = new SpaceImagerySearchRequest(
                query,
                1,
                12,
                "image",
                null,
                null,
                null,
                destination.id()
        );

        return search(request);
    }

    private Optional<SpaceImageryItem> mapItem(NasaItem item) {
        if (item == null) return Optional.empty();
        NasaItemData data = item.firstDataOrNull();
        if (data == null || data.nasaId() == null || data.nasaId().isBlank()) {
            return Optional.empty();
        }

        String thumbUrl = null;
        String previewUrl = null;

        for (NasaItemLink link : item.linksOrEmpty()) {
            if (link.href() == null) continue;
            String href = link.href();
            if ("preview".equalsIgnoreCase(link.rel()) || href.contains("~thumb")) {
                if (thumbUrl == null) thumbUrl = href;
            } else if (href.contains("~medium") || href.contains("~large")) {
                if (previewUrl == null) previewUrl = href;
            }
        }

        if (previewUrl == null && thumbUrl != null) {
            previewUrl = thumbUrl;
        }

        String attribution = buildAttribution(data);

        return Optional.of(new SpaceImageryItem(
                data.nasaId(),
                data.title() != null ? data.title() : "Untitled NASA Archive Media",
                data.effectiveDescription(),
                data.dateCreated(),
                data.mediaType() != null ? data.mediaType() : "image",
                data.center(),
                data.photographer(),
                data.secondaryCreator(),
                data.keywordsOrEmpty(),
                thumbUrl,
                previewUrl,
                item.href(),
                attribution
        ));
    }

    private String buildAttribution(NasaItemData data) {
        StringBuilder sb = new StringBuilder("NASA");
        if (data.center() != null && !data.center().isBlank()) {
            sb.append(" / ").append(data.center());
        }
        if (data.photographer() != null && !data.photographer().isBlank()) {
            sb.append(" (Photo: ").append(data.photographer()).append(")");
        } else if (data.secondaryCreator() != null && !data.secondaryCreator().isBlank()) {
            sb.append(" (Credit: ").append(data.secondaryCreator()).append(")");
        }
        return sb.toString();
    }

    private String extractExtension(String url) {
        int dotIdx = url.lastIndexOf('.');
        if (dotIdx != -1 && dotIdx < url.length() - 1) {
            String ext = url.substring(dotIdx + 1);
            int qIdx = ext.indexOf('?');
            return qIdx != -1 ? ext.substring(0, qIdx) : ext;
        }
        return "unknown";
    }

    private String buildSearchCacheKey(String q, int page, int pageSize, String media, Integer ys, Integer ye, String center) {
        return "search:" + q.trim().toLowerCase() +
                ":p" + page +
                ":ps" + pageSize +
                ":m" + (media != null ? media : "all") +
                ":ys" + (ys != null ? ys : 0) +
                ":ye" + (ye != null ? ye : 0) +
                ":c" + (center != null ? center.trim().toLowerCase() : "all");
    }
}
