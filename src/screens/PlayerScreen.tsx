import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {useProgress} from '@rntp/player';

import {LocalSong} from '../services/localMusic';
import {seekTo} from '../services/musicPlayer';
import LyricsScreen from './LyricsScreen';

type PlayerScreenProps = {
  currentSong: LocalSong | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextSong: () => void;
  onPreviousSong: () => void;
  onBack: () => void;
  onQueuePress?: () => void;
  onEqualizerPress?: () => void;
};

type RepeatMode = 'off' | 'all' | 'one';

type StoredPlaylist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  isDefault?: boolean;
};

const PLAYLISTS_STORAGE_KEY = '@audirex_playlists';

const PlayerScreen = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  onBack,
  onQueuePress,
  onEqualizerPress,
}: PlayerScreenProps) => {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();

  // Responsive square artwork size that adapts to tall/compact screens without pushing controls off-screen
  const albumSize = Math.min(screenWidth * 0.74, screenHeight * 0.36);

  const [liked, setLiked] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [lyricsVisible, setLyricsVisible] = useState(false);

  /* =========================================================
     LOAD & TOGGLE LIKED STATE (SYNCED WITH LIKED SONGS PLAYLIST)
     ========================================================= */

  useEffect(() => {
    let active = true;

    const loadLikedStatus = async () => {
      if (!currentSong?.id) {
        if (active) setLiked(false);
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
        if (!active) return;

        if (raw) {
          const parsed: StoredPlaylist[] = JSON.parse(raw);
          const likedPlaylist = parsed.find(p => p.id === 'liked-songs');
          setLiked(
            likedPlaylist ? likedPlaylist.songIds.includes(currentSong.id) : false,
          );
        } else {
          setLiked(false);
        }
      } catch {
        if (active) setLiked(false);
      }
    };

    loadLikedStatus();

    return () => {
      active = false;
    };
  }, [currentSong?.id]);

  const handleToggleLike = async () => {
    if (!currentSong?.id) return;

    const nextLiked = !liked;
    setLiked(nextLiked);

    try {
      const raw = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
      let playlists: StoredPlaylist[] = raw ? JSON.parse(raw) : [];

      const likedIndex = playlists.findIndex(p => p.id === 'liked-songs');

      if (likedIndex === -1) {
        playlists = [
          {
            id: 'liked-songs',
            name: 'Liked Songs',
            songIds: nextLiked ? [currentSong.id] : [],
            createdAt: 0,
            isDefault: true,
          },
          ...playlists,
        ];
      } else {
        const existingIds = playlists[likedIndex].songIds || [];
        const updatedIds = nextLiked
          ? Array.from(new Set([...existingIds, currentSong.id]))
          : existingIds.filter(id => id !== currentSong.id);

        playlists[likedIndex] = {
          ...playlists[likedIndex],
          songIds: updatedIds,
        };
      }

      await AsyncStorage.setItem(
        PLAYLISTS_STORAGE_KEY,
        JSON.stringify(playlists),
      );
    } catch (error) {
      console.log('Failed to update Liked Songs:', error);
    }
  };

  /* =========================================================
     TRACK PLAYER PROGRESS & SEEK STATE
     ========================================================= */

  const {position, duration} = useProgress(0.25);

  const progressWidthRef = useRef(0);
  const durationRef = useRef(0);
  const seekPositionRef = useRef(0);
  const isSeekingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  durationRef.current = duration;

  useEffect(() => {
    const pendingSeek = pendingSeekRef.current;
    if (pendingSeek === null) return;

    const difference = Math.abs(position - pendingSeek);
    if (difference <= 0.75) {
      pendingSeekRef.current = null;
    }
  }, [position]);

  /* =========================================================
     ARTWORK & FORMATTING
     ========================================================= */

  const getArtworkSource = () => {
    if (currentSong?.artwork) {
      return {uri: currentSong.artwork};
    }

    if (currentSong?.albumId && currentSong.albumId !== '0') {
      return {
        uri: `content://media/external/audio/albumart/${currentSong.albumId}`,
      };
    }

    return require('../../assets/starlight.jpg');
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) {
      return '0:00';
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const displayedPosition = isSeeking
    ? seekPosition
    : pendingSeekRef.current !== null
    ? pendingSeekRef.current
    : position;

  const progressPercentage =
    duration > 0
      ? Math.min(Math.max((displayedPosition / duration) * 100, 0), 100)
      : 0;

  /* =========================================================
     SEEK GESTURE
     ========================================================= */

  const calculateSeekPosition = (x: number): number => {
    const width = progressWidthRef.current;
    const currentDuration = durationRef.current;

    if (width <= 0 || currentDuration <= 0) {
      return 0;
    }

    const clampedX = Math.max(0, Math.min(x, width));
    return (clampedX / width) * currentDuration;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: event => {
        const startX = event.nativeEvent.locationX;
        dragStartXRef.current = startX;
        pendingSeekRef.current = null;

        const newPosition = calculateSeekPosition(startX);
        isSeekingRef.current = true;
        seekPositionRef.current = newPosition;

        setIsSeeking(true);
        setSeekPosition(newPosition);
      },

      onPanResponderMove: (_event, gestureState) => {
        const currentX = dragStartXRef.current + gestureState.dx;
        const newPosition = calculateSeekPosition(currentX);

        seekPositionRef.current = newPosition;
        setSeekPosition(newPosition);
      },

      onPanResponderRelease: async (_event, gestureState) => {
        const finalX = dragStartXRef.current + gestureState.dx;
        const newPosition = calculateSeekPosition(finalX);

        seekPositionRef.current = newPosition;
        setSeekPosition(newPosition);
        pendingSeekRef.current = newPosition;

        try {
          await seekTo(newPosition);
        } catch (error) {
          console.log('Failed to seek:', error);
          pendingSeekRef.current = null;
        } finally {
          isSeekingRef.current = false;
          setIsSeeking(false);
        }
      },

      onPanResponderTerminate: () => {
        isSeekingRef.current = false;
        setIsSeeking(false);
        pendingSeekRef.current = null;
      },

      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  /* =========================================================
     REPEAT
     ========================================================= */

  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') {
      return require('../../assets/icons/repeat-same-track.png');
    }
    if (repeatMode === 'all') {
      return require('../../assets/icons/repeat-enabled.png');
    }
    return require('../../assets/icons/repeat.png');
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={onBack}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Now Playing</Text>

        <Pressable
          style={styles.headerButton}
          onPress={onQueuePress}
          android_ripple={{color: '#263353', borderless: true}}>
          <Text style={styles.queueIcon}>≡♫</Text>
        </Pressable>
      </View>

      {/* PLAYING FROM */}
      <View style={styles.sourceRow}>
        <Text style={styles.sourceText}>PLAYING FROM MY LIBRARY</Text>

        <View style={styles.sourceActions}>
          <Pressable style={styles.sourceButton}>
            <View style={styles.sourceIconWrapper}>
              <Image
                source={require('../../assets/icons/moon.png')}
                resizeMode="contain"
                style={styles.downloadedSourceIcon}
              />
            </View>
          </Pressable>

          <Pressable style={styles.sourceButton}>
            <View style={styles.sourceIconWrapper}>
              <Image
                source={require('../../assets/icons/share.png')}
                resizeMode="contain"
                style={styles.downloadedSourceIcon}
              />
            </View>
          </Pressable>
        </View>
      </View>

      {/* ALBUM ART */}
      <View
        style={[
          styles.albumContainer,
          {width: albumSize, height: albumSize},
        ]}>
        <Image
          source={getArtworkSource()}
          style={styles.albumArt}
          resizeMode="cover"
        />
      </View>

      {/* SONG INFORMATION & LIKE BUTTON */}
      <View style={styles.songInfo}>
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong?.title || 'No song selected'}
          </Text>

          <Text style={styles.artist} numberOfLines={1}>
            {currentSong?.artist || 'Choose a song from your library'}
          </Text>
        </View>

        <Pressable
          style={styles.heartButton}
          onPress={handleToggleLike}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <View style={styles.likeIconWrapper}>
            <Image
              source={
                liked
                  ? require('../../assets/icons/liked.png')
                  : require('../../assets/icons/like.png')
              }
              resizeMode="contain"
              style={styles.downloadedLikeIcon}
            />
          </View>
        </Pressable>
      </View>

      {/* SEEKABLE PROGRESS BAR */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressTouchArea}
          onLayout={event => {
            progressWidthRef.current = event.nativeEvent.layout.width;
          }}
          {...panResponder.panHandlers}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {width: `${progressPercentage}%`},
              ]}
            />
            <View
              style={[
                styles.progressKnob,
                {left: `${progressPercentage}%`},
              ]}
            />
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(displayedPosition)}
          </Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* MAIN CONTROLS */}
      <View style={styles.controls}>
        <Pressable
          style={styles.controlButton}
          onPress={() => setShuffleEnabled(!shuffleEnabled)}>
          <View style={styles.mainIconWrapper}>
            <Image
              source={
                shuffleEnabled
                  ? require('../../assets/icons/shuffle-enabled.png')
                  : require('../../assets/icons/shuffle.png')
              }
              resizeMode="contain"
              style={styles.downloadedMainIcon}
            />
          </View>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={onPreviousSong}>
          <Text style={styles.previousIcon}>|◀</Text>
        </Pressable>

        <Pressable style={styles.playButton} onPress={onTogglePlay}>
          <Text style={styles.playPauseIcon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={onNextSong}>
          <Text style={styles.nextIcon}>▶|</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={cycleRepeatMode}>
          <View style={styles.mainIconWrapper}>
            <Image
              source={getRepeatIcon()}
              resizeMode="contain"
              style={styles.downloadedMainIcon}
            />
          </View>
        </Pressable>
      </View>

      {/* SECONDARY CONTROLS */}
      <View style={styles.secondaryControls}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setLyricsVisible(true)}>
          <View style={styles.secondaryIconWrapper}>
            <Image
              source={require('../../assets/icons/lyrics.png')}
              resizeMode="contain"
              style={styles.downloadedSecondaryIcon}
            />
          </View>
          <Text style={styles.secondaryText} numberOfLines={1}>
            Lyrics
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={onEqualizerPress}>
          <View style={styles.secondaryIconWrapper}>
            <Image
              source={require('../../assets/icons/equalizer.png')}
              resizeMode="contain"
              style={styles.downloadedSecondaryIcon}
            />
          </View>
          <Text style={styles.secondaryText} numberOfLines={1}>
            Equalizer
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton}>
          <View style={styles.secondaryIconWrapper}>
            <Image
              source={require('../../assets/icons/this-device.png')}
              resizeMode="contain"
              style={styles.downloadedSecondaryIcon}
            />
          </View>
          <Text style={styles.secondaryText} numberOfLines={1}>
            This device
          </Text>
        </Pressable>
      </View>

      {/* WAVEFORM */}
      <View style={styles.bottomWaveform}>
        {[
          5, 8, 12, 7, 16, 10, 19, 8, 14, 6, 17, 11, 7, 15, 9, 13, 6, 10, 5, 8,
          4,
        ].map((height, index) => (
          <View key={index} style={[styles.waveBar, {height}]} />
        ))}
      </View>

      {/* LYRICS MODAL SCREEN */}
      <LyricsScreen
        visible={lyricsVisible}
        song={currentSong}
        onClose={() => setLyricsVisible(false)}
      />
    </SafeAreaView>
  );
};

