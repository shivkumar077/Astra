package org.astra.imagery.client;

import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetResponse;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaSearchResponse;

import java.util.Optional;

/**
 * Interface for interacting with NASA's Image and Video Library API.
 */
public interface NasaImageLibraryClient {

    /**
     * Search NASA's public media library.
     */
    NasaSearchResponse search(
            String query,
            int page,
            String mediaType,
            Integer yearStart,
            Integer yearEnd,
            String center
    );

    /**
     * Retrieve asset manifest links for a media item.
     */
    NasaAssetResponse getAssetManifest(String nasaId);

    /**
     * Retrieve single record details by NASA ID.
     */
    Optional<NasaItem> getRecord(String nasaId);
}
