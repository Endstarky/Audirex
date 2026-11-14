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

type FolderScreenProps = {
  songs?: LocalSong[];
  currentSong?: LocalSong | null;
  isPlaying?: boolean;
  customFolders?: string[];

  onMenuPress: () => void;
  onPlayerPress: () => void;

  onSongPress?: (song: LocalSong, customList?: LocalSong[]) => void;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
};

type ChildFolder = {
  name: string;
  path: string;
  songCount: number;
};

type FolderListEntry =
  | {type: 'folder'; data: ChildFolder}
  | {type: 'song'; data: LocalSong};

type FolderSortCategory = 'name' | 'artist' | 'date' | 'count';

const FolderScreen = ({
  songs = [],
  currentSong = null,
  isPlaying = false,
  customFolders = ['Music', 'Download'],
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
}: FolderScreenProps) => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const {sortCategory, setSortCategory, isReverse, setIsReverse} =
    usePersistentSort<FolderSortCategory>('@audirex_sort_folders', 'name', false);

  const indexedSongs = useMemo(() => {
    const allRoots = Array.from(new Set(['Music', 'Download', ...customFolders]));

    return songs.map(song => {
      const fullPath = (song.path || '').replace(/\\/g, '/');
      let rootCategory = 'Other';
      let relativePath = '';

      for (const root of allRoots) {
        const regex = new RegExp(`/(?:${root}|${root}s)/(.*)`, 'i');
        const match = fullPath.match(regex);
        if (match) {
          rootCategory = root;
          relativePath = `${root}/${match[1]}`;
          break;
        }
      }

      if (rootCategory === 'Other') {
        const lastSlash = fullPath.lastIndexOf('/');
        relativePath =
          lastSlash !== -1 ? fullPath.substring(lastSlash + 1) : fullPath;
      }

      return {song, rootCategory, relativePath};
    });
  }, [songs, customFolders]);

  const {childFolders, directFiles, allSongsInCurrentBranch, folderTitle} =
    useMemo(() => {
      if (!currentPath) {
        const allRoots = Array.from(
          new Set(['Music', 'Download', ...customFolders]),
        );

        const roots: ChildFolder[] = allRoots.map(rootName => {
          const count = indexedSongs.filter(
            s => s.rootCategory.toLowerCase() === rootName.toLowerCase(),
          ).length;

          return {name: rootName, path: rootName, songCount: count};
        });

        return {
          childFolders: roots,
          directFiles: [] as LocalSong[],
          allSongsInCurrentBranch: [] as LocalSong[],
          folderTitle: 'Folders',
        };
      }

      const currentPrefix = `${currentPath}/`;
      const folderMap = new Map<string, number>();
      const filesInFolder: LocalSong[] = [];
      const branchSongs: LocalSong[] = [];

      indexedSongs.forEach(({song, relativePath}) => {
        if (relativePath.toLowerCase().startsWith(currentPrefix.toLowerCase())) {
          branchSongs.push(song);
          const subPath = relativePath.substring(currentPrefix.length);
          const parts = subPath.split('/');

          if (parts.length === 1) {
            filesInFolder.push(song);
          } else {
            const immediateSubfolderName = parts[0];
            const fullSubfolderPath = `${currentPath}/${immediateSubfolderName}`;
            folderMap.set(
              fullSubfolderPath,
              (folderMap.get(fullSubfolderPath) || 0) + 1,
            );
          }
        }
      });

      const subfolders: ChildFolder[] = Array.from(folderMap.entries()).map(
        ([fPath, count]) => ({
          name: fPath.split('/').pop() || fPath,
          path: fPath,
          songCount: count,
        }),
      );

      return {
        childFolders: subfolders,
        directFiles: filesInFolder,
        allSongsInCurrentBranch: branchSongs,
        folderTitle: currentPath.split('/').pop() || currentPath,
      };
    }, [currentPath, indexedSongs, customFolders]);

  const {listEntries, sortedFiles} = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    let folders = [...childFolders];
    if (q) {
      folders = folders.filter(f => f.name.toLowerCase().includes(q));
    }
    folders.sort((a, b) => {
      const comp =
        sortCategory === 'count'
          ? a.songCount - b.songCount
          : a.name.localeCompare(b.name, undefined, {numeric: true});
      return isReverse ? -comp : comp;
    });

    let files = [...directFiles];
    if (q) {
      files = files.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q),
      );
    }
    files.sort((a, b) => {
      let comp = 0;
      if (sortCategory === 'artist') {
        comp = (a.artist || '').localeCompare(b.artist || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortCategory === 'date') {
        const timeA = a.dateAdded ?? (Number(a.id) || 0);
        const timeB = b.dateAdded ?? (Number(b.id) || 0);
        comp = timeA - timeB;
      } else {
        comp = (a.title || '').localeCompare(b.title || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return isReverse ? -comp : comp;
    });

    const entries: FolderListEntry[] = [
      ...folders.map(f => ({type: 'folder' as const, data: f})),
      ...files.map(s => ({type: 'song' as const, data: s})),
    ];

    return {listEntries: entries, sortedFiles: files};
  }, [childFolders, directFiles, searchText, sortCategory, isReverse]);

  const getSortLabel = () => {
    switch (sortCategory) {
      case 'name':
        return isReverse ? 'Name (Z - A)' : 'Name (A - Z)';
      case 'artist':
        return isReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'date':
        return isReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
      case 'count':
        return isReverse ? 'Songs (Least)' : 'Songs (Most)';
    }
  };

  const handleBack = () => {
    if (!currentPath) return;
    const lastSlash = currentPath.lastIndexOf('/');
    setCurrentPath(lastSlash === -1 ? null : currentPath.substring(0, lastSlash));
    setSearchText('');
    setSearchOpen(false);
  };

  const handlePlayAll = () => {
    const listToPlay =
      sortedFiles.length > 0 ? sortedFiles : allSongsInCurrentBranch;
    if (listToPlay.length > 0 && onSongPress) {
      onSongPress(listToPlay[0], listToPlay);
    }
  };

  const renderEntry = useCallback(
    ({item}: ListRenderItemInfo<FolderListEntry>) => {
      if (item.type === 'folder') {
        const folder = item.data;
        return (
          <TouchableOpacity
            style={styles.folderItem}
            activeOpacity={0.75}
            onPress={() => {
              setCurrentPath(folder.path);
              setSearchText('');
              setSearchOpen(false);
            }}>
            <Image
              source={require('../../assets/icons/single-folder.png')}
              style={styles.folderIcon}
              resizeMode="contain"
            />
            <View style={styles.folderInfo}>
              <Text style={styles.folderName} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={styles.folderSubtitle}>
                {folder.songCount} {folder.songCount === 1 ? 'song' : 'songs'}
              </Text>
            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        );
      }

      const song = item.data;
      return (
        <Pressable
          style={styles.songRow}
          onPress={() => onSongPress && onSongPress(song, sortedFiles)}
          android_ripple={{color: '#111B31'}}>
          <View style={styles.songArtwork}>
            {song.artwork ? (
              <Image
                source={{uri: song.artwork}}
                style={styles.songArtworkImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.songArtworkIcon}>♪</Text>
            )}
          </View>
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist || 'Unknown artist'}
            </Text>
          </View>
          <Text style={styles.moreOptionsIcon}>⋮</Text>
        </Pressable>
      );
    },
    [onSongPress, sortedFiles],
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
        {currentPath ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}

        {searchOpen ? (
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search folder..."
            placeholderTextColor="#737C91"
            autoFocus
          />
        ) : (
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {folderTitle}
            </Text>
            {currentPath && (
              <Text style={styles.headerBreadcrumb} numberOfLines={1}>
                /{currentPath}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchText('');
          }}>
          <Text style={styles.searchIcon}>{searchOpen ? '✕' : '⌕'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listEntries}
        renderItem={renderEntry}
        keyExtractor={item =>
          item.type === 'folder' ? `dir-${item.data.path}` : `song-${item.data.id}`
        }
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Directory</Text>
              <TouchableOpacity
                style={styles.sortButton}
                activeOpacity={0.7}
                onPress={() => setSortModalVisible(true)}>
                <Text style={styles.sortIcon}>↕</Text>
                <Text style={styles.sortText}>{getSortLabel()}</Text>
              </TouchableOpacity>
            </View>

            {currentPath && allSongsInCurrentBranch.length > 0 && (
              <View style={styles.detailHeroBar}>
                <Text style={styles.detailTrackCount}>
                  {allSongsInCurrentBranch.length}{' '}
                  {allSongsInCurrentBranch.length === 1 ? 'song' : 'songs'}
                </Text>

                <Pressable style={styles.playAllButton} onPress={handlePlayAll}>
                  <Text style={styles.playAllIcon}>▶</Text>
                  <Text style={styles.playAllText}>Play all</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>Folder is empty</Text>
            <Text style={styles.emptySubtitle}>
              No playable audio files found in this directory.
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
              <Text style={styles.modalTitle}>Sort Directory By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {(
              [
                {key: 'name', label: 'Name / Title'},
                {key: 'artist', label: 'Artist Name'},
                {key: 'date', label: 'Date Added'},
                {key: 'count', label: 'Folder Song Count'},
              ] as const
            ).map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={styles.optionRow}
                onPress={() => setSortCategory(opt.key)}>
                <Text
                  style={[
                    styles.optionText,
                    sortCategory === opt.key && styles.optionTextActive,
                  ]}>
                  {opt.label}
                </Text>
                <View
                  style={[
                    styles.radioCircle,
                    sortCategory === opt.key && styles.radioCircleActive,
                  ]}>
                  {sortCategory === opt.key && <View style={styles.radioDot} />}
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
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#FFFFFF',
    fontSize: 27,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 38,
    marginTop: -4,
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  headerBreadcrumb: {
    color: '#717E9C',
    fontSize: 11,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0F182C',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 16,
    marginLeft: 8,
  },
  searchButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#CBD5E1',
    fontSize: 25,
    fontWeight: '300',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 145,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  folderItem: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#0A1023',
    borderWidth: 1,
    borderColor: '#14213B',
  },
  folderIcon: {
    width: 38,
    height: 38,
    marginRight: 14,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    color: '#E7EAF2',
    fontSize: 16,
    fontWeight: '600',
  },
  folderSubtitle: {
    color: '#6F7E9B',
    fontSize: 12,
    marginTop: 4,
  },
  chevronIcon: {
    color: '#4B5563',
    fontSize: 24,
    marginLeft: 8,
  },
  detailHeroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#121D34',
  },
  detailTrackCount: {
    color: '#8A97B2',
    fontSize: 13,
    fontWeight: '600',
  },
  playAllButton: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    backgroundColor: '#5265E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 6,
  },
  playAllText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  songRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  songArtwork: {
    width: 50,
    height: 50,
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
    marginLeft: 13,
  },
  songTitle: {
    color: '#EEF1F6',
    fontSize: 14,
    fontWeight: '700',
  },
  songArtist: {
    color: '#7C879C',
    fontSize: 11,
    marginTop: 4,
  },
  moreOptionsIcon: {
    color: '#7B88A0',
    fontSize: 22,
    paddingHorizontal: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
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
});

export default FolderScreen;