import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {LocalSong} from '../services/localMusic';
import {usePersistentSort} from '../hooks/usePersistentSort';

type ArtistScreenProps = {
  songs: LocalSong[];
  currentSong: LocalSong | null;
  isPlaying: boolean;

  onMenuPress: () => void;
  onPlayerPress: () => void;

  onSongPress: (song: LocalSong, customList?: LocalSong[]) => void;
  onTogglePlay: () => void;
  onNextSong: () => void;
  onPreviousSong: () => void;
};

type ArtistItem = {
  name: string;
  songs: LocalSong[];
  tracks: number;
  albums: number;
  image: string | null;
};

type ArtistSortCategory = 'name' | 'tracks' | 'albums';
type ArtistDetailSortCategory = 'title' | 'album' | 'date';
const ARTIST_CARD_HEIGHT = 291;

const ArtistCard = React.memo(
  ({
    artist,
    onSelect,
    onPlay,
  }: {
    artist: ArtistItem;
    onSelect: (name: string) => void;
    onPlay: (songs: LocalSong[]) => void;
  }) => (
    <Pressable
      style={styles.artistCard}
      onPress={() => onSelect(artist.name)}
      android_ripple={{color: '#182744'}}>
      <View style={styles.artistArtwork}>
        {artist.image ? (
          <Image
            source={{uri: artist.image}}
            style={styles.artistImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.artistImagePlaceholder}>
            <Text style={styles.artistPlaceholderIcon}>♪</Text>
          </View>
        )}

        <View style={styles.artworkShade} />

        <Pressable
          style={styles.playButton}
          onPress={event => {
            event.stopPropagation();
            onPlay(artist.songs);
          }}>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      </View>

      <View style={styles.artistInfo}>
        <View style={styles.artistText}>
          <Text style={styles.artistName} numberOfLines={1}>
            {artist.name}
          </Text>

          <View style={styles.artistStats}>
            <Text style={styles.statText}>Albums: {artist.albums}</Text>
            <Text style={styles.statDivider}>•</Text>
            <Text style={styles.statText}>Tracks: {artist.tracks}</Text>
          </View>
        </View>

        <Pressable style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋮</Text>
        </Pressable>
      </View>
    </Pressable>
  ),
);

