package org.astra.imagery.dto;

import java.util.List;

/**
 * Paginated search response for the ASTRA Space Imagery data gateway.
 */
public record SpaceImagerySearchResult(
        String query,
        int page,
        int pageSize,
        long totalHits,
        int totalPages,
        boolean hasMore,
        List<SpaceImageryItem> items
) {}
