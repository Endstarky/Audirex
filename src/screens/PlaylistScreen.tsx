import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from '@dr.pogodin/react-native-fs';
import {LocalSong} from '../services/localMusic';
import {usePersistentSort} from '../hooks/usePersistentSort';

export type Playlist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  isDefault?: boolean;
};

type SortOption = 'recent' | 'name' | 'count';
type PlaylistDetailSortOption = 'custom' | 'title' | 'artist' | 'date';

type PlaylistScreenProps = {
  songs?: LocalSong[];
  currentSong?: LocalSong | null;
  isPlaying?: boolean;

  onMenuPress: () => void;
  onPlayerPress: () => void;
  onBack?: () => void;

  onSongPress?: (song: LocalSong, customList?: LocalSong[]) => void | Promise<void>;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
};

type DirEntry = {
  isFile: () => boolean;
  name: string;
  path: string;
};

const STORAGE_KEY = '@audirex_playlists';

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'liked-songs',
    name: 'Liked Songs',
    songIds: [],
    createdAt: 0,
    isDefault: true,
  },
];

const PlaylistScreen = ({
  songs = [],
  currentSong = null,
  isPlaying = false,
  onMenuPress,
  onPlayerPress,
  onSongPress,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
}: PlaylistScreenProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const {sortCategory: sortBy, setSortCategory: setSortBy} =
    usePersistentSort<SortOption>('@audirex_sort_playlists', 'recent', false);

  const {
    sortCategory: detailSortBy,
    setSortCategory: setDetailSortBy,
    isReverse: detailIsReverse,
    setIsReverse: setDetailIsReverse,
  } = usePersistentSort<PlaylistDetailSortOption>(
    '@audirex_sort_playlist_detail',
    'custom',
    false,
  );

  const [detailSortModalVisible, setDetailSortModalVisible] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamePlaylistName, setRenamePlaylistName] = useState('');

  const [globalHeaderMenuVisible, setGlobalHeaderMenuVisible] = useState(false);

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  const [activeSongForOptions, setActiveSongForOptions] = useState<LocalSong | null>(null);
  const [songOptionsModalVisible, setSongOptionsModalVisible] = useState(false);

  const [addSongsModalVisible, setAddSongsModalVisible] = useState(false);
  const [songSearchText, setSongSearchText] = useState('');

  const [m3uPickerVisible, setM3uPickerVisible] = useState(false);
  const [availableM3uFiles, setAvailableM3uFiles] = useState<{name: string; path: string}[]>([]);
  const [isNewPlaylistImport, setIsNewPlaylistImport] = useState(false);

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: Playlist[] = JSON.parse(data);
        const hasLiked = parsed.some(p => p.id === 'liked-songs');
        if (!hasLiked) {
          setPlaylists([DEFAULT_PLAYLISTS[0], ...parsed]);
        } else {
          setPlaylists(parsed);
        }
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYLISTS));
        setPlaylists(DEFAULT_PLAYLISTS);
      }
    } catch {
      setPlaylists(DEFAULT_PLAYLISTS);
    }
  }, []);

  const savePlaylists = async (updated: Playlist[]) => {
    try {
      setPlaylists(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      Alert.alert('Error', 'Failed to save playlists to storage.');
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const currentActivePlaylist = useMemo(() => {
    if (!selectedPlaylistId) return null;
    return playlists.find(p => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  const activePlaylistSongs = useMemo(() => {
    if (!currentActivePlaylist) return [];

    // Preserve playlist insertion order by mapping over songIds
    const songMap = new Map(songs.map(s => [s.id, s]));
    const ordered = currentActivePlaylist.songIds
      .map(id => songMap.get(id))
      .filter((s): s is LocalSong => Boolean(s));

    if (detailSortBy !== 'custom') {
      ordered.sort((a, b) => {
        let comparison = 0;
        if (detailSortBy === 'title') {
          comparison = (a.title || '').localeCompare(b.title || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        } else if (detailSortBy === 'artist') {
          comparison = (a.artist || '').localeCompare(
            b.artist || '',
            undefined,
            {numeric: true, sensitivity: 'base'},
          );
        } else if (detailSortBy === 'date') {
          const timeA = a.dateAdded ?? (Number(a.id) || 0);
          const timeB = b.dateAdded ?? (Number(b.id) || 0);
          comparison = timeA - timeB;
        }
        return comparison;
      });
    }

    return detailIsReverse ? ordered.reverse() : ordered;
  }, [currentActivePlaylist, songs, detailSortBy, detailIsReverse]);

  const getDetailSortLabel = () => {
    switch (detailSortBy) {
      case 'custom':
        return detailIsReverse ? 'Added order (Reverse)' : 'Added order';
      case 'title':
        return detailIsReverse ? 'Title (Z - A)' : 'Title (A - Z)';
      case 'artist':
        return detailIsReverse ? 'Artist (Z - A)' : 'Artist (A - Z)';
      case 'date':
        return detailIsReverse ? 'Date added (Oldest)' : 'Date added (Newest)';
    }
  };

  const handleCreatePlaylist = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Playlist name cannot be empty.');
      return;
    }

    const exists = playlists.some(
      p => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Duplicate Name', 'A playlist with this name already exists.');
      return;
    }

    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name: trimmed,
      songIds: [],
      createdAt: Date.now(),
    };

    const updated = [newPlaylist, ...playlists];
    await savePlaylists(updated);
    setNewPlaylistName('');
    setCreateModalVisible(false);
  };

  const handleOpenRename = (playlist: Playlist) => {
    setOptionsModalVisible(false);
    setRenamePlaylistName(playlist.name);
    setRenameModalVisible(true);
  };

  const handleRenamePlaylist = async () => {
    if (!activePlaylist) return;

    const trimmed = renamePlaylistName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Playlist name cannot be empty.');
      return;
    }

    const exists = playlists.some(
      p =>
        p.id !== activePlaylist.id &&
        p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Duplicate Name', 'A playlist with this name already exists.');
      return;
    }

    const updated = playlists.map(p =>
      p.id === activePlaylist.id ? {...p, name: trimmed} : p,
    );

    await savePlaylists(updated);
    setRenameModalVisible(false);
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    if (playlist.isDefault || playlist.id === 'liked-songs') {
      Alert.alert('Protected Playlist', 'Liked Songs cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = playlists.filter(p => p.id !== playlist.id);
            await savePlaylists(updated);
            setOptionsModalVisible(false);
            if (selectedPlaylistId === playlist.id) {
              setSelectedPlaylistId(null);
            }
          },
        },
      ],
    );
  };

  const handleToggleSongInPlaylist = async (songId: string) => {
    if (!currentActivePlaylist) return;

    const exists = currentActivePlaylist.songIds.includes(songId);
    const nextSongIds = exists
      ? currentActivePlaylist.songIds.filter(id => id !== songId)
      : [...currentActivePlaylist.songIds, songId];

    const updated = playlists.map(p =>
      p.id === currentActivePlaylist.id ? {...p, songIds: nextSongIds} : p,
    );

    await savePlaylists(updated);
  };

  const handleRemoveActiveSong = async () => {
    if (!currentActivePlaylist || !activeSongForOptions) return;

    const nextSongIds = currentActivePlaylist.songIds.filter(
      id => id !== activeSongForOptions.id,
    );

    const updated = playlists.map(p =>
      p.id === currentActivePlaylist.id ? {...p, songIds: nextSongIds} : p,
    );

    await savePlaylists(updated);
    setSongOptionsModalVisible(false);
    setActiveSongForOptions(null);
  };

  const handlePlayAll = () => {
    if (activePlaylistSongs.length > 0 && onSongPress) {
      onSongPress(activePlaylistSongs[0], activePlaylistSongs);
    }
  };

  const handleExportM3U = async (playlist: Playlist) => {
    setOptionsModalVisible(false);

    const playlistSongs = songs.filter(s => playlist.songIds.includes(s.id));
    if (playlistSongs.length === 0) {
      Alert.alert('Empty Playlist', 'Add songs before exporting to M3U.');
      return;
    }

    let m3u = '#EXTM3U\n';
    playlistSongs.forEach((song: LocalSong) => {
      m3u += `#EXTINF:${Math.round(song.duration / 1000)},${song.artist} - ${song.title}\n`;
      m3u += `${song.path}\n`;
    });

    const safeName = playlist.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const destinationPath = `${RNFS.DownloadDirectoryPath}/${safeName}.m3u`;

    try {
      await RNFS.writeFile(destinationPath, m3u, 'utf8');
      Alert.alert('Export Successful', `Saved playlist to Downloads folder:\n${safeName}.m3u`);
    } catch {
      Alert.alert('Export Failed', 'Could not write M3U file to device storage.');
    }
  };

  const handleOpenImportPicker = async (playlist: Playlist | null, asNew = false) => {
    setOptionsModalVisible(false);
    setGlobalHeaderMenuVisible(false);
    setActivePlaylist(playlist);
    setIsNewPlaylistImport(asNew);

    try {
      const files = (await RNFS.readDir(RNFS.DownloadDirectoryPath)) as DirEntry[];
      const m3uFiles = files
        .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.m3u'))
        .map(f => ({name: f.name, path: f.path}));

      if (m3uFiles.length === 0) {
        Alert.alert(
          'No M3U Files Found',
          'Place your .m3u files in your device "Download" folder to import them.',
        );
        return;
      }

      setAvailableM3uFiles(m3uFiles);
      setM3uPickerVisible(true);
    } catch {
      Alert.alert('Error', 'Unable to scan the Download folder.');
    }
  };

  const handleSelectM3UToImport = async (file: {name: string; path: string}) => {
    try {
      const fileData = await RNFS.readFile(file.path, 'utf8');
      const lines = fileData.split('\n');
      const importedPaths: string[] = [];

      lines.forEach((line: string) => {
        const clean = line.trim();
        if (clean && !clean.startsWith('#')) {
          importedPaths.push(clean.toLowerCase());
        }
      });

      const matchedIds = songs
        .filter((s: LocalSong) => {
          const sPath = s.path?.toLowerCase() || '';
          return importedPaths.some((p: string) => sPath.endsWith(p) || p.endsWith(sPath));
        })
        .map((s: LocalSong) => s.id);

      if (matchedIds.length === 0) {
        Alert.alert(
          'No Matches',
          'Could not find matching songs in your local library for the paths in that M3U file.',
        );
        return;
      }

      if (isNewPlaylistImport) {
        const rawName = file.name.replace(/\.m3u$/i, '').replace(/[_-]/g, ' ');
        const playlistName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const newPlaylist: Playlist = {
          id: `playlist_${Date.now()}`,
          name: playlistName,
          songIds: matchedIds,
          createdAt: Date.now(),
        };

        const updated = [newPlaylist, ...playlists];
        await savePlaylists(updated);
        setM3uPickerVisible(false);
        Alert.alert(
          'Playlist Imported',
          `Created playlist "${playlistName}" with ${matchedIds.length} track(s).`,
        );
      } else if (activePlaylist) {
        const merged = Array.from(new Set([...activePlaylist.songIds, ...matchedIds]));
        const updated = playlists.map(p =>
          p.id === activePlaylist.id ? {...p, songIds: merged} : p,
        );

        await savePlaylists(updated);
        setM3uPickerVisible(false);
        Alert.alert(
          'Import Successful',
          `Added ${matchedIds.length} track(s) to "${activePlaylist.name}".`,
        );
      }
    } catch {
      Alert.alert('Import Failed', 'Unable to read the chosen file.');
    }
  };

  const cycleSort = () => {
    if (sortBy === 'recent') setSortBy('name');
    else if (sortBy === 'name') setSortBy('count');
    else setSortBy('recent');
  };

  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];
    const q = searchText.trim().toLowerCase();
    if (q) {
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      if (a.id === 'liked-songs') return -1;
      if (b.id === 'liked-songs') return 1;

      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'count') return b.songIds.length - a.songIds.length;
      return b.createdAt - a.createdAt;
    });
  }, [playlists, searchText, sortBy]);

  const candidateSongs = useMemo(() => {
    const q = songSearchText.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s: LocalSong) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q),
    );
  }, [songs, songSearchText]);

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

  if (currentActivePlaylist) {
    const firstArt = activePlaylistSongs.find(s => s.artwork)?.artwork;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedPlaylistId(null)}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {currentActivePlaylist.name}
          </Text>

          <TouchableOpacity
            style={styles.detailActionBtn}
            onPress={() => setAddSongsModalVisible(true)}>
            <Text style={styles.addSongHeaderIcon}>+ ♫</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          key="playlist-detail-list"
          data={activePlaylistSongs}
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
                  {currentActivePlaylist.id === 'liked-songs' ? (
                    <View style={styles.likedHeroPlaceholder}>
                      <Text style={styles.likedHeroIcon}>♥</Text>
                    </View>
                  ) : firstArt ? (
                    <Image
                      source={{uri: firstArt}}
                      style={styles.detailArtworkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.detailArtworkIcon}>♪</Text>
                  )}
                </View>

                <Text style={styles.detailPlaylistName} numberOfLines={2}>
                  {currentActivePlaylist.name}
                </Text>

                <Text style={styles.detailStats}>
                  {activePlaylistSongs.length}{' '}
                  {activePlaylistSongs.length === 1 ? 'track' : 'tracks'}
                </Text>

                <View style={styles.heroButtonRow}>
                  {activePlaylistSongs.length > 0 && (
                    <Pressable style={styles.playAllButton} onPress={handlePlayAll}>
                      <Text style={styles.playAllIcon}>▶</Text>
                      <Text style={styles.playAllText}>Play all</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.addSongsPill}
                    onPress={() => setAddSongsModalVisible(true)}>
                    <Text style={styles.addSongsPillText}>+ Add songs</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.detailSortRow}>
                <Text style={styles.songSectionTitle}>Songs</Text>
                <TouchableOpacity
                  style={styles.detailSortPill}
                  activeOpacity={0.7}
                  onPress={() => setDetailSortModalVisible(true)}>
                  <Text style={styles.detailSortIcon}>↕</Text>
                  <Text style={styles.detailSortText}>{getDetailSortLabel()}</Text>
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyDetailBox}>
              <Text style={styles.emptyDetailText}>
                No songs in this playlist yet.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setAddSongsModalVisible(true)}>
                <Text style={styles.emptyAddBtnText}>Add songs now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({item}) => (
            <Pressable
              style={styles.songRow}
              onPress={() => onSongPress && onSongPress(item, activePlaylistSongs)}
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

              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.artist || 'Unknown artist'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.songMoreBtn}
                onPress={() => {
                  setActiveSongForOptions(item);
                  setSongOptionsModalVisible(true);
                }}>
                <Text style={styles.songMoreIcon}>⋮</Text>
              </TouchableOpacity>
            </Pressable>
          )}
        />

        {renderMiniPlayer()}

        {/* PLAYLIST TRACKS SORT MODAL */}
        <Modal
          visible={detailSortModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailSortModalVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDetailSortModalVisible(false)}>
            <Pressable
              style={styles.sortModalCard}
              onPress={e => e.stopPropagation()}>
              <View style={styles.sortModalHeader}>
                <Text style={styles.sortModalTitle}>Sort Playlist Songs By</Text>
                <TouchableOpacity
                  onPress={() => setDetailSortModalVisible(false)}>
                  <Text style={styles.sortModalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {(
                [
                  {key: 'custom', label: 'Added Order'},
                  {key: 'title', label: 'Title'},
                  {key: 'artist', label: 'Artist Name'},
                  {key: 'date', label: 'Date Added'},
                ] as const
              ).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortOptionRow}
                  onPress={() => setDetailSortBy(opt.key)}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      detailSortBy === opt.key && styles.sortOptionTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      detailSortBy === opt.key && styles.radioCircleActive,
                    ]}>
                    {detailSortBy === opt.key && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.sortModalDivider} />

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
                style={styles.sortApplyButton}
                onPress={() => setDetailSortModalVisible(false)}>
                <Text style={styles.sortApplyButtonText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* VIRTUALIZED ADD SONGS PICKER MODAL */}
        <Modal
          visible={addSongsModalVisible}
          animationType="slide"
          onRequestClose={() => setAddSongsModalVisible(false)}>
          <SafeAreaView style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add to Playlist</Text>
              <TouchableOpacity
                onPress={() => setAddSongsModalVisible(false)}
                style={styles.pickerCloseBtn}>
                <Text style={styles.pickerCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.pickerSearch}
              placeholder="Search library songs..."
              placeholderTextColor="#7D879B"
              value={songSearchText}
              onChangeText={setSongSearchText}
            />

            <FlatList
              data={candidateSongs}
              keyExtractor={item => item.id}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
              removeClippedSubviews={true}
              contentContainerStyle={styles.pickerList}
              renderItem={({item}) => {
                const isSelected = currentActivePlaylist.songIds.includes(item.id);
                return (
                  <Pressable
                    style={styles.pickerItem}
                    onPress={() => handleToggleSongInPlaylist(item.id)}>
                    <View style={styles.pickerArt}>
                      {item.artwork ? (
                        <Image
                          source={{uri: item.artwork}}
                          style={styles.songArtworkImage}
                        />
                      ) : (
                        <Text style={styles.songArtworkIcon}>♪</Text>
                      )}
                    </View>

                    <View style={styles.pickerSongInfo}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.pickerCheck,
                        isSelected && styles.pickerCheckSelected,
                      ]}>
                      <Text style={styles.pickerCheckText}>
                        {isSelected ? '✓' : '+'}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </Modal>

        {/* SONG ACTIONS MODAL */}
        <Modal
          visible={songOptionsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSongOptionsModalVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSongOptionsModalVisible(false)}>
            <View style={styles.sheetCard}>
              <Text style={styles.sheetHeader} numberOfLines={1}>
                {activeSongForOptions?.title}
              </Text>

              <TouchableOpacity
                style={[styles.sheetOption, styles.sheetOptionDelete]}
                onPress={handleRemoveActiveSong}>
                <Text style={[styles.sheetOptionIcon, styles.deleteColor]}>✕</Text>
                <Text style={[styles.sheetOptionText, styles.deleteColor]}>
                  Remove from Playlist
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
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
            placeholder="Search playlists..."
            placeholderTextColor="#7D879B"
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle}>Playlists</Text>
        )}

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.searchButton}
            onPress={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchText('');
            }}>
            <Text style={styles.searchIcon}>{searchOpen ? '✕' : '⌕'}</Text>
          </Pressable>

          <TouchableOpacity
            style={styles.headerMoreButton}
            onPress={() => setGlobalHeaderMenuVisible(true)}>
            <Text style={styles.headerMoreIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        key="playlist-main-list"
        data={filteredPlaylists}
        keyExtractor={item => item.id}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Pressable
              style={styles.createButton}
              onPress={() => setCreateModalVisible(true)}>
              <Text style={styles.createPlus}>+</Text>
              <Text style={styles.createText}>Create Playlist</Text>
            </Pressable>

            <View style={styles.listHeader}>
              <Text style={styles.playlistCount}>
                {playlists.length}{' '}
                {playlists.length === 1 ? 'playlist' : 'playlists'}
              </Text>

              <Pressable style={styles.sortButton} onPress={cycleSort}>
                <Text style={styles.sortIcon}>↕</Text>
                <Text style={styles.sortText}>
                  {sortBy === 'recent'
                    ? 'Recently added'
                    : sortBy === 'name'
                    ? 'Alphabetical'
                    : 'Song count'}
                </Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({item: playlist}) => {
          const firstArt = songs.find(
            s => playlist.songIds.includes(s.id) && s.artwork,
          )?.artwork;

          return (
            <Pressable
              style={styles.playlistItem}
              onPress={() => setSelectedPlaylistId(playlist.id)}
              android_ripple={{color: '#132038'}}>
              <View style={styles.playlistArtwork}>
                {playlist.id === 'liked-songs' ? (
                  <View style={styles.likedArtworkPlaceholder}>
                    <Text style={styles.likedHeartIcon}>♥</Text>
                  </View>
                ) : firstArt ? (
                  <Image
                    source={{uri: firstArt}}
                    style={styles.artworkImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.defaultArtworkPlaceholder}>
                    <Text style={styles.defaultArtworkIcon}>♪</Text>
                  </View>
                )}
              </View>

              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {playlist.name}
                </Text>
                <Text style={styles.songCount}>
                  {playlist.songIds.length}{' '}
                  {playlist.songIds.length === 1 ? 'song' : 'songs'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => {
                  setActivePlaylist(playlist);
                  setOptionsModalVisible(true);
                }}>
                <Text style={styles.moreIcon}>⋮</Text>
              </TouchableOpacity>
            </Pressable>
          );
        }}
      />

      {renderMiniPlayer()}

      {/* MODALS (Create, Rename, Sheet, M3U) */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#7D879B"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewPlaylistName('');
                  setCreateModalVisible(false);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleCreatePlaylist}>
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#7D879B"
              value={renamePlaylistName}
              onChangeText={setRenamePlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setRenamePlaylistName('');
                  setRenameModalVisible(false);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleRenamePlaylist}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={globalHeaderMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGlobalHeaderMenuVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setGlobalHeaderMenuVisible(false)}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetHeader}>Options</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleOpenImportPicker(null, true)}>
              <Text style={styles.sheetOptionIcon}>📥</Text>
              <Text style={styles.sheetOptionText}>Import Playlist from M3U</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetHeader} numberOfLines={1}>
              {activePlaylist?.name}
            </Text>

            {!activePlaylist?.isDefault && activePlaylist?.id !== 'liked-songs' && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => activePlaylist && handleOpenRename(activePlaylist)}>
                <Text style={styles.sheetOptionIcon}>✎</Text>
                <Text style={styles.sheetOptionText}>Rename Playlist</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => activePlaylist && handleExportM3U(activePlaylist)}>
              <Text style={styles.sheetOptionIcon}>↗</Text>
              <Text style={styles.sheetOptionText}>Export to Downloads (.m3u)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => activePlaylist && handleOpenImportPicker(activePlaylist, false)}>
              <Text style={styles.sheetOptionIcon}>↙</Text>
              <Text style={styles.sheetOptionText}>Import Songs to this Playlist (.m3u)</Text>
            </TouchableOpacity>

            {!activePlaylist?.isDefault && activePlaylist?.id !== 'liked-songs' && (
              <TouchableOpacity
                style={[styles.sheetOption, styles.sheetOptionDelete]}
                onPress={() => activePlaylist && handleDeletePlaylist(activePlaylist)}>
                <Text style={[styles.sheetOptionIcon, styles.deleteColor]}>✕</Text>
                <Text style={[styles.sheetOptionText, styles.deleteColor]}>
                  Delete Playlist
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={m3uPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setM3uPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isNewPlaylistImport ? 'Import New Playlist' : 'Select an M3U File'}
            </Text>
            <Text style={styles.modalSubtitle}>Found in your Downloads folder:</Text>

            <ScrollView style={{maxHeight: 220, marginBottom: 12}}>
              {availableM3uFiles.map(file => (
                <TouchableOpacity
                  key={file.path}
                  style={styles.m3uFileItem}
                  onPress={() => handleSelectM3UToImport(file)}>
                  <Text style={styles.m3uFileIcon}>📄</Text>
                  <Text style={styles.m3uFileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setM3uPickerVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  menuButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
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
    color: '#F5F6FA',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0E1729',
    borderRadius: 10,
    color: '#F5F6FA',
    paddingHorizontal: 14,
    fontSize: 16,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#D6DCE8',
    fontSize: 25,
    fontWeight: '300',
  },
  headerMoreButton: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMoreIcon: {
    color: '#D6DCE8',
    fontSize: 25,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 145,
  },
  createButton: {
    height: 58,
    borderRadius: 13,
    backgroundColor: '#101C32',
    borderWidth: 1,
    borderColor: '#284265',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  createPlus: {
    color: '#F2F4F8',
    fontSize: 28,
    fontWeight: '300',
    marginRight: 10,
    marginTop: -2,
  },
  createText: {
    color: '#F1F3F8',
    fontSize: 16,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  playlistCount: {
    color: '#7D879B',
    fontSize: 13,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    color: '#9BA5B8',
    fontSize: 18,
    marginRight: 5,
  },
  sortText: {
    color: '#9BA5B8',
    fontSize: 13,
    fontWeight: '600',
  },
  playlistItem: {
    width: '100%',
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  playlistArtwork: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#101B31',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  likedArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedHeartIcon: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  defaultArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111E36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultArtworkIcon: {
    color: '#5265E9',
    fontSize: 28,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  playlistName: {
    color: '#EEF0F5',
    fontSize: 16,
    fontWeight: '700',
  },
  songCount: {
    color: '#7C879C',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  moreButton: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#AAB3C4',
    fontSize: 24,
    fontWeight: '700',
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
  detailActionBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSongHeaderIcon: {
    color: '#5265E9',
    fontSize: 20,
    fontWeight: '700',
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
  likedHeroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedHeroIcon: {
    color: '#FFFFFF',
    fontSize: 70,
  },
  detailArtworkImage: {
    width: '100%',
    height: '100%',
  },
  detailArtworkIcon: {
    color: '#5265E9',
    fontSize: 60,
  },
  detailPlaylistName: {
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
  heroButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  playAllButton: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: '#5265E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  addSongsPill: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: '#14223A',
    borderWidth: 1,
    borderColor: '#22385D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSongsPillText: {
    color: '#EDF2F7',
    fontSize: 14,
    fontWeight: '600',
  },
  detailSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  songSectionTitle: {
    color: '#E7EAF1',
    fontSize: 19,
    fontWeight: '700',
  },
  detailSortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C152B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#192644',
  },
  detailSortIcon: {
    color: '#3E80FF',
    fontSize: 15,
    marginRight: 6,
    fontWeight: '700',
  },
  detailSortText: {
    color: '#BAC7E0',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDetailBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyDetailText: {
    color: '#7D879B',
    fontSize: 14,
    marginBottom: 14,
  },
  emptyAddBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#13213B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#263C62',
  },
  emptyAddBtnText: {
    color: '#5265E9',
    fontSize: 14,
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
  songMoreBtn: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songMoreIcon: {
    color: '#8A96AC',
    fontSize: 22,
    fontWeight: '700',
  },
  sortModalCard: {
    width: '100%',
    backgroundColor: '#091024',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#192644',
    padding: 20,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sortModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sortModalClose: {
    color: '#7B88A2',
    fontSize: 18,
    fontWeight: '600',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sortOptionText: {
    color: '#8A97B0',
    fontSize: 15,
    fontWeight: '500',
  },
  sortOptionTextActive: {
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
  sortModalDivider: {
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
  sortApplyButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#3548C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#050719',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#17223A',
  },
  pickerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#5265E9',
    borderRadius: 8,
  },
  pickerCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pickerSearch: {
    height: 46,
    backgroundColor: '#0F1A2D',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0E1729',
  },
  pickerArt: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#111A2E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSongInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pickerCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckSelected: {
    backgroundColor: '#5265E9',
    borderColor: '#5265E9',
  },
  pickerCheckText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F192C',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1D2E4D',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#818EAA',
    fontSize: 13,
    marginBottom: 12,
  },
  modalInput: {
    height: 48,
    backgroundColor: '#070C18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1D2F4F',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#8E9AB4',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirm: {
    backgroundColor: '#5265E9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 20,
    color: '#CBD5E1',
    width: 32,
  },
  sheetOptionText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetOptionDelete: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1A2944',
  },
  deleteColor: {
    color: '#EF4444',
  },
  m3uFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2A44',
  },
  m3uFileIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  m3uFileName: {
    color: '#F0F4FA',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default PlaylistScreen;