/* =============================================================
   STYLES
   ============================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F22',
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 2 : 0,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#E8EBF5',
    fontSize: 38,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#F4F5FA',
    fontSize: 17,
    fontWeight: '700',
  },
  queueIcon: {
    color: '#E3E7F2',
    fontSize: 22,
    fontWeight: '500',
  },
  sourceRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sourceText: {
    flex: 1,
    color: '#778197',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  sourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sourceIconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  downloadedSourceIcon: {
    position: 'absolute',
    width: 128,
    height: 128,
    left: -51,
    top: -51,
    resizeMode: 'contain',
    transform: [{scale: 0.21}],
  },
  albumContainer: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111B35',
    elevation: 10,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
  },
  songTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  songTitle: {
    color: '#F5F6FA',
    fontSize: 24,
    fontWeight: '700',
  },
  artist: {
    color: '#8A94AA',
    fontSize: 15,
    marginTop: 4,
  },
  heartButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeIconWrapper: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  downloadedLikeIcon: {
    position: 'absolute',
    width: 128,
    height: 128,
    left: -49,
    top: -49,
    resizeMode: 'contain',
    transform: [{scale: 0.24}],
  },
  progressSection: {
    paddingHorizontal: 24,
  },
  progressTouchArea: {
    height: 28,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: '#202C4B',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: '#3E7CFF',
  },
  progressKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5F6FA',
    top: -3.5,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: '#858FA4',
    fontSize: 11,
  },
  controls: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  controlButton: {
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIconWrapper: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  downloadedMainIcon: {
    position: 'absolute',
    width: 128,
    height: 128,
    left: -49,
    top: -49,
    resizeMode: 'contain',
    transform: [{scale: 0.24}],
  },
  previousIcon: {
    color: '#EDF0F6',
    fontSize: 23,
    fontWeight: '400',
  },
  nextIcon: {
    color: '#EDF0F6',
    fontSize: 23,
    fontWeight: '400',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#6354F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  playPauseIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  secondaryControls: {
    height: 54,
    marginHorizontal: 20,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#101D35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  secondaryIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    overflow: 'visible',
  },
  downloadedSecondaryIcon: {
    position: 'absolute',
    width: 128,
    height: 128,
    left: -52,
    top: -52,
    resizeMode: 'contain',
    transform: [{scale: 0.2}],
  },
  secondaryText: {
    color: '#A6AEC0',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    gap: 4,
  },
  waveBar: {
    width: 3,
    borderRadius: 3,
    backgroundColor: '#293FAE',
  },
});

export default PlayerScreen;