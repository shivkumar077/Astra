package org.astra.imagery.client;

import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetResponse;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaSearchResponse;
import org.astra.imagery.config.NasaApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/**
 * Default implementation of {@link NasaImageLibraryClient} integrating NASA's Image and Video Library.
 * Reference: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
 */
@Component
public class DefaultNasaImageLibraryClient implements NasaImageLibraryClient {

    private static final Logger log = LoggerFactory.getLogger(DefaultNasaImageLibraryClient.class);

    private final RestClient restClient;
    private final NasaApiProperties properties;

    @Autowired
    public DefaultNasaImageLibraryClient(NasaApiProperties properties) {
        this(properties, createDefaultRestClient(properties));
    }

    DefaultNasaImageLibraryClient(NasaApiProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient(NasaApiProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMs()));

        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public NasaSearchResponse search(
            String query,
            int page,
            String mediaType,
            Integer yearStart,
            Integer yearEnd,
            String center
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .path("/search")
                .queryParam("q", query)
                .queryParam("page", page);

        if (mediaType != null && !mediaType.isBlank()) {
            builder.queryParam("media_type", mediaType);
        }
        if (yearStart != null) {
            builder.queryParam("year_start", yearStart);
        }
        if (yearEnd != null) {
            builder.queryParam("year_end", yearEnd);
        }
        if (center != null && !center.isBlank()) {
            builder.queryParam("center", center);
        }

        URI uri = builder.build().encode().toUri();
        log.debug("Executing NASA search query against: {}", uri);

        try {
            NasaSearchResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(NasaSearchResponse.class);

            return response != null ? response : new NasaSearchResponse(null);
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("NASA search returned 404 for URI: {}", uri);
            return new NasaSearchResponse(null);
        } catch (ResourceAccessException e) {
            log.error("Timeout or network error communicating with NASA API at {}: {}", uri, e.getMessage());
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "NASA Image Library connection timed out: " + e.getMessage());
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("NASA API returned error status {} for URI {}: {}", e.getStatusCode(), uri, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "NASA Image Library upstream error (" + e.getStatusCode() + "): " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error executing NASA search query for {}: {}", uri, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to query NASA Image Library: " + e.getMessage());
        }
    }

    @Override
    public NasaAssetResponse getAssetManifest(String nasaId) {
        if (nasaId == null || nasaId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nasaId must not be blank");
        }

        URI uri = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .path("/asset/{nasaId}")
                .buildAndExpand(nasaId)
                .encode()
                .toUri();

        log.debug("Fetching NASA asset manifest for ID: {}", nasaId);

        try {
            NasaAssetResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(NasaAssetResponse.class);

            if (response == null || response.itemsOrEmpty().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No asset manifest found for NASA media ID: " + nasaId);
            }
            return response;
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("NASA asset manifest not found for ID: {}", nasaId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "NASA media record not found: " + nasaId);
        } catch (ResourceAccessException e) {
            log.error("Timeout connecting to NASA asset endpoint for {}: {}", nasaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "NASA asset service timed out: " + e.getMessage());
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("NASA API returned status {} for asset manifest {}: {}", e.getStatusCode(), nasaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "NASA asset service returned error (" + e.getStatusCode() + ")");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error fetching NASA asset manifest for {}: {}", nasaId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to retrieve NASA asset manifest: " + e.getMessage());
        }
    }

    @Override
    public Optional<NasaItem> getRecord(String nasaId) {
        if (nasaId == null || nasaId.isBlank()) {
            return Optional.empty();
        }

        URI uri = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .path("/search")
                .queryParam("nasa_id", nasaId)
                .build()
                .encode()
                .toUri();

        try {
            NasaSearchResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(NasaSearchResponse.class);

            if (response != null && response.collection() != null && !response.collection().itemsOrEmpty().isEmpty()) {
                return Optional.of(response.collection().itemsOrEmpty().get(0));
            }
            return Optional.empty();
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (ResourceAccessException e) {
            log.error("Timeout fetching record for {}: {}", nasaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "NASA service timed out: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error retrieving NASA record for {}: {}", nasaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to retrieve NASA record: " + e.getMessage());
        }
    }
}
