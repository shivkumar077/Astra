import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getApiBaseUrl,
  request,
  ImageryApiError,
  getPlanetaryDestinations,
  getPlanetaryDestination,
  getFeaturedImagery,
  searchImagery,
  getMediaRecord,
  getAssetManifest,
} from '../api/imageryApi';

describe('imageryApi Client & Error Handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves default base URL to relative /api/v1 when VITE_API_BASE_URL is unset', () => {
    expect(getApiBaseUrl()).toBe('/api/v1');
  });

  it('successfully executes GET and returns JSON data', async () => {
    const mockData = [{ id: 'mars', name: 'Mars' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    } as unknown as Response);

    const result = await getPlanetaryDestinations();
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/imagery/destinations',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );
  });

  it('encodes destination IDs properly in getPlanetaryDestination and getFeaturedImagery', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'jupiter' }),
    } as unknown as Response);

    await getPlanetaryDestination('jupiter');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/imagery/destinations/jupiter', expect.any(Object));

    await getFeaturedImagery('jupiter');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/imagery/destinations/jupiter/featured', expect.any(Object));
  });

  it('constructs query parameters accurately in searchImagery', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ query: 'Perseverance', items: [] }),
    } as unknown as Response);

    await searchImagery({
      query: 'Perseverance',
      page: 2,
      pageSize: 15,
      mediaType: 'image',
      planet: 'mars',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/imagery/search?q=Perseverance&page=2&pageSize=15&mediaType=image&planet=mars',
      expect.any(Object)
    );
  });

  it('retrieves media record and asset manifest by nasaId', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ nasaId: 'PIA12345' }),
    } as unknown as Response);

    await getMediaRecord('PIA12345');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/imagery/record/PIA12345', expect.any(Object));

    await getAssetManifest('PIA12345');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/imagery/assets/PIA12345', expect.any(Object));
  });

  it('catches network fetch errors and converts them to ImageryApiError with status 0 and actionable message', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(request('/imagery/destinations')).rejects.toThrow(ImageryApiError);

    try {
      await request('/imagery/destinations');
    } catch (err: unknown) {
      const apiErr = err as ImageryApiError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.message).toContain('Unable to connect to ASTRA Gateway');
      expect(apiErr.message).toContain('Failed to fetch');
      expect(apiErr.message).toContain('8080');
    }
  });

  it('parses structured JSON error messages from non-2xx responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 404, message: 'Planetary destination not found: pluto' }),
    } as unknown as Response);

    try {
      await request('/imagery/destinations/pluto');
      expect.unreachable('Should have thrown ImageryApiError');
    } catch (err: unknown) {
      const apiErr = err as ImageryApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe('Planetary destination not found: pluto');
    }
  });

  it('handles malformed JSON response bodies gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
    } as unknown as Response);

    try {
      await request('/imagery/destinations');
      expect.unreachable('Should have thrown ImageryApiError');
    } catch (err: unknown) {
      const apiErr = err as ImageryApiError;
      expect(apiErr.status).toBe(200);
      expect(apiErr.message).toContain('Malformed JSON response');
    }
  });
});
