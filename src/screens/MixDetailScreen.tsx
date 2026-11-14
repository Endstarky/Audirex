import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {LocalSong} from '../services/localMusic';

type MixDetailScreenProps = {
  title: string;
  subtitle: string;
  icon: string;
  songs: LocalSong[];
  currentSong: LocalSong | null;
  isPlaying: boolean;

  onBack: () => void;
  onSongPress: (song: LocalSong, queue: LocalSong[]) => void;
  onPlayerPress: () => void;
  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
};

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const MixDetailScreen = ({
  title,
  subtitle,
  icon,
  songs,
  currentSong,
  isPlaying,
  onBack,
  onSongPress,
  onPlayerPress,
  onTogglePlay,
  onPreviousSong,
  onNextSong,
}: MixDetailScreenProps) => {
  const totalDurationMs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalMinutes = Math.round(totalDurationMs / (1000 * 60));

  const handlePlayAll = () => {
    if (songs.length > 0) {
      onSongPress(songs[0], songs);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.mixBanner}>
        <View style={styles.bannerIconBox}>
          <Text style={styles.bannerEmoji}>{icon}</Text>
        </View>
        <View style={styles.bannerInfo}>
          <Text style={styles.mixBadge}>CURATED FOR YOU</Text>
          <Text style={styles.bannerTitle}>{title}</Text>
          <Text style={styles.bannerSubtitle}>{subtitle}</Text>
          <Text style={styles.bannerMeta}>
            {songs.length} songs • ~{totalMinutes} mins
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.playAllButton}
          activeOpacity={0.8}
          onPress={handlePlayAll}>
          <Text style={styles.playAllIcon}>▶</Text>
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tracksSectionLabel}>Tracks</Text>
    </View>
  );

  const renderMiniPlayer = () => {
    if (!currentSong) return null;

    return (
      <View style={styles.miniPlayer}>
        <Pressable
          style={styles.miniMain}
          onPress={onPlayerPress}
          android_ripple={{color: '#203453'}}>
          <View style={styles.miniArtwork}>
            {currentSong.artwork ? (
              <Image
                source={{uri: currentSong.artwork}}
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

        <Pressable
          style={styles.miniButton}
          onPress={onPreviousSong}
          android_ripple={{color: '#203453', borderless: true}}>
          <Text style={styles.miniPrevious}>|◁</Text>
        </Pressable>

        <Pressable
          style={styles.miniButton}
          onPress={onTogglePlay}
          android_ripple={{color: '#203453', borderless: true}}>
          <Text style={styles.miniPlay}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        <Pressable
          style={styles.miniButton}
          onPress={onNextSong}
          android_ripple={{color: '#203453', borderless: true}}>
          <Text style={styles.miniNext}>▷|</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP NAVIGATION BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.placeholderButton} />
      </View>

      {/* TRACKS LIST */}
      <FlatList
        data={songs}
        keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({item, index}) => {
          const isSelected = currentSong?.id === item.id;
          return (
            <Pressable
              style={[styles.songRow, isSelected && styles.songRowSelected]}
              onPress={() => onSongPress(item, songs)}
              android_ripple={{color: '#152442'}}>
              <Text style={[styles.indexText, isSelected && styles.accentText]}>
                {index + 1}
              </Text>

              <View style={styles.artwork}>
                {item.artwork ? (
                  <Image
                    source={{uri: item.artwork}}
                    style={styles.artworkImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.artworkIcon}>♪</Text>
                )}
              </View>

              <View style={styles.songInfo}>
                <Text
                  style={[styles.songTitle, isSelected && styles.accentText]}
                  numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.artist || 'Unknown artist'}
                </Text>
              </View>

              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
              </Text>
            </Pressable>
          );
        }}
      />

      {renderMiniPlayer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050719',
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '300',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholderButton: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  mixBanner: {
    flexDirection: 'row',
    backgroundColor: '#0A1326',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#172545',
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerIconBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#162340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 40,
  },
  bannerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  mixBadge: {
    color: '#3E80FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: '#7F8EAA',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  bannerMeta: {
    color: '#A0AEC0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playAllButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#3548C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  playAllText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tracksSectionLabel: {
    color: '#737C91',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  songRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  songRowSelected: {
    backgroundColor: '#0F1A34',
  },
  indexText: {
    color: '#5C6A86',
    fontSize: 13,
    fontWeight: '600',
    width: 26,
    textAlign: 'center',
  },
  artwork: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#111A2E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 6,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkIcon: {
    color: '#5265E9',
    fontSize: 20,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '600',
  },
  songArtist: {
    color: '#7C879C',
    fontSize: 12,
    marginTop: 3,
  },
  durationText: {
    color: '#657492',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  accentText: {
    color: '#3E80FF',
    fontWeight: '700',
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

export default MixDetailScreen;