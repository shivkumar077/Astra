package org.astra.api.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.astra.imagery.dto.PlanetaryDestination;
import org.astra.imagery.dto.SpaceImageryAssetManifest;
import org.astra.imagery.dto.SpaceImageryItem;
import org.astra.imagery.dto.SpaceImagerySearchRequest;
import org.astra.imagery.dto.SpaceImagerySearchResult;
import org.astra.imagery.service.SpaceImageryService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller exposing real space imagery search, media asset retrieval,
 * and planetary destination discovery powered by NASA's Image and Video Library.
 */
@RestController
@RequestMapping("/api/v1/imagery")
@Validated
public class SpaceImageryController {

    private final SpaceImageryService imageryService;

    public SpaceImageryController(SpaceImageryService imageryService) {
        this.imageryService = imageryService;
    }

    /**
     * Search NASA's public media archive with pagination and filters.
     */
    @GetMapping("/search")
    public ResponseEntity<SpaceImagerySearchResult> search(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) @Max(100) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize,
            @RequestParam(name = "mediaType", defaultValue = "image") String mediaType,
            @RequestParam(name = "yearStart", required = false) Integer yearStart,
            @RequestParam(name = "yearEnd", required = false) Integer yearEnd,
            @RequestParam(name = "center", required = false) String center,
            @RequestParam(name = "planet", required = false) String planet
    ) {
        if ((query == null || query.isBlank()) && (planet == null || planet.isBlank())) {
            return ResponseEntity.badRequest().build();
        }

        SpaceImagerySearchRequest request = new SpaceImagerySearchRequest(
                query != null ? query : "",
                page,
                pageSize,
                mediaType,
                yearStart,
                yearEnd,
                center,
                planet
        );

        SpaceImagerySearchResult result = imageryService.search(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Retrieve single media record details by NASA ID.
     */
    @GetMapping("/record/{nasaId}")
    public ResponseEntity<SpaceImageryItem> getRecord(
            @PathVariable @NotBlank String nasaId
    ) {
        SpaceImageryItem item = imageryService.getRecord(nasaId);
        return ResponseEntity.ok(item);
    }

    /**
     * Retrieve available resolution assets (original, large, medium, thumb) for a NASA media record.
     */
    @GetMapping("/assets/{nasaId}")
    public ResponseEntity<SpaceImageryAssetManifest> getAssetManifest(
            @PathVariable @NotBlank String nasaId
    ) {
        SpaceImageryAssetManifest manifest = imageryService.getAssetManifest(nasaId);
        return ResponseEntity.ok(manifest);
    }

    /**
     * Retrieve all 9 verified celestial destinations (Sun + 8 planets) with UI storytelling layout metadata.
     */
    @GetMapping("/destinations")
    public ResponseEntity<List<PlanetaryDestination>> getDestinations() {
        List<PlanetaryDestination> destinations = imageryService.getAllDestinations();
        return ResponseEntity.ok(destinations);
    }

    /**
     * Retrieve verified details, active rovers, and historical missions for a celestial body.
     */
    @GetMapping("/destinations/{destinationId}")
    public ResponseEntity<PlanetaryDestination> getDestination(
            @PathVariable String destinationId
    ) {
        PlanetaryDestination destination = imageryService.getDestination(destinationId);
        return ResponseEntity.ok(destination);
    }

    /**
     * Retrieve curated featured imagery for a destination using verified search presets.
     */
    @GetMapping("/destinations/{destinationId}/featured")
    public ResponseEntity<SpaceImagerySearchResult> getFeaturedImagery(
            @PathVariable String destinationId
    ) {
        SpaceImagerySearchResult result = imageryService.getFeaturedImageryForDestination(destinationId);
        return ResponseEntity.ok(result);
    }
}
