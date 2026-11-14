import AsyncStorage from '@react-native-async-storage/async-storage';
import {LocalSong} from './localMusic';

const STATS_STORAGE_KEY = '@audirex_listening_stats';
const PLAYLISTS_STORAGE_KEY = '@audirex_playlists';

export type SongStats = {
  playCount: number;
  skipCount: number;
  lastPlayed: number; // timestamp ms
  morningPlays: number; // 04:00 - 11:59
  eveningPlays: number; // 17:00 - 23:59
  otherPlays: number;
};

export type LibraryStats = Record<string, SongStats>;

/* =============================================================
   1. STATS PERSISTENCE & RETRIEVAL
   ============================================================= */

export const getLibraryStats = async (): Promise<LibraryStats> => {
  try {
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLibraryStats = async (stats: LibraryStats): Promise<void> => {
  try {
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.log('Failed to save listening stats:', error);
  }
};

/* =============================================================
   2. EVENT TRACKING (PLAYS & SKIPS)
   ============================================================= */

/**
 * Call when a track ends, skips, or switches.
 * @param songId Track ID
 * @param listenedSeconds Number of seconds listened before changing
 * @param totalDurationSeconds Song duration in seconds
 */
export const recordSongPlayback = async (
  songId: string,
  listenedSeconds: number,
  totalDurationSeconds: number,
): Promise<void> => {
  if (!songId) return;

  const stats = await getLibraryStats();
  const current = stats[songId] || {
    playCount: 0,
    skipCount: 0,
    lastPlayed: 0,
    morningPlays: 0,
    eveningPlays: 0,
    otherPlays: 0,
  };

  const isSkip =
    listenedSeconds < 20 && totalDurationSeconds > 30;
  const isMeaningfulPlay =
    listenedSeconds >= 30 || (totalDurationSeconds > 0 && listenedSeconds / totalDurationSeconds > 0.5);

  const now = Date.now();
  const hour = new Date().getHours();

  if (isSkip) {
    current.skipCount += 1;
  } else if (isMeaningfulPlay) {
    current.playCount += 1;
    current.lastPlayed = now;

    if (hour >= 4 && hour < 12) {
      current.morningPlays += 1;
    } else if (hour >= 17 && hour <= 23) {
      current.eveningPlays += 1;
    } else {
      current.otherPlays += 1;
    }
  }

  stats[songId] = current;
  await saveLibraryStats(stats);
};

/* =============================================================
   3. SCORING ALGORITHM & MIX GENERATOR
   ============================================================= */

const calculateScore = (
  song: LocalSong,
  stats: SongStats | undefined,
  isLiked: boolean,
  targetTime: 'morning' | 'evening',
): number => {
  if (!stats) {
    // Discovery score for unplayed tracks so the mixes aren't empty on day 1
    return isLiked ? 25 : 5;
  }

  let score = 0;

  // Base play count
  score += stats.playCount * 4;

  // Time-of-day affinity match
  if (targetTime === 'morning') {
    score += stats.morningPlays * 7;
  } else {
    score += stats.eveningPlays * 7;
  }

  // Favorite boost
  if (isLiked) {
    score += 25;
  }

  // Skip penalty
  score -= stats.skipCount * 6;

  // Repetition Avoidance (Time-decay)
  if (stats.lastPlayed > 0) {
    const hoursSincePlayed = (Date.now() - stats.lastPlayed) / (1000 * 60 * 60);

    if (hoursSincePlayed < 1) {
      score -= 35; // Fatigue penalty (just heard it)
    } else if (hoursSincePlayed < 6) {
      score -= 15;
    } else if (hoursSincePlayed >= 24 && hoursSincePlayed <= 96) {
      score += 10; // Familiar sweet-spot (1 to 4 days ago)
    }
  }

  return score;
};

export type RecommendedMixes = {
  morningMix: LocalSong[];
  eveningMix: LocalSong[];
};

/**
 * Builds the Morning and Evening Mixes from the user's library and stats.
 */
export const generateDailyMixes = async (
  librarySongs: LocalSong[],
): Promise<RecommendedMixes> => {
  if (!librarySongs || librarySongs.length === 0) {
    return {morningMix: [], eveningMix: []};
  }

  // 1. Fetch liked songs
  let likedSongIds: string[] = [];
  try {
    const rawPlaylists = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (rawPlaylists) {
      const parsed = JSON.parse(rawPlaylists);
      const likedPlaylist = parsed.find((p: any) => p.id === 'liked-songs');
      if (likedPlaylist) likedSongIds = likedPlaylist.songIds;
    }
  } catch {
    // Continue with empty liked list
  }

  // 2. Fetch listening history stats
  const stats = await getLibraryStats();

  const targetCount = Math.min(20, Math.max(15, Math.floor(librarySongs.length * 0.4)));
  const count = librarySongs.length < 15 ? librarySongs.length : targetCount;

  // 3. Rank Morning Mix
  const morningRanked = [...librarySongs].sort((a, b) => {
    const scoreA = calculateScore(a, stats[a.id], likedSongIds.includes(a.id), 'morning');
    const scoreB = calculateScore(b, stats[b.id], likedSongIds.includes(b.id), 'morning');
    return scoreB - scoreA;
  });

  // 4. Rank Evening Mix
  const eveningRanked = [...librarySongs].sort((a, b) => {
    const scoreA = calculateScore(a, stats[a.id], likedSongIds.includes(a.id), 'evening');
    const scoreB = calculateScore(b, stats[b.id], likedSongIds.includes(b.id), 'evening');
    return scoreB - scoreA;
  });

  return {
    morningMix: morningRanked.slice(0, count),
    eveningMix: eveningRanked.slice(0, count),
  };
};