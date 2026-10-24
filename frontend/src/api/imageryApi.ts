/**
 * ASTRA Space Imagery API Client.
 * Connects frontend consumers to the backend NASA Data Gateway at /api/v1/imagery/*.
 */

import {
  PlanetaryDestination,
  SpaceImageryAssetManifest,
  SpaceImageryItem,
  SpaceImagerySearchParams,
  SpaceImagerySearchResult,
} from '../types/imagery';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export class ImageryApiError extends Error {
  public readonly status: number;
  public readonly path?: string;

  constructor(status: number, message: string, path?: string) {
    super(message);
    this.name = 'ImageryApiError';
    this.status = status;
    this.path = path;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new ImageryApiError(response.status, errorMessage, endpoint);
  }

  return response.json() as Promise<T>;
}

/**
 * Search the NASA media archive with pagination and optional filters.
 */
export async function searchImagery(params: SpaceImagerySearchParams): Promise<SpaceImagerySearchResult> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set('q', params.query);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.mediaType) queryParams.set('mediaType', params.mediaType);
  if (params.yearStart) queryParams.set('yearStart', params.yearStart.toString());
  if (params.yearEnd) queryParams.set('yearEnd', params.yearEnd.toString());
  if (params.center) queryParams.set('center', params.center);
  if (params.planet) queryParams.set('planet', params.planet);

  const queryString = queryParams.toString();
  const endpoint = `/imagery/search${queryString ? `?${queryString}` : ''}`;
  return request<SpaceImagerySearchResult>(endpoint);
}

/**
 * Retrieve metadata for a single NASA media record.
 */
export async function getMediaRecord(nasaId: string): Promise<SpaceImageryItem> {
  return request<SpaceImageryItem>(`/imagery/record/${encodeURIComponent(nasaId)}`);
}

/**
 * Retrieve resolution asset links (original, large, medium, thumb) for a media item.
 */
export async function getAssetManifest(nasaId: string): Promise<SpaceImageryAssetManifest> {
  return request<SpaceImageryAssetManifest>(`/imagery/assets/${encodeURIComponent(nasaId)}`);
}

/**
 * Retrieve all 9 verified celestial destinations (Sun + 8 planets) with UI storytelling layout rules.
 */
export async function getPlanetaryDestinations(): Promise<PlanetaryDestination[]> {
  return request<PlanetaryDestination[]>('/imagery/destinations');
}

/**
 * Retrieve verified details, active rovers, and historical missions for a destination.
 */
export async function getPlanetaryDestination(destinationId: string): Promise<PlanetaryDestination> {
  return request<PlanetaryDestination>(`/imagery/destinations/${encodeURIComponent(destinationId)}`);
}

/**
 * Retrieve curated featured imagery for a destination using verified search presets.
 */
export async function getFeaturedImagery(destinationId: string): Promise<SpaceImagerySearchResult> {
  return request<SpaceImagerySearchResult>(`/imagery/destinations/${encodeURIComponent(destinationId)}/featured`);
}
