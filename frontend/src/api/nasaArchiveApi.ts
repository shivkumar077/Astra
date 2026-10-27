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
 * Skips items with missing or invalid image assets without failing the entire collection.
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

    // Filter out non-images (videos, audio records)
    if (data.media_type !== 'image') continue;

    const nasaId = (data.nasa_id || '').trim();
    if (!nasaId || seenIds.has(nasaId)) continue;

    // Find thumbnail link and larger display link
    const links: any[] = item.links || [];
    const thumbLink =
      links.find((l) => l.rel === 'preview' || l.render === 'image') ||
      links.find((l) => typeof l.href === 'string' && (l.href.includes('~thumb') || l.href.includes('~small'))) ||
      links.find((l) => typeof l.href === 'string' && /\.(jpg|jpeg|png|webp)/i.test(l.href));

    if (!thumbLink || !thumbLink.href || typeof thumbLink.href !== 'string') {
      // Skip this item if no image thumbnail link is available
      continue;
    }

    const canonicalLink = links.find((l) => l.rel === 'canonical');
    const mediumLink = links.find(
      (l) => typeof l.href === 'string' && (l.href.includes('~medium') || l.href.includes('~orig') || l.href.includes('~large'))
    );

    // Upgrade all asset URLs to HTTPS to avoid mixed-content blocks
    const thumbnailUrl = thumbLink.href.trim().replace(/^http:\/\//i, 'https://');

    // Use medium or orig if available, else derive or fallback to thumbnail
    let fullImageUrl = canonicalLink?.href || mediumLink?.href;
    if (!fullImageUrl) {
      if (thumbnailUrl.includes('~thumb.')) {
        fullImageUrl = thumbnailUrl.replace('~thumb.', '~medium.');
      } else if (thumbnailUrl.includes('~small.')) {
        fullImageUrl = thumbnailUrl.replace('~small.', '~medium.');
      } else {
        fullImageUrl = thumbnailUrl;
      }
    }
    fullImageUrl = fullImageUrl.trim().replace(/^http:\/\//i, 'https://');

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
      collectionHref: item.href ? item.href.replace(/^http:\/\//i, 'https://') : undefined,
    });
  }

  return validItems;
}

/**
 * Executes a single search against the NASA Image and Video Library endpoint.
 */
async function executeNasaSearch(query: string): Promise<NasaArchiveItem[]> {
  const url = `${NASA_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&media_type=image`;
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
  return parseNasaCollection(json.collection);
}

/**
 * Fetches real observational imagery from the NASA Image and Video Library API.
 * Uses session caching to avoid unnecessary network refetches on minor renders,
 * while allowing fresh randomization on entry or explicit re-randomize request.
 * Automatically retries with broader astronomical terms if an initial query returns 0 items.
 */
export async function fetchNasaArchiveItems(
  searchQuery: string,
  forceFreshRandomize = false
): Promise<NasaArchiveItem[]> {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const cacheKey = `${SESSION_CACHE_KEY_PREFIX}${normalizedQuery}`;

  // 1. Check in-memory or session cache if not forcing fresh randomize
  let rawPool: NasaArchiveItem[] | null = null;

  if (!forceFreshRandomize) {
    rawPool = memoryCache.get(cacheKey) || null;

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
  }

  // 2. Fetch from NASA Public API if not cached or forcing fresh randomize
  if (!rawPool || rawPool.length === 0) {
    let items = await executeNasaSearch(normalizedQuery);

    // If query has multiple words and NASA returned 0 items (since NASA search treats words with AND),
    // retry with the first keyword
    if (items.length === 0 && normalizedQuery.includes(' ')) {
      const firstWord = normalizedQuery.split(/\s+/)[0];
      if (firstWord && firstWord !== normalizedQuery) {
        items = await executeNasaSearch(firstWord);
      }
    }

    // If still 0 items, retry with broad astronomical fallback
    if (items.length === 0) {
      items = await executeNasaSearch('deep space');
    }

    if (items.length === 0) {
      throw new Error('No valid space imagery items found in NASA archive response.');
    }

    rawPool = items;

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
