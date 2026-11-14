import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {LocalSong} from '../services/localMusic';

type QueueScreenProps = {
  queue?: LocalSong[];
  currentSong?: LocalSong | null;
  isPlaying?: boolean;

  onMenuPress: () => void;
  onPlayerPress: () => void;

  onSongPress?: (song: LocalSong) => void;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
  onRemoveFromQueue?: (songId: string) => void;
  onClearQueue?: () => void;
};

const QUEUE_ROW_HEIGHT = 70;

const QueueScreen = ({
  queue = [],
  currentSong = null,
  isPlaying = false,
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  onRemoveFromQueue,
  onClearQueue,
}: QueueScreenProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  const filteredQueue = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return queue;

    return queue.filter(
      song =>
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q),
    );
  }, [queue, searchText]);

  const renderQueueItem = useCallback(
    ({item}: ListRenderItemInfo<LocalSong>) => {
      const isCurrent = currentSong?.id === item.id;
      return (
        <Pressable
          style={[styles.songRow, isCurrent && styles.activeSongRow]}
          onPress={() => onSongPress && onSongPress(item)}
          android_ripple={{color: '#132038'}}>
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

          <View style={styles.songInfo}>
            <Text
              style={[styles.songTitle, isCurrent && styles.activeSongTitle]}
              numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {item.artist || 'Unknown artist'}
            </Text>
          </View>

          {isCurrent && (
            <View style={styles.nowPlayingBadge}>
              <Text style={styles.nowPlayingBadgeText}>
                {isPlaying ? 'PLAYING' : 'PAUSED'}
              </Text>
            </View>
          )}

          {onRemoveFromQueue && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveFromQueue(item.id)}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      );
    },
    [currentSong?.id, isPlaying, onSongPress, onRemoveFromQueue],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: QUEUE_ROW_HEIGHT,
      offset: QUEUE_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderMiniPlayer = () => {
    if (!currentSong) return null;

    return (
      <Pressable style={styles.miniPlayer} onPress={onPlayerPress}>
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

        {onPreviousSong && (
          <Pressable
            style={styles.miniButton}
            onPress={e => {
              e.stopPropagation();
              onPreviousSong();
            }}>
            <Text style={styles.miniPrevious}>|◁</Text>
          </Pressable>
        )}

        {onTogglePlay && (
          <Pressable
            style={styles.miniButton}
            onPress={e => {
              e.stopPropagation();
              onTogglePlay();
            }}>
            <Text style={styles.miniPause}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
          </Pressable>
        )}

        {onNextSong && (
          <Pressable
            style={styles.miniButton}
            onPress={e => {
              e.stopPropagation();
              onNextSong();
            }}>
            <Text style={styles.miniNext}>▷|</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

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
            placeholder="Search queue..."
            placeholderTextColor="#7D879B"
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle}>Queue</Text>
        )}

        <Pressable
          style={styles.searchButton}
          onPress={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchText('');
          }}>
          <Text style={styles.searchIcon}>{searchOpen ? '✕' : '⌕'}</Text>
        </Pressable>

        <Pressable
          style={styles.moreTopButton}
          onPress={() => setOptionsModalVisible(true)}>
          <Text style={styles.moreTopIcon}>⋮</Text>
        </Pressable>
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>♪</Text>
          <Text style={styles.emptyTitle}>Your queue is empty</Text>
          <Text style={styles.emptySubtitle}>
            Songs you play or add will appear in your queue
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredQueue}
          renderItem={renderQueueItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.queueMetaBar}>
              <Text style={styles.queueMetaText}>
                {queue.length} {queue.length === 1 ? 'song' : 'songs'} in queue
              </Text>

              {onClearQueue && (
                <TouchableOpacity
                  style={styles.clearQueueBtn}
                  onPress={onClearQueue}>
                  <Text style={styles.clearQueueText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {renderMiniPlayer()}

      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetHeader}>Queue Options</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setOptionsModalVisible(false);
                if (onClearQueue) onClearQueue();
              }}>
              <Text style={[styles.sheetOptionIcon, styles.deleteColor]}>✕</Text>
              <Text style={[styles.sheetOptionText, styles.deleteColor]}>
                Clear Entire Queue
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  menuButton: {
    width: 48,
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
  headerTitle: {
    flex: 1,
    color: '#F4F5F8',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0E1729',
    borderRadius: 10,
    color: '#F5F6FA',
    paddingHorizontal: 14,
    fontSize: 16,
    marginHorizontal: 6,
  },
  searchButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#D6DCE8',
    fontSize: 24,
    fontWeight: '400',
  },
  moreTopButton: {
    width: 38,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTopIcon: {
    color: '#C7CEDC',
    fontSize: 26,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 145,
  },
  queueMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#121D34',
  },
  queueMetaText: {
    color: '#7D889E',
    fontSize: 13,
    fontWeight: '600',
  },
  clearQueueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearQueueText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  songRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  activeSongRow: {
    backgroundColor: 'rgba(82, 101, 233, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#5265E9',
  },
  songArtwork: {
    width: 48,
    height: 48,
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
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  activeSongTitle: {
    color: '#5265E9',
  },
  songArtist: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 4,
  },
  nowPlayingBadge: {
    backgroundColor: '#5265E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 6,
  },
  nowPlayingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  removeButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    color: '#3C4866',
    fontSize: 52,
    fontWeight: '300',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#DCE1EB',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 7,
  },
  emptySubtitle: {
    color: '#727D93',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
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
    paddingHorizontal: 10,
    elevation: 8,
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
    width: 40,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPrevious: {
    color: '#F1F3F7',
    fontSize: 18,
    fontWeight: '600',
  },
  miniPause: {
    color: '#F1F3F7',
    fontSize: 21,
    fontWeight: '600',
  },
  miniNext: {
    color: '#F1F3F7',
    fontSize: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheetCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#0F1A2E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203456',
  },
  sheetHeader: {
    color: '#828FA9',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#172744',
    marginBottom: 6,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  sheetOptionIcon: {
    fontSize: 18,
    width: 30,
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteColor: {
    color: '#EF4444',
  },
});

export default QueueScreen;