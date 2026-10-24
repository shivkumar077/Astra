package org.astra.imagery.service;

import org.astra.imagery.client.NasaImageLibraryClient;
import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetCollection;
import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetResponse;
import org.astra.imagery.client.dto.NasaRawDtos.NasaCollection;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItemData;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItemLink;
import org.astra.imagery.client.dto.NasaRawDtos.NasaMetadata;
import org.astra.imagery.client.dto.NasaRawDtos.NasaSearchResponse;
import org.astra.imagery.config.NasaApiProperties;
import org.astra.imagery.dto.PlanetaryDestination;
import org.astra.imagery.dto.SpaceImageryAssetManifest;
import org.astra.imagery.dto.SpaceImageryItem;
import org.astra.imagery.dto.SpaceImagerySearchRequest;
import org.astra.imagery.dto.SpaceImagerySearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpaceImageryServiceTest {

    @Mock
    private NasaImageLibraryClient nasaClient;

    private PlanetaryMissionCatalog catalog;
    private NasaApiProperties properties;
    private SpaceImageryService service;

    @BeforeEach
    void setUp() {
        catalog = new PlanetaryMissionCatalog();
        properties = new NasaApiProperties();
        properties.setCacheTtlSeconds(300);
        properties.setCacheMaxEntries(100);
        service = new SpaceImageryService(nasaClient, catalog, properties);
    }

    @Test
    @DisplayName("Should successfully search NASA imagery and cache identical requests")
    void testSearchAndCache() {
        NasaItemData data = new NasaItemData(
                "JPL", "Perseverance Landing", "PIA24424", "image",
                "2021-02-18T20:55:00Z", "Mars 2020 rover touching down on Mars.",
                null, List.of("Mars", "Perseverance", "Jezero"),
                null, "NASA/JPL-Caltech", null
        );
        NasaItemLink thumbLink = new NasaItemLink(
                "https://images-assets.nasa.gov/image/PIA24424/PIA24424~thumb.jpg",
                "preview", "image", 640, 360, 20000L
        );
        NasaItemLink medLink = new NasaItemLink(
                "https://images-assets.nasa.gov/image/PIA24424/PIA24424~medium.jpg",
                "alternate", "image", 1280, 720, 80000L
        );
        NasaItem item = new NasaItem(
                "https://images-assets.nasa.gov/image/PIA24424/collection.json",
                List.of(data),
                List.of(thumbLink, medLink)
        );
        NasaCollection collection = new NasaCollection(
                "1.0", "http://search", List.of(item), new NasaMetadata(1L), List.of()
        );
        NasaSearchResponse rawResponse = new NasaSearchResponse(collection);

        when(nasaClient.search(eq("Perseverance"), eq(1), eq("image"), any(), any(), any()))
                .thenReturn(rawResponse);

        SpaceImagerySearchRequest request = new SpaceImagerySearchRequest("Perseverance", 1, 10, "image", null, null, null, null);

        // First call - should query NASA client
        SpaceImagerySearchResult result1 = service.search(request);
        assertThat(result1.totalHits()).isEqualTo(1L);
        assertThat(result1.items()).hasSize(1);
        SpaceImageryItem mapped = result1.items().get(0);
        assertThat(mapped.nasaId()).isEqualTo("PIA24424");
        assertThat(mapped.title()).isEqualTo("Perseverance Landing");
        assertThat(mapped.thumbnailUrl()).contains("~thumb.jpg");
        assertThat(mapped.previewUrl()).contains("~medium.jpg");
        assertThat(mapped.attribution()).contains("NASA / JPL");

        // Second call with same parameters - should return cached result without hitting client again
        SpaceImagerySearchResult result2 = service.search(request);
        assertThat(result2.items()).hasSize(1);
        verify(nasaClient, times(1)).search(any(), anyInt(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should categorize and structure NASA asset manifests correctly")
    void testGetAssetManifest() {
        NasaAssetResponse rawAssets = new NasaAssetResponse(new NasaAssetCollection(
                "1.0", "http://asset",
                List.of(
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.tif"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/PIA24424~large.jpg"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/PIA24424~medium.jpg"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/PIA24424~small.jpg"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/PIA24424~thumb.jpg"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA24424/metadata.json")
                )
        ));

        when(nasaClient.getAssetManifest("PIA24424")).thenReturn(rawAssets);

        SpaceImageryAssetManifest manifest = service.getAssetManifest("PIA24424");
        assertThat(manifest.nasaId()).isEqualTo("PIA24424");
        assertThat(manifest.originalAssetUrl()).contains("~orig.tif");
        assertThat(manifest.largeAssetUrl()).contains("~large.jpg");
        assertThat(manifest.mediumAssetUrl()).contains("~medium.jpg");
        assertThat(manifest.smallAssetUrl()).contains("~small.jpg");
        assertThat(manifest.thumbnailAssetUrl()).contains("~thumb.jpg");
        assertThat(manifest.assets()).hasSize(6);

        // Second call should serve from cache
        SpaceImageryAssetManifest cached = service.getAssetManifest("PIA24424");
        assertThat(cached.nasaId()).isEqualTo("PIA24424");
        verify(nasaClient, times(1)).getAssetManifest("PIA24424");
    }

    @Test
    @DisplayName("Should retrieve single record details by NASA ID")
    void testGetRecord() {
        NasaItemData data = new NasaItemData(
                "GSFC", "Hubble Deep Field", "STScI-PRC1996-01a", "image",
                "1996-01-15T00:00:00Z", "Core Hubble Deep Field observation.",
                null, List.of("Hubble", "Deep Field"),
                null, null, null
        );
        NasaItem item = new NasaItem("http://collection", List.of(data), List.of());
        when(nasaClient.getRecord("STScI-PRC1996-01a")).thenReturn(Optional.of(item));

        SpaceImageryItem record = service.getRecord("STScI-PRC1996-01a");
        assertThat(record.nasaId()).isEqualTo("STScI-PRC1996-01a");
        assertThat(record.title()).isEqualTo("Hubble Deep Field");
        assertThat(record.center()).isEqualTo("GSFC");
    }

    @Test
    @DisplayName("Should throw 404 when record does not exist in NASA archive")
    void testGetRecordNotFound() {
        when(nasaClient.getRecord("UNKNOWN_ID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getRecord("UNKNOWN_ID"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Media record not found");
    }

    @Test
    @DisplayName("Should provide 9 celestial destinations with alternating layout composition")
    void testPlanetaryDestinationsCatalog() {
        List<PlanetaryDestination> destinations = service.getAllDestinations();
        assertThat(destinations).hasSize(9); // Sun + 8 planets

        // Verify alternating layout composition
        PlanetaryDestination mercury = service.getDestination("mercury");
        assertThat(mercury.layoutComposition()).isEqualTo("LEFT_PLANET");

        PlanetaryDestination venus = service.getDestination("venus");
        assertThat(venus.layoutComposition()).isEqualTo("RIGHT_PLANET");

        PlanetaryDestination earth = service.getDestination("earth");
        assertThat(earth.layoutComposition()).isEqualTo("LEFT_PLANET");

        PlanetaryDestination mars = service.getDestination("mars");
        assertThat(mars.layoutComposition()).isEqualTo("RIGHT_PLANET");
        assertThat(mars.activeRovers()).isNotEmpty();
        assertThat(mars.activeRovers()).anyMatch(r -> r.roverName().equalsIgnoreCase("Perseverance"));
        assertThat(mars.activeRovers()).anyMatch(r -> r.roverName().equalsIgnoreCase("Curiosity"));
    }

    @Test
    @DisplayName("Should reject blank search query without planet filter")
    void testBlankQueryValidation() {
        SpaceImagerySearchRequest request = new SpaceImagerySearchRequest("   ", 1, 20, "image", null, null, null, null);
        assertThatThrownBy(() -> service.search(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Search query must not be blank");
    }
}
