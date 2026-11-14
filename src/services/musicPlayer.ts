import TrackPlayer, {
  PlayerCommand,
} from '@rntp/player';

let playerInitialized = false;
let playerSetupPromise: Promise<void> | null = null;

/* =============================================================
   SETUP PLAYER
   ============================================================= */

export const setupPlayer = async (): Promise<void> => {
  if (playerInitialized) {
    return;
  }

  if (playerSetupPromise) {
    return playerSetupPromise;
  }

  playerSetupPromise = (async () => {
    try {
      await TrackPlayer.setupPlayer({
        contentType: 'music',
      });

      await TrackPlayer.setCommands({
        capabilities: [
          PlayerCommand.PlayPause,
          PlayerCommand.Next,
          PlayerCommand.Previous,
          PlayerCommand.Stop,
        ],
      });

      playerInitialized = true;
    } catch (error) {
      playerSetupPromise = null;

      console.log(
        'TrackPlayer setup failed:',
        error,
      );

      throw error;
    }
  })();

  return playerSetupPromise;
};

/* =============================================================
   PLAY SONG
   ============================================================= */

export const playSong = async (song: {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork?: string;
  path: string;
  uri: string;
}) => {
  await setupPlayer();

  /*
   * LocalSong.duration is stored in milliseconds.
   *
   * RNTP expects duration in seconds.
   */
  const durationInSeconds =
    song.duration > 0
      ? song.duration / 1000
      : undefined;

  /*
   * Do not pass an invalid/empty artwork URI.
   */
  const mediaItem: any = {
    mediaId: song.id,
    url: song.uri,
    title: song.title,
    artist: song.artist || 'Unknown artist',
    albumTitle: song.album || 'Unknown album',
  };

  if (durationInSeconds) {
    mediaItem.duration = durationInSeconds;
  }

  if (song.artwork) {
    mediaItem.artworkUrl = song.artwork;
  }

  /*
   * setMediaItem replaces the current item and resets
   * playback position to 0.
   */
  await TrackPlayer.setMediaItem(mediaItem);

  await TrackPlayer.play();
};

/* =============================================================
   PAUSE
   ============================================================= */

export const pauseSong = async () => {
  await setupPlayer();
  await TrackPlayer.pause();
};

/* =============================================================
   RESUME
   ============================================================= */

export const resumeSong = async () => {
  await setupPlayer();
  await TrackPlayer.play();
};

/* =============================================================
   STOP
   ============================================================= */

export const stopSong = async () => {
  await setupPlayer();
  await TrackPlayer.stop();
};

/* =============================================================
   TOGGLE
   ============================================================= */

export const togglePlayback = async () => {
  await setupPlayer();

  if (TrackPlayer.isPlaying()) {
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.play();
  }
};

/* =============================================================
   SEEK
   ============================================================= */

export const seekTo = async (
  seconds: number,
) => {
  await setupPlayer();
  await TrackPlayer.seekTo(seconds);
};

/* =============================================================
   NEXT
   ============================================================= */

export const skipToNext = async () => {
  await setupPlayer();
  await TrackPlayer.skipToNext();
};

/* =============================================================
   PREVIOUS
   ============================================================= */

export const skipToPrevious = async () => {
  await setupPlayer();
  await TrackPlayer.skipToPrevious();
};