import AsyncStorage from '@react-native-async-storage/async-storage';

const LYRICS_CACHE_PREFIX = '@audirex_lyrics_';

/**
 * Strips common suffix noise from file titles to improve API search matching.
 */
const sanitizeString = (text: string): string => {
  return text
    .replace(/\s*[\(\[](official|audio|video|lyrics|slowed|reverb|remix|hd|4k|feat\.|ft\.).*?[\)\]]/gi, '')
    .replace(/[_-]/g, ' ')
    .trim();
};

/**
 * Strips LRC timestamp headers like [01:23.45] if only synced lyrics are returned.
 */
const stripLrcTimestamps = (lrc: string): string => {
  return lrc
    .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim();
};

export const getLyrics = async (
  songId: string,
  title: string,
  artist?: string,
  durationMs?: number,
): Promise<{lyrics: string; isOffline: boolean} | null> => {
  const cacheKey = `${LYRICS_CACHE_PREFIX}${songId}`;

  // 1. Check local offline storage
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return {lyrics: cached, isOffline: true};
    }
  } catch (err) {
    console.log('Error reading lyrics cache:', err);
  }

  // 2. Fetch from LRCLIB API
  const cleanTitle = sanitizeString(title);
  const cleanArtist =
    artist && artist !== '<unknown>' && artist !== 'Unknown artist'
      ? sanitizeString(artist)
      : '';

  try {
    let targetLyrics = '';

    // Direct match attempt
    const queryParams = new URLSearchParams({track_name: cleanTitle});
    if (cleanArtist) queryParams.append('artist_name', cleanArtist);
    if (durationMs && durationMs > 0) {
      queryParams.append('duration', Math.round(durationMs / 1000).toString());
    }

    const directRes = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`);

    if (directRes.ok) {
      const data = await directRes.json();
      targetLyrics = data.plainLyrics || (data.syncedLyrics ? stripLrcTimestamps(data.syncedLyrics) : '');
    }

    // Fallback: search endpoint if direct match returns 404
    if (!targetLyrics) {
      const searchRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`,
      );
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          const match = results[0];
          targetLyrics = match.plainLyrics || (match.syncedLyrics ? stripLrcTimestamps(match.syncedLyrics) : '');
        }
      }
    }

    if (!targetLyrics) {
      return null;
    }

    // 3. Save for offline use
    await AsyncStorage.setItem(cacheKey, targetLyrics);
    return {lyrics: targetLyrics, isOffline: false};
  } catch (error) {
    console.log('Error fetching lyrics from network:', error);
    return null;
  }
};