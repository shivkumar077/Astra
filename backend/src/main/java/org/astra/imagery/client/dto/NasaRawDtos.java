package org.astra.imagery.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Collections;
import java.util.List;

/**
 * Jackson mapping DTOs for upstream responses from https://images-api.nasa.gov.
 * Documented at: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
 */
public final class NasaRawDtos {

    private NasaRawDtos() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaSearchResponse(
            @JsonProperty("collection") NasaCollection collection
    ) {
        public NasaCollection collectionOrEmpty() {
            return collection != null ? collection : new NasaCollection(null, null, Collections.emptyList(), null, Collections.emptyList());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaCollection(
            @JsonProperty("version") String version,
            @JsonProperty("href") String href,
            @JsonProperty("items") List<NasaItem> items,
            @JsonProperty("metadata") NasaMetadata metadata,
            @JsonProperty("links") List<NasaLink> links
    ) {
        public List<NasaItem> itemsOrEmpty() {
            return items != null ? items : Collections.emptyList();
        }

        public long totalHits() {
            return metadata != null && metadata.totalHits() != null ? metadata.totalHits() : 0L;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaMetadata(
            @JsonProperty("total_hits") Long totalHits
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaItem(
            @JsonProperty("href") String href,
            @JsonProperty("data") List<NasaItemData> data,
            @JsonProperty("links") List<NasaItemLink> links
    ) {
        public NasaItemData firstDataOrNull() {
            return data != null && !data.isEmpty() ? data.get(0) : null;
        }

        public List<NasaItemLink> linksOrEmpty() {
            return links != null ? links : Collections.emptyList();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaItemData(
            @JsonProperty("center") String center,
            @JsonProperty("title") String title,
            @JsonProperty("nasa_id") String nasaId,
            @JsonProperty("media_type") String mediaType,
            @JsonProperty("date_created") String dateCreated,
            @JsonProperty("description") String description,
            @JsonProperty("description_508") String description508,
            @JsonProperty("keywords") List<String> keywords,
            @JsonProperty("secondary_creator") String secondaryCreator,
            @JsonProperty("photographer") String photographer,
            @JsonProperty("location") String location
    ) {
        public List<String> keywordsOrEmpty() {
            return keywords != null ? keywords : Collections.emptyList();
        }

        public String effectiveDescription() {
            if (description != null && !description.isBlank()) {
                return description;
            }
            return description508 != null ? description508 : "";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaItemLink(
            @JsonProperty("href") String href,
            @JsonProperty("rel") String rel,
            @JsonProperty("render") String render,
            @JsonProperty("width") Integer width,
            @JsonProperty("height") Integer height,
            @JsonProperty("size") Long size
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaLink(
            @JsonProperty("rel") String rel,
            @JsonProperty("prompt") String prompt,
            @JsonProperty("href") String href
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaAssetResponse(
            @JsonProperty("collection") NasaAssetCollection collection
    ) {
        public List<NasaAssetItem> itemsOrEmpty() {
            return collection != null && collection.items() != null ? collection.items() : Collections.emptyList();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaAssetCollection(
            @JsonProperty("version") String version,
            @JsonProperty("href") String href,
            @JsonProperty("items") List<NasaAssetItem> items
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NasaAssetItem(
            @JsonProperty("href") String href
    ) {}
}
