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

type GenreScreenProps = {
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

type GenreData = {
  name: string;
  songs: LocalSong[];
  tracks: number;
  image: string | null;
};

type GenreSortCategory = 'name' | 'tracks';
type GenreDetailSortCategory = 'title' | 'artist' | 'date';

const GenreCard = React.memo(
  ({
    genre,
    onOpen,
    onPlay,
  }: {
    genre: GenreData;
    onOpen: (name: string) => void;
    onPlay: (songs: LocalSong[]) => void;
  }) => (
    <Pressable
      style={styles.genreCard}
      onPress={() => onOpen(genre.name)}
      android_ripple={{color: '#182744'}}>
      <View style={styles.genreArtwork}>
        {genre.image ? (
          <Image
            source={{uri: genre.image}}
            style={styles.genreImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.genreImagePlaceholder}>
            <Text style={styles.genrePlaceholderIcon}>♪</Text>
          </View>
        )}

        <Pressable
          style={styles.playButton}
          onPress={event => {
            event.stopPropagation();
            onPlay(genre.songs);
          }}>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      </View>

      <View style={styles.genreInfo}>
        <Text style={styles.genreName} numberOfLines={1}>
          {genre.name}
        </Text>
        <Text style={styles.genreTracks} numberOfLines={1}>
          Tracks: {genre.tracks}
        </Text>
      </View>
    </Pressable>
  ),
);

const GenreScreen = ({
  songs,
  currentSong,
  isPlaying,
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
}: GenreScreenProps) => {
  const [selectedGenreName, setSelectedGenreName] = useState<string | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [detailSortModalVisible, setDetailSortModalVisible] = useState(false);

  const {sortCategory, setSortCategory, isReverse, setIsReverse} =
    usePersistentSort<GenreSortCategory>('@audirex_sort_genres', 'name', false);

  const {
    sortCategory: detailSortCategory,
    setSortCategory: setDetailSortCategory,
    isReverse: detailIsReverse,
    setIsReverse: setDetailIsReverse,
  } = usePersistentSort<GenreDetailSortCategory>(
    '@audirex_sort_genre_detail',
    'title',
    false,
  );

  const genres = useMemo<GenreData[]>(() => {
    const genreMap = new Map<string, LocalSong[]>();

    songs.forEach(song => {
      const genreName = song.genre?.trim() || 'Unknown Genre';
      const existingSongs = genreMap.get(genreName);
      if (existingSongs) {
        existingSongs.push(song);
      } else {
        genreMap.set(genreName, [song]);
      }
    });

    return Array.from(genreMap.entries()).map(([name, genreSongs]) => {
      const artworkSong = genreSongs.find(song => !!song.artwork);
      return {
        name,
        songs: genreSongs,
        tracks: genreSongs.length,
        image: artworkSong?.artwork || null,
      };
    });
  }, [songs]);

  const activeGenre = useMemo(() => {
    if (!selectedGenreName) return null;
    return genres.find(g => g.name === selectedGenreName) || null;
  }, [genres, selectedGenreName]);

  const sortedGenreSongs = useMemo(() => {
    if (!activeGenre) return [];
    const list = [...activeGenre.songs];

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
      return detailIsReverse ? -comparison : comparison;
    });

    return list;
  }, [activeGenre, detailSortCategory, detailIsReverse]);

  const filteredGenres = useMemo(() => {
    let list = [...genres];
    const query = searchText.trim().toLowerCase();

    if (query) {
      list = list.filter(genre => genre.name.toLowerCase().includes(query));
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
      }
      return isReverse ? -comparison : comparison;
    });

    return list;
  }, [genres, searchText, sortCategory, isReverse]);

  const getSortLabel = () => {
    if (sortCategory === 'name') {
      return isReverse ? 'Name (Z - A)' : 'Name (A - Z)';
    }
    return isReverse ? 'Tracks (Least)' : 'Tracks (Most)';
  };

  const getDetailSortLabel = () => {
    switch (detailSortCategory) {
      case 'title':
        return detailIsReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'artist':
        return detailIsReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'date':
        return detailIsReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
    }
  };

  const handleGenrePlay = useCallback(
    (genreSongs: LocalSong[]) => {
      if (genreSongs.length > 0) {
        onSongPress(genreSongs[0], genreSongs);
      }
    },
    [onSongPress],
  );

  const renderGenreItem = useCallback(
    ({item}: ListRenderItemInfo<GenreData>) => (
      <GenreCard
        genre={item}
        onOpen={setSelectedGenreName}
        onPlay={handleGenrePlay}
      />
    ),
    [handleGenrePlay],
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
          <Text style={styles.miniPlay}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
        </Pressable>

        <Pressable style={styles.miniButton} onPress={onNextSong}>
          <Text style={styles.miniNext}>▷|</Text>
        </Pressable>
      </View>
    );
  };

  /* =========================================================
     GENRE DETAIL VIEW
     ========================================================= */
  if (activeGenre) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedGenreName(null)}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {activeGenre.name}
          </Text>

          <View style={styles.detailHeaderSpacer} />
        </View>

        <FlatList
          key="genre-detail-list"
          data={sortedGenreSongs}
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
                  {activeGenre.image ? (
                    <Image
                      source={{uri: activeGenre.image}}
                      style={styles.detailArtworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.detailArtworkIcon}>♪</Text>
                  )}
                </View>

                <Text style={styles.detailGenreName} numberOfLines={2}>
                  {activeGenre.name}
                </Text>

                <Text style={styles.detailStats}>
                  {sortedGenreSongs.length}{' '}
                  {sortedGenreSongs.length === 1 ? 'track' : 'tracks'}
                </Text>

                {sortedGenreSongs.length > 0 && (
                  <Pressable
                    style={styles.playAllButton}
                    onPress={() => handleGenrePlay(sortedGenreSongs)}>
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
              style={styles.genreSongRow}
              onPress={() => onSongPress(item, sortedGenreSongs)}
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

              <View style={styles.genreSongInfo}>
                <Text style={styles.genreSongTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.genreSongArtist} numberOfLines={1}>
                  {item.artist || 'Unknown artist'}
                </Text>
              </View>

              <Text style={styles.songMoreIcon}>⋮</Text>
            </Pressable>
          )}
        />

        {/* GENRE TRACKS SORT MODAL */}
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
                <Text style={styles.modalTitle}>Sort Genre Tracks By</Text>
                <TouchableOpacity
                  onPress={() => setDetailSortModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {(
                [
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

  /* =========================================================
     GENRES GRID VIEW
     ========================================================= */
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
            placeholder="Search genres..."
            placeholderTextColor="#737C91"
            autoFocus
            returnKeyType="search"
          />
        ) : (
          <Text style={styles.headerTitle}>Genres</Text>
        )}

        <View style={styles.headerActions}>
          <Pressable
            style={styles.searchButton}
            onPress={() => {
              if (searchOpen) {
                setSearchText('');
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
        key="genre-grid-list"
        data={filteredGenres}
        renderItem={renderGenreItem}
        keyExtractor={item => item.name}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>All genres</Text>
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
              {songs.length === 0 ? 'No genres found' : 'No matching genres'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {songs.length === 0
                ? 'Add music to your library and genres will appear here automatically.'
                : 'Try a different genre name.'}
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
              <Text style={styles.modalTitle}>Sort Genres By</Text>
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
                Genre Name
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
    paddingTop: 8,
  },
  menuButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  menuLine: {
    width: 28,
    height: 2.5,
    backgroundColor: '#C9D0DE',
    marginVertical: 3,
    borderRadius: 2,
  },
  headerTitle: {
    flex: 1,
    color: '#F3F4F8',
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
  searchButton: {
    width: 45,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#D6DCE8',
    fontSize: 24,
    fontWeight: '400',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 155,
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
  columnWrapper: {
    justifyContent: 'space-between',
  },
  genreCard: {
    width: '31.8%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111126',
    marginBottom: 12,
  },
  genreArtwork: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#09090D',
    position: 'relative',
    overflow: 'hidden',
  },
  genreImage: {
    width: '100%',
    height: '100%',
  },
  genreImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111A2E',
  },
  genrePlaceholderIcon: {
    color: '#5265E9',
    fontSize: 40,
  },
  playButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  playIcon: {
    color: '#343743',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  genreInfo: {
    minHeight: 62,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  genreName: {
    color: '#F0F1F5',
    fontSize: 14,
    fontWeight: '700',
  },
  genreTracks: {
    color: '#81899C',
    fontSize: 11,
    marginTop: 4,
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
  detailGenreName: {
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
  genreSongRow: {
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
  genreSongInfo: {
    flex: 1,
    marginLeft: 13,
  },
  genreSongTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  genreSongArtist: {
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

export default GenreScreen;