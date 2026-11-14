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

type AllSongsScreenProps = {
  songs: LocalSong[];
  currentSong: LocalSong | null;
  isPlaying: boolean;

  onMenuPress: () => void;
  onPlayerPress: () => void;
  onSongPress: (song: LocalSong, customList?: LocalSong[]) => void;

  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
};

type SortCategory = 'date' | 'artist' | 'title';

const ITEM_HEIGHT = 78; // 72px row height + 6px bottom margin

const SongRow = React.memo(
  ({
    item,
    onPress,
    durationLabel,
  }: {
    item: LocalSong;
    onPress: (song: LocalSong) => void;
    durationLabel: string;
  }) => (
    <Pressable
      style={styles.songItem}
      onPress={() => onPress(item)}
      android_ripple={{color: '#15233E'}}>
      {/* ARTWORK */}
      <View style={styles.songArtwork}>
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

      {/* INFO */}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist || 'Unknown artist'}
        </Text>
      </View>

      {/* DURATION */}
      {durationLabel ? (
        <Text style={styles.duration}>{durationLabel}</Text>
      ) : null}

      {/* MORE */}
      <Pressable style={styles.moreButton}>
        <Text style={styles.moreIcon}>⋮</Text>
      </Pressable>
    </Pressable>
  ),
);

const AllSongsScreen = ({
  songs,
  currentSong,
  isPlaying,

  onMenuPress,
  onPlayerPress,
  onSongPress,

  onTogglePlay,
  onPreviousSong,
  onNextSong,
}: AllSongsScreenProps) => {
  /* =========================================================
     SEARCH & PERSISTENT SORT STATE
     ========================================================= */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const {sortCategory, setSortCategory, isReverse, setIsReverse} =
    usePersistentSort<SortCategory>('@audirex_sort_allsongs', 'title', false);

  /* =========================================================
     FILTER & SORT SONGS LIST
     ========================================================= */
  const displayedSongs = useMemo(() => {
    let list = [...songs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        song =>
          (song.title && song.title.toLowerCase().includes(q)) ||
          (song.artist && song.artist.toLowerCase().includes(q)) ||
          (song.album && song.album.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      let comparison = 0;

      if (sortCategory === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'artist') {
        comparison = (a.artist || '').localeCompare(b.artist || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'date') {
        const timeA = a.dateAdded ?? (Number(a.id) || 0);
        const timeB = b.dateAdded ?? (Number(b.id) || 0);
        comparison = timeA - timeB;
      }

      return isReverse ? -comparison : comparison;
    });

    return list;
  }, [songs, searchQuery, sortCategory, isReverse]);

  /* =========================================================
     HELPERS
     ========================================================= */
  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSortButtonLabel = () => {
    switch (sortCategory) {
      case 'title':
        return isReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'artist':
        return isReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'date':
        return isReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
    }
  };

  /* =========================================================
     FLATLIST CALLBACKS
     ========================================================= */
  const handleSelectSong = useCallback(
    (song: LocalSong) => {
      onSongPress(song, displayedSongs);
    },
    [onSongPress, displayedSongs],
  );

  const renderSongItem = useCallback(
    ({item}: ListRenderItemInfo<LocalSong>) => (
      <SongRow
        item={item}
        onPress={handleSelectSong}
        durationLabel={formatDuration(item.duration)}
      />
    ),
    [handleSelectSong],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<LocalSong> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>
          {searchQuery ? `Results (${displayedSongs.length})` : 'All songs'}
        </Text>

        <TouchableOpacity
          style={styles.sortButton}
          activeOpacity={0.7}
          onPress={() => setSortModalVisible(true)}>
          <Text style={styles.sortIcon}>↕</Text>
          <Text style={styles.sortText}>{getSortButtonLabel()}</Text>
        </TouchableOpacity>
      </View>
    ),
    [searchQuery, displayedSongs.length, sortCategory, isReverse],
  );

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.menuButton} onPress={onMenuPress}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        {searchOpen ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs, artists, albums..."
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
            <Text style={styles.headerTitle}>All Songs</Text>
            <Text style={styles.headerSubtitle}>
              {displayedSongs.length}{' '}
              {displayedSongs.length === 1 ? 'song' : 'songs'}
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

      {/* VIRTUALIZED SONG LIST */}
      <FlatList
        data={displayedSongs}
        renderItem={renderSongItem}
        keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
        ListHeaderComponent={listHeader}
        getItemLayout={getItemLayout}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>♪</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching songs' : 'No songs found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No songs match "${searchQuery}".`
                : 'Music stored on your device will appear here.'}
            </Text>
          </View>
        }
      />

      {/* =====================================================
          SORT OPTIONS MODAL
          ===================================================== */}
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
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* CATEGORIES */}
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => setSortCategory('title')}>
                <Text
                  style={[
                    styles.optionText,
                    sortCategory === 'title' && styles.optionTextActive,
                  ]}>
                  Title
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
                activeOpacity={0.7}
                onPress={() => setSortCategory('artist')}>
                <Text
                  style={[
                    styles.optionText,
                    sortCategory === 'artist' && styles.optionTextActive,
                  ]}>
                  Artist name
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
                activeOpacity={0.7}
                onPress={() => setSortCategory('date')}>
                <Text
                  style={[
                    styles.optionText,
                    sortCategory === 'date' && styles.optionTextActive,
                  ]}>
                  Date added / created
                </Text>
                <View
                  style={[
                    styles.radioCircle,
                    sortCategory === 'date' && styles.radioCircleActive,
                  ]}>
                  {sortCategory === 'date' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            {/* REVERSE ORDER TOGGLE */}
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

            {/* DONE BUTTON */}
            <TouchableOpacity
              style={styles.applyButton}
              activeOpacity={0.8}
              onPress={() => setSortModalVisible(false)}>
              <Text style={styles.applyButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          MINI PLAYER
          ===================================================== */}
      {currentSong && (
        <View style={styles.miniPlayer}>
          <Pressable style={styles.miniMain} onPress={onPlayerPress}>
            <View style={styles.miniArtwork}>
              {currentSong.artwork ? (
                <Image
                  source={{uri: currentSong.artwork}}
                  style={styles.miniArtworkImage}
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
      )}
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
  menuLine: {
    width: 27,
    height: 2.5,
    backgroundColor: '#C9D0DE',
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
    marginTop: 2,
    marginLeft: 4,
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
  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 145,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 2,
  },
  sortLabel: {
    color: '#E7EAF1',
    fontSize: 16,
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
  songItem: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  songArtwork: {
    width: 58,
    height: 58,
    borderRadius: 9,
    backgroundColor: '#101B31',
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
    fontSize: 24,
  },
  songInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#EEF0F5',
    fontSize: 14,
    fontWeight: '700',
  },
  songArtist: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 4,
  },
  duration: {
    color: '#737E94',
    fontSize: 11,
    marginRight: 4,
  },
  moreButton: {
    width: 42,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#AAB3C4',
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 85,
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
    elevation: 20,
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
  optionsList: {
    marginBottom: 12,
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
    elevation: 8,
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
  },
  miniTitle: {
    color: '#EEF0F5',
    fontSize: 14,
    fontWeight: '700',
  },
  miniArtist: {
    color: '#808BA0',
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
    color: '#F1F3F7',
    fontSize: 21,
  },
  miniPlay: {
    color: '#F1F3F7',
    fontSize: 20,
    fontWeight: '600',
  },
  miniNext: {
    color: '#F1F3F7',
    fontSize: 21,
  },
});

export default AllSongsScreen;