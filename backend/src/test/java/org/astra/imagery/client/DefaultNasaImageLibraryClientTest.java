package org.astra.imagery.client;

import org.astra.imagery.client.dto.NasaRawDtos.NasaAssetResponse;
import org.astra.imagery.client.dto.NasaRawDtos.NasaItem;
import org.astra.imagery.client.dto.NasaRawDtos.NasaSearchResponse;
import org.astra.imagery.config.NasaApiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DefaultNasaImageLibraryClientTest {

    private MockRestServiceServer server;
    private DefaultNasaImageLibraryClient client;

    @BeforeEach
    void setUp() {
        NasaApiProperties properties = new NasaApiProperties();
        properties.setBaseUrl("https://images-api.nasa.gov");

        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getBaseUrl());
        this.server = MockRestServiceServer.bindTo(builder).build();
        this.client = new DefaultNasaImageLibraryClient(properties, builder.build());
    }

    @Test
    @DisplayName("Should successfully parse NASA search responses")
    void testSearchSuccess() {
        String json = """
                {
                  "collection": {
                    "version": "1.0",
                    "href": "https://images-api.nasa.gov/search?q=mars",
                    "items": [
                      {
                        "href": "https://images-assets.nasa.gov/image/PIA1234/collection.json",
                        "data": [
                          {
                            "center": "JPL",
                            "title": "Mars Crater",
                            "nasa_id": "PIA1234",
                            "media_type": "image",
                            "date_created": "2020-01-01T00:00:00Z",
                            "description": "Crater on Mars surface."
                          }
                        ],
                        "links": [
                          {
                            "href": "https://images-assets.nasa.gov/image/PIA1234/PIA1234~thumb.jpg",
                            "rel": "preview",
                            "render": "image"
                          }
                        ]
                      }
                    ],
                    "metadata": {
                      "total_hits": 1
                    }
                  }
                }
                """;

        server.expect(requestTo("https://images-api.nasa.gov/search?q=mars&page=1&media_type=image"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        NasaSearchResponse response = client.search("mars", 1, "image", null, null, null);

        assertThat(response.collectionOrEmpty().totalHits()).isEqualTo(1L);
        assertThat(response.collectionOrEmpty().itemsOrEmpty()).hasSize(1);
        NasaItem item = response.collectionOrEmpty().itemsOrEmpty().get(0);
        assertThat(item.firstDataOrNull().nasaId()).isEqualTo("PIA1234");
        assertThat(item.firstDataOrNull().title()).isEqualTo("Mars Crater");
        server.verify();
    }

    @Test
    @DisplayName("Should translate NASA 500 server error to 502 Bad Gateway")
    void testSearchServerError() {
        server.expect(requestTo("https://images-api.nasa.gov/search?q=crash&page=1&media_type=image"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.search("crash", 1, "image", null, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
                });
        server.verify();
    }

    @Test
    @DisplayName("Should successfully retrieve asset manifest")
    void testGetAssetManifest() {
        String json = """
                {
                  "collection": {
                    "version": "1.0",
                    "href": "https://images-api.nasa.gov/asset/PIA1234",
                    "items": [
                      { "href": "https://images-assets.nasa.gov/image/PIA1234/PIA1234~orig.jpg" },
                      { "href": "https://images-assets.nasa.gov/image/PIA1234/PIA1234~thumb.jpg" }
                    ]
                  }
                }
                """;

        server.expect(requestTo("https://images-api.nasa.gov/asset/PIA1234"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        NasaAssetResponse response = client.getAssetManifest("PIA1234");

        assertThat(response.itemsOrEmpty()).hasSize(2);
        assertThat(response.itemsOrEmpty().get(0).href()).contains("~orig.jpg");
        server.verify();
    }

    @Test
    @DisplayName("Should throw 404 when asset manifest does not exist")
    void testGetAssetManifestNotFound() {
        server.expect(requestTo("https://images-api.nasa.gov/asset/NON_EXISTENT"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> client.getAssetManifest("NON_EXISTENT"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                });
        server.verify();
    }

    @Test
    @DisplayName("Should retrieve record by nasa_id")
    void testGetRecord() {
        String json = """
                {
                  "collection": {
                    "items": [
                      {
                        "data": [
                          {
                            "nasa_id": "PIA9999",
                            "title": "Jupiter Storms"
                          }
                        ]
                      }
                    ]
                  }
                }
                """;

        server.expect(requestTo("https://images-api.nasa.gov/search?nasa_id=PIA9999"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<NasaItem> record = client.getRecord("PIA9999");

        assertThat(record).isPresent();
        assertThat(record.get().firstDataOrNull().title()).isEqualTo("Jupiter Storms");
        server.verify();
    }
}