const ArtistScreen = ({
  songs,
  currentSong,
  isPlaying,
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
}: ArtistScreenProps) => {
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [detailSortModalVisible, setDetailSortModalVisible] = useState(false);

  const {sortCategory, setSortCategory, isReverse, setIsReverse} =
    usePersistentSort<ArtistSortCategory>('@audirex_sort_artists', 'name', false);

  const {
    sortCategory: detailSortCategory,
    setSortCategory: setDetailSortCategory,
    isReverse: detailIsReverse,
    setIsReverse: setDetailIsReverse,
  } = usePersistentSort<ArtistDetailSortCategory>(
    '@audirex_sort_artist_detail',
    'title',
    false,
  );

  const artists = useMemo<ArtistItem[]>(() => {
    const artistMap = new Map<string, LocalSong[]>();

    songs.forEach(song => {
      const artistName = song.artist?.trim() || 'Unknown Artist';
      const existing = artistMap.get(artistName);
      if (existing) {
        existing.push(song);
      } else {
        artistMap.set(artistName, [song]);
      }
    });

    return Array.from(artistMap.entries()).map(([name, artistSongs]) => {
      const albums = new Set<string>();
      artistSongs.forEach(song => {
        if (song.album?.trim()) {
          albums.add(song.album.trim());
        }
      });

      const artworkSong = artistSongs.find(song => !!song.artwork);
      return {
        name,
        songs: artistSongs,
        tracks: artistSongs.length,
        albums: albums.size,
        image: artworkSong?.artwork || null,
      };
    });
  }, [songs]);

  const filteredArtists = useMemo(() => {
    let list = [...artists];
    const query = searchText.trim().toLowerCase();

    if (query) {
      list = list.filter(artist => artist.name.toLowerCase().includes(query));
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortCategory === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'tracks') {
        comparison = a.tracks - b.tracks;
      } else if (sortCategory === 'albums') {
        comparison = a.albums - b.albums;
      }
      return isReverse ? -comparison : comparison;
    });

    return list;
  }, [artists, searchText, sortCategory, isReverse]);

  const getSortLabel = () => {
    switch (sortCategory) {
      case 'name':
        return isReverse ? 'Name (Z - A)' : 'Name (A - Z)';
      case 'tracks':
        return isReverse ? 'Tracks (Least)' : 'Tracks (Most)';
      case 'albums':
        return isReverse ? 'Albums (Least)' : 'Albums (Most)';
    }
  };

  const getDetailSortLabel = () => {
    switch (detailSortCategory) {
      case 'title':
        return detailIsReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'album':
        return detailIsReverse ? 'Album (Z - A)' : 'Album (A - Z)';
      case 'date':
        return detailIsReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
    }
  };

  const activeArtist = useMemo(() => {
    if (!selectedArtist) return null;
    return artists.find(artist => artist.name === selectedArtist) || null;
  }, [artists, selectedArtist]);

  const sortedArtistSongs = useMemo(() => {
    if (!activeArtist) return [];
    const list = [...activeArtist.songs];

    list.sort((a, b) => {
      let comparison = 0;
      if (detailSortCategory === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (detailSortCategory === 'album') {
        comparison = (a.album || '').localeCompare(b.album || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (detailSortCategory === 'date') {
        const timeA = a.dateAdded ?? (Number(a.id) || 0);
        const timeB = b.dateAdded ?? (Number(b.id) || 0);
        comparison = timeA - timeB;
      }
      return detailIsReverse ? -comparison : comparison;
    });

    return list;
  }, [activeArtist, detailSortCategory, detailIsReverse]);

  const handleArtistPlay = useCallback(
    (artistSongs: LocalSong[]) => {
      if (artistSongs.length > 0) {
        onSongPress(artistSongs[0], artistSongs);
      }
    },
    [onSongPress],
  );

  const renderArtistItem = useCallback(
    ({item}: ListRenderItemInfo<ArtistItem>) => (
      <ArtistCard
        artist={item}
        onSelect={setSelectedArtist}
        onPlay={handleArtistPlay}
      />
    ),
    [handleArtistPlay],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ARTIST_CARD_HEIGHT,
      offset: ARTIST_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderMiniPlayer = () => {
    if (!currentSong) return null;

    return (
      <View style={styles.miniPlayer}>
        <Pressable
          style={styles.miniMain}
          onPress={onPlayerPress}
          android_ripple={{color: '#203452'}}>
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

        <Pressable style={styles.miniButton} onPress={onPreviousSong}>
          <Text style={styles.miniPrevious}>|◁</Text>
        </Pressable>

        <Pressable style={styles.miniButton} onPress={onTogglePlay}>
          <Text style={styles.miniPlay}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        <Pressable style={styles.miniButton} onPress={onNextSong}>
          <Text style={styles.miniNext}>▷|</Text>
        </Pressable>
      </View>
    );
  };

  if (activeArtist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedArtist(null)}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {activeArtist.name}
          </Text>

          <View style={styles.detailHeaderSpacer} />
        </View>

        <FlatList
          key="artist-detail-list"
          data={sortedArtistSongs}
          keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailContent}
          ListHeaderComponent={
            <>
              <View style={styles.detailHero}>
                <View style={styles.detailArtwork}>
                  {activeArtist.image ? (
                    <Image
                      source={{uri: activeArtist.image}}
                      style={styles.detailArtworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.detailArtworkIcon}>♪</Text>
                  )}
                </View>

                <Text style={styles.detailArtistName} numberOfLines={2}>
                  {activeArtist.name}
                </Text>

                <Text style={styles.detailStats}>
                  {activeArtist.tracks}{' '}
                  {activeArtist.tracks === 1 ? 'track' : 'tracks'}
                  {activeArtist.albums > 0
                    ? `  •  ${activeArtist.albums} ${
                        activeArtist.albums === 1 ? 'album' : 'albums'
                      }`
                    : ''}
                </Text>

                {sortedArtistSongs.length > 0 && (
                  <Pressable
                    style={styles.playAllButton}
                    onPress={() => handleArtistPlay(sortedArtistSongs)}>
                    <Text style={styles.playAllIcon}>▶</Text>
                    <Text style={styles.playAllText}>Play all</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.sortRow}>
                <Text style={styles.songSectionTitle}>Songs</Text>
                <TouchableOpacity
                  style={styles.sortButton}
                  activeOpacity={0.7}
                  onPress={() => setDetailSortModalVisible(true)}>
                  <Text style={styles.sortIcon}>↕</Text>
                  <Text style={styles.sortText}>{getDetailSortLabel()}</Text>
                </TouchableOpacity>
              </View>
            </>
          }
          renderItem={({item}) => (
            <Pressable
              style={styles.artistSongRow}
              onPress={() => onSongPress(item, sortedArtistSongs)}
              android_ripple={{color: '#111B31'}}>
              <View style={styles.songArtwork}>
                {item.artwork ? (
                  <Image
                    source={{uri: item.artwork}}
                    style={styles.songArtworkImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.songArtworkIcon}>♪</Text>
                )}
              </View>

              <View style={styles.artistSongInfo}>
                <Text style={styles.artistSongTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.artistSongAlbum} numberOfLines={1}>
                  {item.album || 'Unknown album'}
                </Text>
              </View>

              <Text style={styles.songMoreIcon}>⋮</Text>
            </Pressable>
          )}
        />

        {/* ARTIST TRACKS SORT MODAL */}
        <Modal
          visible={detailSortModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailSortModalVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDetailSortModalVisible(false)}>
            <Pressable
              style={styles.modalContent}
              onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort Artist Songs By</Text>
                <TouchableOpacity
                  onPress={() => setDetailSortModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {(
                [
                  {key: 'title', label: 'Title'},
                  {key: 'album', label: 'Album Name'},
                  {key: 'date', label: 'Date Added'},
                ] as const
              ).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.optionRow}
                  onPress={() => setDetailSortCategory(opt.key)}>
                  <Text
                    style={[
                      styles.optionText,
                      detailSortCategory === opt.key && styles.optionTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      detailSortCategory === opt.key &&
                        styles.radioCircleActive,
                    ]}>
                    {detailSortCategory === opt.key && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.modalDivider} />

              <View style={styles.reverseRow}>
                <View style={styles.reverseTextContainer}>
                  <Text style={styles.reverseTitle}>Reverse order</Text>
                  <Text style={styles.reverseSubtitle}>
                    Sort in descending order
                  </Text>
                </View>
                <Switch
                  value={detailIsReverse}
                  onValueChange={setDetailIsReverse}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor={'#FFFFFF'}
                />
              </View>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setDetailSortModalVisible(false)}>
                <Text style={styles.applyButtonText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {renderMiniPlayer()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.menuButton} onPress={onMenuPress}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        {searchOpen ? (
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search artists..."
            placeholderTextColor="#737C91"
            autoFocus
            returnKeyType="search"
          />
        ) : (
          <Text style={styles.headerTitle}>Artists</Text>
        )}

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              setSearchOpen(prev => !prev);
              if (searchOpen) setSearchText('');
            }}>
            <Text style={styles.searchIcon}>{searchOpen ? '✕' : '⌕'}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        key="artist-main-list"
        data={filteredArtists}
        renderItem={renderArtistItem}
        keyExtractor={item => item.name}
        getItemLayout={getItemLayout}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>All artists</Text>
            <TouchableOpacity
              style={styles.sortButton}
              activeOpacity={0.7}
              onPress={() => setSortModalVisible(true)}>
              <Text style={styles.sortIcon}>↕</Text>
              <Text style={styles.sortText}>{getSortLabel()}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>♪</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {songs.length === 0 ? 'No artists found' : 'No matching artists'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {songs.length === 0
                ? 'Add music to your library and artists will appear here automatically.'
                : 'Try a different artist name.'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Artists By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSortCategory('name')}>
              <Text
                style={[
                  styles.optionText,
                  sortCategory === 'name' && styles.optionTextActive,
                ]}>
                Artist Name
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'name' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'name' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSortCategory('tracks')}>
              <Text
                style={[
                  styles.optionText,
                  sortCategory === 'tracks' && styles.optionTextActive,
                ]}>
                Track Count
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'tracks' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'tracks' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSortCategory('albums')}>
              <Text
                style={[
                  styles.optionText,
                  sortCategory === 'albums' && styles.optionTextActive,
                ]}>
                Album Count
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'albums' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'albums' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <View style={styles.reverseRow}>
              <View style={styles.reverseTextContainer}>
                <Text style={styles.reverseTitle}>Reverse order</Text>
                <Text style={styles.reverseSubtitle}>
                  Sort in descending order
                </Text>
              </View>
              <Switch
                value={isReverse}
                onValueChange={setIsReverse}
                trackColor={{false: '#15213A', true: '#3E80FF'}}
                thumbColor={'#FFFFFF'}
              />
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setSortModalVisible(false)}>
              <Text style={styles.applyButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {renderMiniPlayer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050719',
  },
  header: {
    height: 82,
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
  headerTitle: {
    flex: 1,
    color: '#F5F6FA',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#F5F6FA',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 45,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#D7DDEA',
    fontSize: 24,
    fontWeight: '400',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 145,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sortLabel: {
    color: '#E7EAF1',
    fontSize: 15,
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C152B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#192644',
  },
  sortIcon: {
    color: '#3E80FF',
    fontSize: 15,
    marginRight: 6,
    fontWeight: '700',
  },
  sortText: {
    color: '#BAC7E0',
    fontSize: 12,
    fontWeight: '600',
  },
  artistCard: {
    width: '100%',
    backgroundColor: '#10182A',
    borderRadius: 11,
    overflow: 'hidden',
    marginBottom: 14,
  },
  artistArtwork: {
    width: '100%',
    height: 205,
    backgroundColor: '#111A2E',
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111A2E',
  },
  artistPlaceholderIcon: {
    color: '#5265E9',
    fontSize: 55,
  },
  artworkShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(5, 7, 25, 0.28)',
    zIndex: 1,
  },
  playButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 10,
  },
  playIcon: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 3,
  },
  artistInfo: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  artistText: {
    flex: 1,
  },
  artistName: {
    color: '#EEF1F6',
    fontSize: 18,
    fontWeight: '700',
  },
  artistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statText: {
    color: '#7E899F',
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    color: '#566176',
    fontSize: 12,
    marginHorizontal: 7,
  },
  moreButton: {
    width: 44,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#929DB1',
    fontSize: 26,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#707B91',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  detailHeader: {
    height: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#E5E8EF',
    fontSize: 40,
    fontWeight: '300',
    marginTop: -5,
  },
  detailHeaderTitle: {
    flex: 1,
    color: '#F5F6FA',
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 4,
  },
  detailHeaderSpacer: {
    width: 50,
  },
  detailContent: {
    paddingHorizontal: 14,
    paddingBottom: 145,
  },
  detailHero: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 25,
  },
  detailArtwork: {
    width: 170,
    height: 170,
    borderRadius: 18,
    backgroundColor: '#111A2E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  detailArtworkImage: {
    width: '100%',
    height: '100%',
  },
  detailArtworkIcon: {
    color: '#5265E9',
    fontSize: 60,
  },
  detailArtistName: {
    color: '#F0F2F7',
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '90%',
  },
  detailStats: {
    color: '#7E899F',
    fontSize: 12,
    marginTop: 7,
  },
  playAllButton: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 23,
    backgroundColor: '#5265E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },
  playAllIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 8,
  },
  playAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  songSectionTitle: {
    color: '#E7EAF1',
    fontSize: 19,
    fontWeight: '700',
  },
  artistSongRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 6,
  },
  songArtwork: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#111A2E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  songArtworkImage: {
    width: '100%',
    height: '100%',
  },
  songArtworkIcon: {
    color: '#5265E9',
    fontSize: 22,
  },
  artistSongInfo: {
    flex: 1,
    marginLeft: 13,
  },
  artistSongTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  artistSongAlbum: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 4,
  },
  songMoreIcon: {
    color: '#929DB1',
    fontSize: 23,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#091024',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#192644',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseText: {
    color: '#7B88A2',
    fontSize: 18,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionText: {
    color: '#8A97B0',
    fontSize: 15,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#26375A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#3E80FF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3E80FF',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#14203B',
    marginVertical: 8,
  },
  reverseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  reverseTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  reverseTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  reverseSubtitle: {
    color: '#657492',
    fontSize: 12,
    marginTop: 2,
  },
  applyButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#3548C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    overflow: 'hidden',
    backgroundColor: '#10284B',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 40,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPrevious: {
    color: '#F2F4F8',
    fontSize: 18,
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

export default ArtistScreen;