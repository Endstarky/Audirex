import React, {useCallback, useMemo, useState} from 'react';
import {
  Dimensions,
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

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CONTAINER_PADDING = 10;
const GRID_GAP = 8;
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - CONTAINER_PADDING * 2 - GRID_GAP * 2) / 3,
);

type AlbumScreenProps = {
  songs: LocalSong[];
  currentSong: LocalSong | null;
  isPlaying: boolean;

  onMenuPress: () => void;
  onPlayerPress: () => void;
  onSearchPress?: () => void;

  onSongPress: (song: LocalSong, customList?: LocalSong[]) => void;
  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
};

type Album = {
  id: string;
  title: string;
  artist: string;
  songs: LocalSong[];
  artwork?: string;
};

type AlbumSortCategory = 'title' | 'artist' | 'tracks';
type AlbumDetailSortCategory = 'default' | 'title' | 'artist' | 'date';

const AlbumCard = React.memo(
  ({
    album,
    index,
    onOpen,
    onPlay,
  }: {
    album: Album;
    index: number;
    onOpen: (album: Album) => void;
    onPlay: (album: Album) => void;
  }) => {
    const isThird = (index + 1) % 3 === 0;
    return (
      <Pressable
        style={[
          styles.albumCard,
          {width: CARD_WIDTH, marginRight: isThird ? 0 : GRID_GAP},
        ]}
        onPress={() => onOpen(album)}>
        <View style={styles.albumArtwork}>
          {album.artwork ? (
            <Image
              source={{uri: album.artwork}}
              style={styles.albumImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noArtworkContainer}>
              <Text style={styles.noArtworkIcon}>♪</Text>
            </View>
          )}

          <Pressable
            style={styles.playButton}
            onPress={e => {
              e.stopPropagation();
              onPlay(album);
            }}>
            <Text style={styles.playIcon}>▶</Text>
          </Pressable>
        </View>

        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {album.title}
          </Text>
          <Text style={styles.albumArtist} numberOfLines={1}>
            {album.artist}
          </Text>
          <View style={styles.albumBottomRow}>
            <Text style={styles.trackCount}>
              {album.songs.length}{' '}
              {album.songs.length === 1 ? 'track' : 'tracks'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  },
);

const AlbumScreen = ({
  songs,
  currentSong,
  isPlaying,
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onPreviousSong,
  onNextSong,
}: AlbumScreenProps) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [detailSortModalVisible, setDetailSortModalVisible] = useState(false);

  const {sortCategory, setSortCategory, isReverse, setIsReverse} =
    usePersistentSort<AlbumSortCategory>('@audirex_sort_albums', 'title', false);

  const {
    sortCategory: detailSortCategory,
    setSortCategory: setDetailSortCategory,
    isReverse: detailIsReverse,
    setIsReverse: setDetailIsReverse,
  } = usePersistentSort<AlbumDetailSortCategory>(
    '@audirex_sort_album_detail',
    'default',
    false,
  );

  const albums = useMemo<Album[]>(() => {
    const albumMap = new Map<string, LocalSong[]>();

    songs.forEach(song => {
      const albumKey = song.albumId || song.album || 'unknown-album';
      const existing = albumMap.get(albumKey);
      if (existing) {
        existing.push(song);
      } else {
        albumMap.set(albumKey, [song]);
      }
    });

    return Array.from(albumMap.entries()).map(([id, albumSongs]) => {
      const firstSong = albumSongs[0];
      const albumTitle = firstSong.album?.trim()
        ? firstSong.album
        : 'Unknown Album';

      const artistNames = Array.from(
        new Set(
          albumSongs
            .map(song => song.artist)
            .filter(artist => artist && artist.trim()),
        ),
      );

      const artist =
        artistNames.length > 0 ? artistNames.join(', ') : 'Unknown artist';
      const artwork = albumSongs.find(
        song => song.artwork && song.artwork.trim(),
      )?.artwork;

      return {
        id,
        title: albumTitle,
        artist,
        songs: albumSongs,
        artwork,
      };
    });
  }, [songs]);

  const selectedAlbum = useMemo(() => {
    if (!selectedAlbumId) return null;
    return albums.find(a => a.id === selectedAlbumId) || null;
  }, [albums, selectedAlbumId]);

  const sortedAlbumSongs = useMemo(() => {
    if (!selectedAlbum) return [];
    const list = [...selectedAlbum.songs];

    if (detailSortCategory !== 'default') {
      list.sort((a, b) => {
        let comparison = 0;
        if (detailSortCategory === 'title') {
          comparison = (a.title || '').localeCompare(b.title || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        } else if (detailSortCategory === 'artist') {
          comparison = (a.artist || '').localeCompare(
            b.artist || '',
            undefined,
            {numeric: true, sensitivity: 'base'},
          );
        } else if (detailSortCategory === 'date') {
          const timeA = a.dateAdded ?? (Number(a.id) || 0);
          const timeB = b.dateAdded ?? (Number(b.id) || 0);
          comparison = timeA - timeB;
        }
        return comparison;
      });
    }

    return detailIsReverse ? list.reverse() : list;
  }, [selectedAlbum, detailSortCategory, detailIsReverse]);

  const filteredAlbums = useMemo(() => {
    let list = [...albums];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        album =>
          album.title.toLowerCase().includes(q) ||
          album.artist.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortCategory === 'title') {
        comparison = a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'artist') {
        comparison = a.artist.localeCompare(b.artist, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'tracks') {
        comparison = a.songs.length - b.songs.length;
      }
      return isReverse ? -comparison : comparison;
    });

    return list;
  }, [albums, searchQuery, sortCategory, isReverse]);

  const getSortLabel = () => {
    switch (sortCategory) {
      case 'title':
        return isReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'artist':
        return isReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'tracks':
        return isReverse ? 'Tracks (Least)' : 'Tracks (Most)';
    }
  };

  const getDetailSortLabel = () => {
    switch (detailSortCategory) {
      case 'default':
        return detailIsReverse ? 'Default (Reverse)' : 'Default';
      case 'title':
        return detailIsReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'artist':
        return detailIsReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'date':
        return detailIsReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
    }
  };

  const playAlbum = useCallback(
    (album: Album) => {
      if (album.songs.length > 0) {
        onSongPress(album.songs[0], album.songs);
      }
    },
    [onSongPress],
  );

  const openAlbum = useCallback((album: Album) => {
    setSelectedAlbumId(album.id);
  }, []);

  const renderAlbumGridItem = useCallback(
    ({item, index}: ListRenderItemInfo<Album>) => (
      <AlbumCard
        album={item}
        index={index}
        onOpen={openAlbum}
        onPlay={playAlbum}
      />
    ),
    [openAlbum, playAlbum],
  );

  const renderMiniPlayer = () => {
    if (!currentSong) return null;

    return (
      <View style={styles.miniPlayer}>
        <Pressable style={styles.miniMain} onPress={onPlayerPress}>
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
          <Text style={styles.miniPause}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        <Pressable style={styles.miniButton} onPress={onNextSong}>
          <Text style={styles.miniNext}>▷|</Text>
        </Pressable>
      </View>
    );
  };

  if (selectedAlbum) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedAlbumId(null)}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedAlbum.title}
          </Text>

          <Pressable
            style={styles.headerButton}
            onPress={() => {
              if (sortedAlbumSongs.length > 0) {
                onSongPress(sortedAlbumSongs[0], sortedAlbumSongs);
              }
            }}>
            <Text style={styles.headerPlay}>▶</Text>
          </Pressable>
        </View>

        <FlatList
          key="album-detail-list"
          data={sortedAlbumSongs}
          keyExtractor={item => item.id}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.albumDetailContent}
          ListHeaderComponent={
            <>
              <View style={styles.albumDetailHeader}>
                <View style={styles.detailArtwork}>
                  {selectedAlbum.artwork ? (
                    <Image
                      source={{uri: selectedAlbum.artwork}}
                      style={styles.detailArtworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.detailArtworkIcon}>♪</Text>
                  )}
                </View>

                <View style={styles.detailInfo}>
                  <Text style={styles.detailTitle} numberOfLines={2}>
                    {selectedAlbum.title}
                  </Text>
                  <Text style={styles.detailArtist} numberOfLines={2}>
                    {selectedAlbum.artist}
                  </Text>
                  <Text style={styles.detailCount}>
                    {sortedAlbumSongs.length}{' '}
                    {sortedAlbumSongs.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.playAlbumButton}
                onPress={() => {
                  if (sortedAlbumSongs.length > 0) {
                    onSongPress(sortedAlbumSongs[0], sortedAlbumSongs);
                  }
                }}>
                <Text style={styles.playAlbumIcon}>▶</Text>
                <Text style={styles.playAlbumText}>Play album</Text>
              </Pressable>

              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Songs</Text>
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
          renderItem={({item, index}) => {
            const songArtwork = item.artwork || selectedAlbum.artwork;
            return (
              <Pressable
                style={styles.detailSong}
                onPress={() => onSongPress(item, sortedAlbumSongs)}>
                <Text style={styles.songNumber}>{index + 1}</Text>

                <View style={styles.detailSongArtwork}>
                  {songArtwork ? (
                    <Image
                      source={{uri: songArtwork}}
                      style={styles.detailSongArtworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.detailSongArtworkIcon}>♪</Text>
                  )}
                </View>

                <View style={styles.detailSongInfo}>
                  <Text style={styles.detailSongTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.detailSongArtist} numberOfLines={1}>
                    {item.artist || 'Unknown artist'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        {/* ALBUM TRACKS SORT MODAL */}
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
                <Text style={styles.modalTitle}>Sort Album Tracks By</Text>
                <TouchableOpacity
                  onPress={() => setDetailSortModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {(
                [
                  {key: 'default', label: 'Default (Track Order)'},
                  {key: 'title', label: 'Title'},
                  {key: 'artist', label: 'Artist Name'},
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
        <Pressable
          style={styles.menuButton}
          onPress={onMenuPress}
          android_ripple={{color: '#182744', borderless: true}}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        {searchOpen ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search albums or artists..."
              placeholderTextColor="#6F7E9B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}>
                <Text style={styles.clearSearchText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Albums</Text>
            <Text style={styles.headerSubtitle}>
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </Text>
          </View>
        )}

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              if (searchOpen) {
                setSearchQuery('');
                setSearchOpen(false);
              } else {
                setSearchOpen(true);
              }
            }}>
            <Text style={styles.searchIcon}>{searchOpen ? '✕' : '⌕'}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        key="album-grid-list"
        data={filteredAlbums}
        renderItem={renderAlbumGridItem}
        keyExtractor={item => item.id}
        numColumns={3}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>All albums</Text>
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
              {searchQuery ? 'No matching albums' : 'No albums found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No albums match "${searchQuery}".`
                : 'Albums from your music library will appear here.'}
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
              <Text style={styles.modalTitle}>Sort Albums By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSortCategory('title')}>
              <Text
                style={[
                  styles.optionText,
                  sortCategory === 'title' && styles.optionTextActive,
                ]}>
                Album Title
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'title' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'title' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSortCategory('artist')}>
              <Text
                style={[
                  styles.optionText,
                  sortCategory === 'artist' && styles.optionTextActive,
                ]}>
                Artist Name
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'artist' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'artist' && <View style={styles.radioDot} />}
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
                Number of Tracks
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  sortCategory === 'tracks' && styles.radioCircleActive,
                ]}>
                {sortCategory === 'tracks' && <View style={styles.radioDot} />}
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
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backButton: {
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backIcon: {
    color: '#D7DDEA',
    fontSize: 38,
    fontWeight: '300',
    marginTop: -5,
  },
  menuLine: {
    width: 27,
    height: 2.5,
    backgroundColor: '#C9D1E0',
    marginVertical: 3,
    borderRadius: 2,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F5F6FA',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerSubtitle: {
    color: '#737C91',
    fontSize: 11,
    marginLeft: 4,
    marginTop: 2,
  },
  searchBarContainer: {
    flex: 1,
    height: 44,
    backgroundColor: '#0E172C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C294A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchButton: {
    paddingHorizontal: 4,
  },
  clearSearchText: {
    color: '#7B88A2',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#D7DDEA',
    fontSize: 24,
    fontWeight: '400',
  },
  headerPlay: {
    color: '#D7DDEA',
    fontSize: 20,
  },
  content: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 6,
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
  albumCard: {
    marginBottom: 12,
    backgroundColor: '#0D1629',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#15223E',
  },
  albumArtwork: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111A2E',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  noArtworkContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111A2E',
  },
  noArtworkIcon: {
    color: '#5265E9',
    fontSize: 32,
  },
  playButton: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  playIcon: {
    color: '#050719',
    fontSize: 11,
    marginLeft: 2,
  },
  albumInfo: {
    paddingHorizontal: 7,
    paddingTop: 6,
    paddingBottom: 6,
  },
  albumTitle: {
    color: '#EEF1F6',
    fontSize: 12,
    fontWeight: '700',
  },
  albumArtist: {
    color: '#818CA1',
    fontSize: 10,
    marginTop: 2,
  },
  albumBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  trackCount: {
    color: '#5E6D8A',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
  albumDetailContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 145,
  },
  albumDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailArtwork: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailArtworkImage: {
    width: '100%',
    height: '100%',
  },
  detailArtworkIcon: {
    color: '#5265E9',
    fontSize: 48,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 16,
  },
  detailTitle: {
    color: '#F1F3F8',
    fontSize: 20,
    fontWeight: '700',
  },
  detailArtist: {
    color: '#8791A5',
    fontSize: 13,
    marginTop: 6,
  },
  detailCount: {
    color: '#65728A',
    fontSize: 12,
    marginTop: 6,
  },
  playAlbumButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5369F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  playAlbumIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 8,
  },
  playAlbumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailSong: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  songNumber: {
    width: 26,
    color: '#69758C',
    fontSize: 12,
    textAlign: 'center',
  },
  detailSongArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111A2E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSongArtworkImage: {
    width: '100%',
    height: '100%',
  },
  detailSongArtworkIcon: {
    color: '#5265E9',
    fontSize: 20,
  },
  detailSongInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailSongTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '600',
  },
  detailSongArtist: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 3,
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
  },
  miniPause: {
    color: '#F2F4F8',
    fontSize: 21,
    fontWeight: '600',
  },
  miniNext: {
    color: '#F2F4F8',
    fontSize: 21,
  },
});

export default AlbumScreen;