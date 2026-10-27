import { NasaArchiveItem } from '../types/nasaArchive';

const NASA_SEARCH_ENDPOINT = 'https://images-api.nasa.gov/search';
const SESSION_CACHE_KEY_PREFIX = 'astra_nasa_archive_cache_';

// In-memory cache fallback for private/incognito browsing or environments without sessionStorage
const memoryCache = new Map<string, NasaArchiveItem[]>();

/**
 * Fisher-Yates authentic array shuffle algorithm for genuine randomization.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sanitizes and extracts verified image items from the raw NASA API response collection.
 */
function parseNasaCollection(collection: any): NasaArchiveItem[] {
  if (!collection || !Array.isArray(collection.items)) {
    return [];
  }

  const seenIds = new Set<string>();
  const validItems: NasaArchiveItem[] = [];

  for (const item of collection.items) {
    const data = item.data?.[0];
    if (!data) continue;

    // Filter out non-images
    if (data.media_type !== 'image') continue;

    const nasaId = (data.nasa_id || '').trim();
    if (!nasaId || seenIds.has(nasaId)) continue;

    // Find thumbnail link and larger display link
    const links: any[] = item.links || [];
    const thumbLink = links.find((l) => l.rel === 'preview' || l.render === 'image');
    if (!thumbLink || !thumbLink.href || typeof thumbLink.href !== 'string') {
      continue;
    }

    const canonicalLink = links.find((l) => l.rel === 'canonical');
    const mediumLink = links.find((l) => typeof l.href === 'string' && (l.href.includes('~medium') || l.href.includes('~orig')));

    const thumbnailUrl = thumbLink.href.trim();
    // Use medium or orig if available, else derive or fallback to thumbnail
    let fullImageUrl = canonicalLink?.href || mediumLink?.href;
    if (!fullImageUrl) {
      if (thumbnailUrl.includes('~thumb.jpg')) {
        fullImageUrl = thumbnailUrl.replace('~thumb.jpg', '~medium.jpg');
      } else if (thumbnailUrl.includes('~small.jpg')) {
        fullImageUrl = thumbnailUrl.replace('~small.jpg', '~medium.jpg');
      } else {
        fullImageUrl = thumbnailUrl;
      }
    }

    seenIds.add(nasaId);
    validItems.push({
      nasaId,
      title: data.title?.trim() || 'NASA Deep Space Observation',
      description: data.description?.trim() || 'Astronomical imaging recorded by NASA space observation systems.',
      dateCreated: data.date_created || '',
      center: data.center?.trim() || 'NASA',
      secondaryCreator: data.secondary_creator?.trim() || undefined,
      keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 8) : undefined,
      thumbnailUrl,
      fullImageUrl,
      mediaType: 'image',
      collectionHref: item.href || undefined,
    });
  }

  return validItems;
}

/**
 * Fetches real observational imagery from the NASA Image and Video Library API.
 * Uses session caching to avoid unnecessary network refetches on minor renders,
 * while allowing fresh randomization on entry or explicit re-randomize request.
 */
export async function fetchNasaArchiveItems(
  searchQuery: string,
  _forceFreshRandomize = false
): Promise<NasaArchiveItem[]> {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const cacheKey = `${SESSION_CACHE_KEY_PREFIX}${normalizedQuery}`;

  // 1. Check in-memory or session cache if not forcing fresh randomize
  let rawPool: NasaArchiveItem[] | null = memoryCache.get(cacheKey) || null;

  if (!rawPool && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawPool = parsed;
          memoryCache.set(cacheKey, parsed);
        }
      }
    } catch (_) {
      // sessionStorage errors silently ignored
    }
  }

  // 2. Fetch from NASA Public API if not cached
  if (!rawPool || rawPool.length === 0) {
    const url = `${NASA_SEARCH_ENDPOINT}?q=${encodeURIComponent(normalizedQuery)}&media_type=image`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NASA Image Gateway responded with HTTP status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('NASA Image Gateway returned non-JSON payload.');
    }

    const json = await response.json();
    rawPool = parseNasaCollection(json.collection);

    if (rawPool.length === 0) {
      throw new Error('No valid space imagery items found in NASA archive response.');
    }

    // Persist to caches
    memoryCache.set(cacheKey, rawPool);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(rawPool));
      } catch (_) {}
    }
  }

  // 3. Perform genuine random selection over the valid pool (sample 24 items)
  const shuffled = shuffleArray(rawPool);
  return shuffled.slice(0, 24);
}
