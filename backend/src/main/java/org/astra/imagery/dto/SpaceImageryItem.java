package org.astra.imagery.dto;

import java.util.List;

/**
 * Normalized representation of a single space imagery / media record from NASA's archive.
 */
public record SpaceImageryItem(
        String nasaId,
        String title,
        String description,
        String dateCreated,
        String mediaType,
        String center,
        String photographer,
        String secondaryCreator,
        List<String> keywords,
        String thumbnailUrl,
        String previewUrl,
        String assetManifestUrl,
        String attribution
) {}
