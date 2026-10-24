package org.astra.api.controller;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SpaceImageryApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NasaImageLibraryClient nasaClient;

    @Test
    @DisplayName("GET /api/v1/imagery/search - Should search imagery and return 200 without authentication")
    void testSearchImageryPublicAccess() throws Exception {
        NasaItemData data = new NasaItemData(
                "HQ", "James Webb Deep Field", "GSFC_20171208_m01", "image",
                "2022-07-12T00:00:00Z", "First deep field image from JWST.",
                null, List.of("JWST", "Deep Field"),
                null, "NASA/ESA/CSA", null
        );
        NasaItemLink link = new NasaItemLink(
                "https://images-assets.nasa.gov/image/GSFC_20171208_m01/GSFC_20171208_m01~thumb.jpg",
                "preview", "image", 640, 480, 15000L
        );
        NasaItem item = new NasaItem(
                "https://images-assets.nasa.gov/image/GSFC_20171208_m01/collection.json",
                List.of(data), List.of(link)
        );
        NasaSearchResponse response = new NasaSearchResponse(new NasaCollection(
                "1.0", "http://search", List.of(item), new NasaMetadata(1L), List.of()
        ));

        when(nasaClient.search(eq("JWST"), eq(1), eq("image"), any(), any(), any()))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/imagery/search")
                        .param("q", "JWST")
                        .param("page", "1")
                        .param("pageSize", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("JWST"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalHits").value(1))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].nasaId").value("GSFC_20171208_m01"))
                .andExpect(jsonPath("$.items[0].title").value("James Webb Deep Field"))
                .andExpect(jsonPath("$.items[0].attribution").value(containsString("NASA / HQ")));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/search - Should return 400 Bad Request when query and planet are missing")
    void testSearchMissingQuery() throws Exception {
        mockMvc.perform(get("/api/v1/imagery/search")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/v1/imagery/record/{nasaId} - Should retrieve single record details")
    void testGetRecord() throws Exception {
        NasaItemData data = new NasaItemData(
                "JPL", "Curiosity Selfie at Gale Crater", "PIA19808", "image",
                "2015-08-19T00:00:00Z", "Curiosity rover self-portrait at Buckskin drilling site.",
                null, List.of("Mars", "Curiosity"), null, "NASA/JPL-Caltech/MSSS", null
        );
        NasaItem item = new NasaItem("http://collection", List.of(data), List.of());
        when(nasaClient.getRecord("PIA19808")).thenReturn(Optional.of(item));

        mockMvc.perform(get("/api/v1/imagery/record/PIA19808"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nasaId").value("PIA19808"))
                .andExpect(jsonPath("$.title").value("Curiosity Selfie at Gale Crater"))
                .andExpect(jsonPath("$.center").value("JPL"));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/assets/{nasaId} - Should retrieve asset manifest")
    void testGetAssetManifest() throws Exception {
        NasaAssetResponse rawAssets = new NasaAssetResponse(new NasaAssetCollection(
                "1.0", "http://asset",
                List.of(
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA19808/PIA19808~large.jpg"),
                        new NasaAssetItem("https://images-assets.nasa.gov/image/PIA19808/PIA19808~thumb.jpg")
                )
        ));
        when(nasaClient.getAssetManifest("PIA19808")).thenReturn(rawAssets);

        mockMvc.perform(get("/api/v1/imagery/assets/PIA19808"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nasaId").value("PIA19808"))
                .andExpect(jsonPath("$.largeAssetUrl").value(containsString("~large.jpg")))
                .andExpect(jsonPath("$.thumbnailAssetUrl").value(containsString("~thumb.jpg")))
                .andExpect(jsonPath("$.assets", hasSize(2)));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/destinations - Should retrieve all 9 celestial destinations")
    void testGetDestinations() throws Exception {
        mockMvc.perform(get("/api/v1/imagery/destinations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(9)))
                .andExpect(jsonPath("$[0].id").value("sun"))
                .andExpect(jsonPath("$[1].id").value("mercury"))
                .andExpect(jsonPath("$[1].layoutComposition").value("LEFT_PLANET"))
                .andExpect(jsonPath("$[2].id").value("venus"))
                .andExpect(jsonPath("$[2].layoutComposition").value("RIGHT_PLANET"))
                .andExpect(jsonPath("$[3].id").value("earth"))
                .andExpect(jsonPath("$[3].layoutComposition").value("LEFT_PLANET"))
                .andExpect(jsonPath("$[4].id").value("mars"))
                .andExpect(jsonPath("$[4].layoutComposition").value("RIGHT_PLANET"));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/destinations/mars - Should retrieve Mars metadata with rovers")
    void testGetMarsDestination() throws Exception {
        mockMvc.perform(get("/api/v1/imagery/destinations/mars"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("mars"))
                .andExpect(jsonPath("$.name").value("Mars"))
                .andExpect(jsonPath("$.activeRovers", hasSize(4)))
                .andExpect(jsonPath("$.activeRovers[0].roverName").value("Perseverance"))
                .andExpect(jsonPath("$.activeRovers[1].roverName").value("Curiosity"));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/destinations/pluto - Should return 404 for unknown destination")
    void testGetUnknownDestination() throws Exception {
        mockMvc.perform(get("/api/v1/imagery/destinations/pluto"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("Planetary destination not found: pluto")));
    }

    @Test
    @DisplayName("GET /api/v1/imagery/destinations/mars/featured - Should retrieve featured imagery for destination")
    void testGetFeaturedImagery() throws Exception {
        NasaSearchResponse response = new NasaSearchResponse(new NasaCollection(
                "1.0", "http://search", List.of(), new NasaMetadata(0L), List.of()
        ));
        when(nasaClient.search(any(), anyInt(), any(), any(), any(), any()))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/imagery/destinations/mars/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value(containsString("Perseverance")));
    }
}
