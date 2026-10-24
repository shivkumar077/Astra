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

/**
 * Resolves the API base URL.
 * In development, defaults to relative '/api/v1' so requests are handled seamlessly by the Vite dev server proxy.
 * Can be overridden via the VITE_API_BASE_URL environment variable when targeting a dedicated backend host.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '/api/v1';
}

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

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new ImageryApiError(
      0,
      `Unable to connect to ASTRA Gateway (${url}): ${errorMsg}. Ensure backend is running on port 8080.`,
      endpoint
    );
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) {
          errorMessage = errorJson.message;
        }
      } else {
        const text = await response.text();
        if (text && text.length > 0 && text.length < 300) {
          errorMessage = text;
        }
      }
    } catch {
      // Ignore body parsing failures
    }
    throw new ImageryApiError(response.status, errorMessage, endpoint);
  }

  try {
    return (await response.json()) as T;
  } catch (err: unknown) {
    throw new ImageryApiError(
      response.status,
      `Malformed JSON response from ASTRA Gateway at ${endpoint}: ${err instanceof Error ? err.message : String(err)}`,
      endpoint
    );
  }
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
