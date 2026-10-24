package org.astra.imagery.dto;

import java.util.List;

/**
 * Normalized asset manifest and links for an individual NASA media record.
 */
public record SpaceImageryAssetManifest(
        String nasaId,
        String originalAssetUrl,
        String largeAssetUrl,
        String mediumAssetUrl,
        String smallAssetUrl,
        String thumbnailAssetUrl,
        List<SpaceImageryAsset> assets
) {
    public record SpaceImageryAsset(
            String href,
            String sizeCategory,
            String fileExtension
    ) {}
}
