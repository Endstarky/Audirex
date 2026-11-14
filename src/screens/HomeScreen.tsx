import React from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {LocalSong} from '../services/localMusic';

type HomeScreenProps = {
  songs: LocalSong[];
  currentSong: LocalSong | null;
  isPlaying: boolean;

  morningMix?: LocalSong[];
  eveningMix?: LocalSong[];
  onOpenMix?: (
    title: string,
    subtitle: string,
    icon: string,
    songs: LocalSong[],
  ) => void;

  onSearchPress: () => void;
  onMenuPress: () => void;
  onPlayerPress: () => void;

  onSongPress: (song: LocalSong) => void;
  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
};

const HomeScreen = ({
  songs,
  currentSong,
  isPlaying,

  morningMix = [],
  eveningMix = [],
  onOpenMix,

  onSearchPress,
  onMenuPress,
  onPlayerPress,

  onSongPress,
  onTogglePlay,
  onPreviousSong,
  onNextSong,
}: HomeScreenProps) => {
  /* =========================================================
     GREETING
     ========================================================= */

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 18) {
      return 'Good afternoon';
    }

    return 'Good evening';
  };

  /* =========================================================
     RECENT SONGS
     ========================================================= */

  const recentSongs = songs.slice(0, 6);

  /* =========================================================
     MINI PLAYER
     ========================================================= */

  const renderMiniPlayer = () => {
    if (!currentSong) {
      return null;
    }

    return (
      <View style={styles.miniPlayer}>
        {/* MAIN PLAYER */}
        <Pressable
          style={styles.miniMain}
          onPress={onPlayerPress}
          android_ripple={{
            color: '#203453',
          }}>
          <View style={styles.miniArtwork}>
            {currentSong.artwork ? (
              <Image
                source={{
                  uri: currentSong.artwork,
                }}
                style={styles.miniArtworkImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.miniArtworkIcon}>♪</Text>
            )}
          </View>

          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>
              {currentSong.title}
            </Text>

            <Text style={styles.miniArtist} numberOfLines={1}>
              {currentSong.artist || 'Unknown artist'}
            </Text>
          </View>
        </Pressable>

        {/* PREVIOUS */}
        <Pressable
          style={styles.miniButton}
          onPress={onPreviousSong}
          android_ripple={{
            color: '#203453',
            borderless: true,
          }}>
          <Text style={styles.miniPrevious}>|◁</Text>
        </Pressable>

        {/* PLAY / PAUSE */}
        <Pressable
          style={styles.miniButton}
          onPress={onTogglePlay}
          android_ripple={{
            color: '#203453',
            borderless: true,
          }}>
          <Text style={styles.miniPlay}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        {/* NEXT */}
        <Pressable
          style={styles.miniButton}
          onPress={onNextSong}
          android_ripple={{
            color: '#203453',
            borderless: true,
          }}>
          <Text style={styles.miniNext}>▷|</Text>
        </Pressable>
      </View>
    );
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* =====================================================
          HEADER
          ===================================================== */}
      <View style={styles.header}>
        {/* MENU */}
        <Pressable
          style={styles.menuButton}
          onPress={onMenuPress}
          android_ripple={{
            color: '#182744',
            borderless: true,
          }}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        {/* HEADER TEXT */}
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.subtitle}>
            {songs.length
              ? `${songs.length} songs in your library`
              : 'Your music library'}
          </Text>
        </View>
      </View>

      {/* =====================================================
          CONTENT
          ===================================================== */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* SEARCH */}
        <Pressable
          style={styles.searchBar}
          onPress={onSearchPress}
          android_ripple={{
            color: '#18213A',
          }}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>
            Search songs, artists, albums...
          </Text>
        </Pressable>

        {/* =================================================
            MADE FOR YOU (RECOMMENDED MIXES)
            ================================================= */}
        {songs.length > 0 && (
          <View style={styles.madeForYouContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Made For You</Text>
              <Text style={styles.exploreText}>Explore</Text>
            </View>

            <View style={styles.mixesRow}>
              {/* MORNING MIX */}
              <Pressable
                style={styles.mixCard}
                onPress={() =>
                  onOpenMix &&
                  onOpenMix(
                    'Morning Mix',
                    'Crafted for your morning routine',
                    '☀️',
                    morningMix,
                  )
                }
                android_ripple={{color: '#1A294A'}}>
                <View style={[styles.mixIconBox, styles.morningGradient]}>
                  <Text style={styles.mixEmoji}>☀️</Text>
                </View>
                <View style={styles.mixInfo}>
                  <Text style={styles.mixTitle} numberOfLines={1}>
                    Morning Mix
                  </Text>
                  <Text style={styles.mixCount}>
                    {morningMix.length} tracks
                  </Text>
                </View>
              </Pressable>

              {/* EVENING MIX */}
              <Pressable
                style={styles.mixCard}
                onPress={() =>
                  onOpenMix &&
                  onOpenMix(
                    'Evening Mix',
                    'Laid-back vibes for your evening',
                    '🌙',
                    eveningMix,
                  )
                }
                android_ripple={{color: '#1A294A'}}>
                <View style={[styles.mixIconBox, styles.eveningGradient]}>
                  <Text style={styles.mixEmoji}>🌙</Text>
                </View>
                <View style={styles.mixInfo}>
                  <Text style={styles.mixTitle} numberOfLines={1}>
                    Evening Mix
                  </Text>
                  <Text style={styles.mixCount}>
                    {eveningMix.length} tracks
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* =================================================
            YOUR MUSIC
            ================================================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Music</Text>
          <Text style={styles.countText}>{songs.length}</Text>
        </View>

        {/* =================================================
            EMPTY STATE
            ================================================= */}
        {recentSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>♪</Text>
            </View>
            <Text style={styles.emptyTitle}>No music found</Text>
            <Text style={styles.emptySubtitle}>
              Allow Audirex to access your device music library. Songs will appear
              here automatically.
            </Text>
          </View>
        ) : (
          /* =================================================
             RECENT SONG LIST
             ================================================= */
          <View style={styles.songList}>
            {recentSongs.map((song, index) => (
              <Pressable
                key={song.id || `${song.title}-${index}`}
                style={styles.songRow}
                onPress={() => onSongPress(song)}
                android_ripple={{
                  color: '#111B31',
                }}>
                {/* ARTWORK */}
                <View style={styles.artwork}>
                  {song.artwork ? (
                    <Image
                      source={{
                        uri: song.artwork,
                      }}
                      style={styles.artworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.artworkIcon}>♪</Text>
                  )}
                </View>

                {/* SONG INFORMATION */}
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>

                  <Text style={styles.artist} numberOfLines={1}>
                    {song.artist || 'Unknown artist'}
                  </Text>
                </View>

                {/* MORE */}
                <Pressable
                  style={styles.moreButton}
                  onPress={() => {}}
                  android_ripple={{
                    color: '#18213A',
                    borderless: true,
                  }}>
                  <Text style={styles.moreIcon}>⋮</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* =====================================================
          MINI PLAYER
          ===================================================== */}
      {renderMiniPlayer()}
    </SafeAreaView>
  );
};

/* =============================================================
   STYLES
   ============================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050719',
  },
  header: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  menuButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  menuLine: {
    width: 29,
    height: 2.5,
    backgroundColor: '#C9D1E0',
    marginVertical: 3,
    borderRadius: 2,
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    color: '#F5F6FA',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#737C91',
    fontSize: 11,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 145,
  },
  searchBar: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0D1328',
    borderWidth: 1,
    borderColor: '#1A2440',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    color: '#AEB6C8',
    fontSize: 25,
    marginRight: 10,
    marginTop: -2,
  },
  searchPlaceholder: {
    color: '#7B8497',
    fontSize: 13,
    fontWeight: '500',
  },
  madeForYouContainer: {
    marginBottom: 24,
  },
  mixesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mixCard: {
    flex: 1,
    height: 66,
    backgroundColor: '#0A1326',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#15223E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  mixIconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morningGradient: {
    backgroundColor: '#1E2C52',
  },
  eveningGradient: {
    backgroundColor: '#162340',
  },
  mixEmoji: {
    fontSize: 22,
  },
  mixInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  mixTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mixCount: {
    color: '#7B8AA3',
    fontSize: 11,
    marginTop: 3,
  },
  exploreText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#E7EAF1',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  countText: {
    color: '#6979E8',
    fontSize: 12,
    fontWeight: '600',
  },
  songList: {
    width: '100%',
  },
  songRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    borderRadius: 10,
    overflow: 'hidden',
  },
  artwork: {
    width: 58,
    height: 58,
    borderRadius: 9,
    backgroundColor: '#111A2E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkIcon: {
    color: '#5265E9',
    fontSize: 25,
  },
  songInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  artist: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 5,
  },
  moreButton: {
    width: 42,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#929DB1',
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 35,
  },
  emptyIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#111C34',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyIcon: {
    color: '#5265E9',
    fontSize: 34,
  },
  emptyTitle: {
    color: '#E9ECF2',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#707B91',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  miniPlayer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 64,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#15233B',
    borderWidth: 1,
    borderColor: '#203453',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 10,
  },
  miniMain: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  miniArtwork: {
    width: 52,
    height: 52,
    borderRadius: 9,
    backgroundColor: '#10284B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniArtworkImage: {
    width: '100%',
    height: '100%',
  },
  miniArtworkIcon: {
    color: '#5265E9',
    fontSize: 25,
  },
  miniInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  miniTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  miniArtist: {
    color: '#818CA1',
    fontSize: 11,
    marginTop: 3,
  },
  miniButton: {
    width: 46,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPrevious: {
    color: '#F2F4F8',
    fontSize: 21,
    fontWeight: '600',
  },
  miniPlay: {
    color: '#F2F4F8',
    fontSize: 21,
    fontWeight: '600',
  },
  miniNext: {
    color: '#F2F4F8',
    fontSize: 21,
  },
});

export default HomeScreen;