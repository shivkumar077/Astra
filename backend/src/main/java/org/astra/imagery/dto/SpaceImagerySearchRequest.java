package org.astra.imagery.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Validated search parameters for the ASTRA Space Imagery data gateway.
 */
public record SpaceImagerySearchRequest(
        @NotBlank(message = "Search query must not be blank")
        @Size(max = 200, message = "Search query must not exceed 200 characters")
        String query,

        @Min(value = 1, message = "Page must be >= 1")
        @Max(value = 100, message = "Page must be <= 100")
        Integer page,

        @Min(value = 1, message = "Page size must be >= 1")
        @Max(value = 100, message = "Page size must be <= 100")
        Integer pageSize,

        String mediaType,
        Integer yearStart,
        Integer yearEnd,
        String center,
        String planet
) {
    public SpaceImagerySearchRequest {
        if (page == null) page = 1;
        if (pageSize == null) pageSize = 20;
        if (mediaType == null || mediaType.isBlank()) mediaType = "image";
    }
}
