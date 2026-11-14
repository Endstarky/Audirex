import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import AlbumScreen from './src/screens/AlbumScreen';
import ArtistScreen from './src/screens/ArtistScreen';
import GenreScreen from './src/screens/GenreScreen';
import QueueScreen from './src/screens/QueueScreen';
import AllSongsScreen from './src/screens/AllSongsScreen';
import FolderScreen from './src/screens/FolderScreen';
import EqualizerScreen from './src/screens/EqualizerScreen';
import MixDetailScreen from './src/screens/MixDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import {
  getLocalSongs,
  LocalSong,
  requestMusicPermission,
  scanStorage,
} from './src/services/localMusic';

import {
  playSong,
  pauseSong,
  resumeSong,
} from './src/services/musicPlayer';

import {
  generateDailyMixes,
  recordSongPlayback,
} from './src/services/recommendationEngine';

/* =============================================================
   ICONS
   ============================================================= */

const ICONS = {
  home: require('./assets/icons/home.png'),
  allSongs: require('./assets/icons/allsongs.png'),
  albums: require('./assets/icons/albums.png'),
  artists: require('./assets/icons/artists.png'),
  genres: require('./assets/icons/genre.png'),
  playlists: require('./assets/icons/playlist.png'),
  folders: require('./assets/icons/folders.png'),
  settings: require('./assets/icons/settings.png'),
  equalizer: require('./assets/icons/equalizer-white.png'),
  queue: require('./assets/icons/queue.png'),
};

/* =============================================================
   SCREEN DIMENSIONS
   ============================================================= */

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 300);
const EDGE_SWIPE_ZONE = 36; // Left-edge touch activation zone in px

/* =============================================================
   LIBRARY PAGES
   ============================================================= */

type LibraryPage =
  | 'home'
  | 'allsongs'
  | 'queue'
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'genres'
  | 'folders'
  | 'equalizer'
  | 'mix'
  | 'settings';

const CUSTOM_FOLDERS_KEY = '@audirex_custom_folders';

/* =============================================================
   APP
   ============================================================= */

const App = () => {
  /* =========================================================
     SPLASH SCREEN
     ========================================================= */

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  /* =========================================================
     NAVIGATION & HISTORY STACK
     ========================================================= */

  const [currentPage, setCurrentPage] = useState<LibraryPage>('home');
  const [pageHistory, setPageHistory] = useState<LibraryPage[]>(['home']);

  const navigateTo = (page: LibraryPage) => {
    if (page === currentPage) return;
    setPageHistory(prev => [...prev, page]);
    setCurrentPage(page);
  };

  const handleGoBack = () => {
    if (pageHistory.length > 1) {
      const nextHistory = [...pageHistory];
      nextHistory.pop();
      const previousPage = nextHistory[nextHistory.length - 1];
      setPageHistory(nextHistory);
      setCurrentPage(previousPage);
      return true;
    }
    return false;
  };

  /* =========================================================
     SHARED MUSIC LIBRARY / PLAYER / QUEUE STATE
     ========================================================= */

  const [librarySongs, setLibrarySongs] = useState<LocalSong[]>([]);
  const [queue, setQueue] = useState<LocalSong[]>([]);
  const [currentSong, setCurrentSong] = useState<LocalSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /* =========================================================
     CUSTOM LOCATIONS SCANNING
     ========================================================= */

  const [customFolders, setCustomFolders] = useState<string[]>([
    'Music',
    'Download',
  ]);

  useEffect(() => {
    const loadSavedFolders = async () => {
      try {
        const saved = await AsyncStorage.getItem(CUSTOM_FOLDERS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomFolders(parsed);
          }
        }
      } catch (e) {
        console.log('Error reading saved custom folders:', e);
      }
    };
    loadSavedFolders();
  }, []);

  const handleAddCustomFolder = async (folder: string) => {
    if (!folder || customFolders.includes(folder)) return;
    const updated = [...customFolders, folder];
    setCustomFolders(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated));
      reloadLibrary(updated);
    } catch (e) {
      console.log('Error saving custom folder:', e);
    }
  };

  const handleRemoveCustomFolder = async (folder: string) => {
    const updated = customFolders.filter(f => f !== folder);
    setCustomFolders(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated));
      reloadLibrary(updated);
    } catch (e) {
      console.log('Error removing custom folder:', e);
    }
  };

  /* =========================================================
     RECOMMENDATION ENGINE MIXES & PLAYBACK LOGGING
     ========================================================= */

  const [morningMix, setMorningMix] = useState<LocalSong[]>([]);
  const [eveningMix, setEveningMix] = useState<LocalSong[]>([]);
  const songStartTimeRef = useRef<number>(Date.now());

  const [selectedMix, setSelectedMix] = useState<{
    title: string;
    subtitle: string;
    icon: string;
    songs: LocalSong[];
  } | null>(null);

  const logPlayback = (song: LocalSong | null) => {
    if (!song) return;
    const elapsedSeconds = (Date.now() - songStartTimeRef.current) / 1000;
    const durationSeconds = (song.duration || 0) / 1000;
    recordSongPlayback(song.id, elapsedSeconds, durationSeconds);
  };

  const handleOpenMix = (
    title: string,
    subtitle: string,
    icon: string,
    songs: LocalSong[],
  ) => {
    setSelectedMix({title, subtitle, icon, songs});
    navigateTo('mix');
  };

  /* =========================================================
     LOAD LOCAL MUSIC LIBRARY
     ========================================================= */

  const reloadLibrary = async (foldersToScan = customFolders) => {
    try {
      const granted = await requestMusicPermission();
      if (!granted) return;

      await scanStorage();

      const songs = await getLocalSongs('', foldersToScan);
      setLibrarySongs(songs);
      setQueue(songs);

      const {morningMix: mMix, eveningMix: eMix} = await generateDailyMixes(
        songs,
      );
      setMorningMix(mMix);
      setEveningMix(eMix);
    } catch (error) {
      console.log('Failed to load music library:', error);
    }
  };

  useEffect(() => {
    let active = true;

    const initialLoad = async () => {
      try {
        const granted = await requestMusicPermission();
        if (!granted) return;

        await scanStorage();

        let initialFolders = ['Music', 'Download'];
        try {
          const saved = await AsyncStorage.getItem(CUSTOM_FOLDERS_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialFolders = parsed;
              setCustomFolders(parsed);
            }
          }
        } catch {
          // fallback
        }

        const songs = await getLocalSongs('', initialFolders);
        if (active) {
          setLibrarySongs(songs);
          setQueue(songs);

          const {morningMix: mMix, eveningMix: eMix} =
            await generateDailyMixes(songs);
          setMorningMix(mMix);
          setEveningMix(eMix);
        }
      } catch (error) {
        console.log('Failed to load music library:', error);
      }
    };

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  /* =========================================================
     SONG PRESS / CONTEXT-AWARE QUEUE REPLACEMENT
     ========================================================= */

  const handleSongPress = async (
    song: LocalSong,
    explicitQueue?: LocalSong[],
  ) => {
    try {
      logPlayback(currentSong);
      songStartTimeRef.current = Date.now();

      let nextQueue = explicitQueue;

      if (!nextQueue || nextQueue.length === 0) {
        if (currentPage === 'queue') {
          nextQueue = queue;
        } else if (currentPage === 'albums' && song.album) {
          nextQueue = librarySongs.filter(
            s =>
              s.album?.trim().toLowerCase() ===
              song.album?.trim().toLowerCase(),
          );
        } else if (currentPage === 'artists' && song.artist) {
          nextQueue = librarySongs.filter(
            s =>
              s.artist?.trim().toLowerCase() ===
              song.artist?.trim().toLowerCase(),
          );
        } else if (currentPage === 'genres') {
          const songGenre = (song.genre || 'Unknown Genre')
            .trim()
            .toLowerCase();
          nextQueue = librarySongs.filter(
            s =>
              (s.genre || 'Unknown Genre').trim().toLowerCase() === songGenre,
          );
        } else if (currentPage === 'folders' && song.path) {
          const songDir = song.path.substring(0, song.path.lastIndexOf('/'));
          nextQueue = librarySongs.filter(
            s =>
              s.path &&
              s.path.substring(0, s.path.lastIndexOf('/')) === songDir,
          );
        } else {
          nextQueue = librarySongs;
        }
      }

      if (nextQueue && nextQueue.length > 0) {
        setQueue(nextQueue);
      }

      await playSong(song);
      setCurrentSong(song);
      setIsPlaying(true);
      handlePlayerPress();
    } catch (error) {
      console.log('Failed to play song:', error);
      setIsPlaying(false);
    }
  };

  /* =========================================================
     PLAY / PAUSE
     ========================================================= */

  const handleTogglePlay = async () => {
    if (!currentSong) return;

    try {
      if (isPlaying) {
        await pauseSong();
        setIsPlaying(false);
      } else {
        await resumeSong();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log('Failed to toggle playback:', error);
    }
  };

  /* =========================================================
     NEXT SONG (QUEUED)
     ========================================================= */

  const handleNextSong = async () => {
    const activeList = queue.length > 0 ? queue : librarySongs;
    if (!currentSong || activeList.length === 0) return;

    logPlayback(currentSong);
    songStartTimeRef.current = Date.now();

    const currentIndex = activeList.findIndex(
      song => song.id === currentSong.id,
    );
    if (currentIndex === -1) return;

    const nextIndex =
      currentIndex + 1 < activeList.length ? currentIndex + 1 : 0;
    const nextSong = activeList[nextIndex];

    try {
      await playSong(nextSong);
      setCurrentSong(nextSong);
      setIsPlaying(true);
    } catch (error) {
      console.log('Failed to play next song:', error);
    }
  };

  /* =========================================================
     PREVIOUS SONG (QUEUED)
     ========================================================= */

  const handlePreviousSong = async () => {
    const activeList = queue.length > 0 ? queue : librarySongs;
    if (!currentSong || activeList.length === 0) return;

    logPlayback(currentSong);
    songStartTimeRef.current = Date.now();

    const currentIndex = activeList.findIndex(
      song => song.id === currentSong.id,
    );
    if (currentIndex === -1) return;

    const previousIndex =
      currentIndex > 0 ? currentIndex - 1 : activeList.length - 1;
    const previousSong = activeList[previousIndex];

    try {
      await playSong(previousSong);
      setCurrentSong(previousSong);
      setIsPlaying(true);
    } catch (error) {
      console.log('Failed to play previous song:', error);
    }
  };

  /* =========================================================
     QUEUE EDIT HANDLERS
     ========================================================= */

  const handleRemoveFromQueue = (songId: string) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  /* =========================================================
     SEARCH, PLAYER & SIDEBAR STATE + REFS FOR GESTURES
     ========================================================= */

  const [searchOpen, setSearchOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerOrigin, setPlayerOrigin] = useState<LibraryPage>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchOpenRef = useRef(searchOpen);
  const playerOpenRef = useRef(playerOpen);
  const playerOriginRef = useRef(playerOrigin);
  const sidebarOpenRef = useRef(sidebarOpen);

  searchOpenRef.current = searchOpen;
  playerOpenRef.current = playerOpen;
  playerOriginRef.current = playerOrigin;
  sidebarOpenRef.current = sidebarOpen;

  const playerY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /* =========================================================
     SIDEBAR ANIMATIONS & EDGE SWIPE GESTURE
     ========================================================= */

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSidebarOpen(false);
    });
  };

  const sidebarPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Block sidebar swipe completely when PlayerScreen or Discover/Search is open
        if (playerOpenRef.current || searchOpenRef.current) {
          return false;
        }

        const isHorizontal =
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4;

        if (!isHorizontal) return false;

        // If sidebar is closed: only trigger when dragging from the left screen edge
        if (!sidebarOpenRef.current) {
          const touchStartX = evt.nativeEvent.pageX - gestureState.dx;
          return touchStartX <= EDGE_SWIPE_ZONE && gestureState.dx > 0;
        }

        // If sidebar is open: allow dragging left anywhere to close it
        return gestureState.dx < 0;
      },

      onPanResponderGrant: () => {
        if (!sidebarOpenRef.current) {
          setSidebarOpen(true);
        }
      },

      onPanResponderMove: (_evt, gestureState) => {
        if (sidebarOpenRef.current && gestureState.dx <= 0) {
          const nextX = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx));
          drawerX.setValue(nextX);
          overlayOpacity.setValue(1 + nextX / DRAWER_WIDTH);
        } else {
          const nextX = Math.max(
            -DRAWER_WIDTH,
            Math.min(0, -DRAWER_WIDTH + gestureState.dx),
          );
          drawerX.setValue(nextX);
          overlayOpacity.setValue(1 + nextX / DRAWER_WIDTH);
        }
      },

      onPanResponderRelease: (_evt, gestureState) => {
        const shouldOpen =
          gestureState.vx > 0.35 ||
          (gestureState.vx >= -0.35 &&
            (sidebarOpenRef.current
              ? gestureState.dx > -DRAWER_WIDTH * 0.35
              : gestureState.dx > DRAWER_WIDTH * 0.35));

        if (shouldOpen) {
          openSidebar();
        } else {
          closeSidebar();
        }
      },

      onPanResponderTerminate: () => {
        if (sidebarOpenRef.current) {
          openSidebar();
        } else {
          closeSidebar();
        }
      },
    }),
  ).current;

  /* =========================================================
     PLAYER ANIMATIONS & DRAG-DOWN DISMISS GESTURE
     ========================================================= */

  const handlePlayerPress = () => {
    setPlayerOrigin(currentPage);
    setSearchOpen(false);
    if (sidebarOpen) {
      closeSidebar();
    }
    playerY.setValue(SCREEN_HEIGHT);
    setPlayerOpen(true);

    requestAnimationFrame(() => {
      Animated.timing(playerY, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const handlePlayerBack = () => {
    Animated.timing(playerY, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPlayerOpen(false);
      setCurrentPage(playerOriginRef.current);
      playerY.setValue(SCREEN_HEIGHT);
    });
  };

  const playerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Capture clear downward vertical drags while leaving seek-bar horizontal drags & taps untouched
        return (
          gestureState.dy > 12 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },

      onPanResponderMove: (_evt, gestureState) => {
        const clampedY = Math.max(0, gestureState.dy);
        playerY.setValue(clampedY);
      },

      onPanResponderRelease: (_evt, gestureState) => {
        const shouldDismiss =
          gestureState.dy > SCREEN_HEIGHT * 0.22 || gestureState.vy > 0.65;

        if (shouldDismiss) {
          handlePlayerBack();
        } else {
          Animated.spring(playerY, {
            toValue: 0,
            bounciness: 4,
            speed: 14,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(playerY, {
          toValue: 0,
          bounciness: 4,
          speed: 14,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  /* =========================================================
     MENU & NAVIGATION HELPERS
     ========================================================= */

  const handleMenuPress = () => {
    if (sidebarOpen) {
      closeSidebar();
      return;
    }
    if (searchOpen) {
      setSearchOpen(false);
    }
    if (playerOpen) {
      Animated.timing(playerY, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setPlayerOpen(false);
        openSidebar();
      });
      return;
    }
    openSidebar();
  };

  const handleSearchPress = () => {
    if (playerOpen) {
      Animated.timing(playerY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.cubic,
        useNativeDriver: true,
      }).start(() => {
        setPlayerOpen(false);
      });
    }
    setSearchOpen(true);
  };

  const handleSearchBack = () => {
    setSearchOpen(false);
  };

  const handleOpenQueueFromPlayer = () => {
    Animated.timing(playerY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPlayerOpen(false);
      navigateTo('queue');
      playerY.setValue(SCREEN_HEIGHT);
    });
  };

  const handleOpenEqualizerFromPlayer = () => {
    Animated.timing(playerY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPlayerOpen(false);
      navigateTo('equalizer');
      playerY.setValue(SCREEN_HEIGHT);
    });
  };

  const handleDrawerItemPress = (item: string) => {
    closeSidebar();

    if (item === 'Home') {
      navigateTo('home');
      return;
    }
    if (item === 'All Songs') {
      navigateTo('allsongs');
      return;
    }
    if (item === 'Queue') {
      navigateTo('queue');
      return;
    }
    if (item === 'Playlists') {
      navigateTo('playlists');
      return;
    }
    if (item === 'Albums') {
      navigateTo('albums');
      return;
    }
    if (item === 'Artists') {
      navigateTo('artists');
      return;
    }
    if (item === 'Genres') {
      navigateTo('genres');
      return;
    }
    if (item === 'Folders') {
      navigateTo('folders');
      return;
    }
    if (item === 'Equalizer') {
      navigateTo('equalizer');
      return;
    }
    if (item === 'Settings') {
      navigateTo('settings');
      return;
    }
  };

  /* =========================================================
     ANDROID HARDWARE BACK BUTTON HANDLER
     ========================================================= */

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (playerOpen) {
        handlePlayerBack();
        return true;
      }

      if (searchOpen) {
        handleSearchBack();
        return true;
      }

      if (sidebarOpen) {
        closeSidebar();
        return true;
      }

      if (pageHistory.length > 1) {
        handleGoBack();
        return true;
      }

      return false;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress,
    );

    return () => backSubscription.remove();
  }, [playerOpen, searchOpen, sidebarOpen, pageHistory, playerOrigin]);

  /* =========================================================
     RENDER
     ========================================================= */

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <View style={styles.container} {...sidebarPanResponder.panHandlers}>
      {/* =====================================================
          HOME
          ===================================================== */}
      {currentPage === 'home' && (
        <HomeScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          morningMix={morningMix}
          eveningMix={eveningMix}
          onOpenMix={handleOpenMix}
          onSongPress={handleSongPress}
          onSearchPress={handleSearchPress}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          RECOMMENDED MIX DETAILS SCREEN
          ===================================================== */}
      {currentPage === 'mix' && selectedMix && (
        <MixDetailScreen
          title={selectedMix.title}
          subtitle={selectedMix.subtitle}
          icon={selectedMix.icon}
          songs={selectedMix.songs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onBack={handleGoBack}
          onSongPress={handleSongPress}
          onPlayerPress={handlePlayerPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          ALL SONGS
          ===================================================== */}
      {currentPage === 'allsongs' && (
        <AllSongsScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onSongPress={handleSongPress}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          QUEUE
          ===================================================== */}
      {currentPage === 'queue' && (
        <QueueScreen
          queue={queue}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={handleClearQueue}
        />
      )}

      {/* =====================================================
          PLAYLISTS
          ===================================================== */}
      {currentPage === 'playlists' && (
        <PlaylistScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onBack={handleGoBack}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          ALBUMS
          ===================================================== */}
      {currentPage === 'albums' && (
        <AlbumScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onSearchPress={handleSearchPress}
          onPlayerPress={handlePlayerPress}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          ARTISTS
          ===================================================== */}
      {currentPage === 'artists' && (
        <ArtistScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          GENRES
          ===================================================== */}
      {currentPage === 'genres' && (
        <GenreScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          FOLDERS
          ===================================================== */}
      {currentPage === 'folders' && (
        <FolderScreen
          songs={librarySongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          customFolders={customFolders}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onSongPress={handleSongPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          EQUALIZER
          ===================================================== */}
      {currentPage === 'equalizer' && (
        <EqualizerScreen
          currentSong={currentSong}
          isPlaying={isPlaying}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onBack={handleGoBack}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          SETTINGS
          ===================================================== */}
      {currentPage === 'settings' && (
        <SettingsScreen
          currentSong={currentSong}
          isPlaying={isPlaying}
          customFolders={customFolders}
          onAddCustomFolder={handleAddCustomFolder}
          onRemoveCustomFolder={handleRemoveCustomFolder}
          onMenuPress={handleMenuPress}
          onPlayerPress={handlePlayerPress}
          onTogglePlay={handleTogglePlay}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
        />
      )}

      {/* =====================================================
          SEARCH / DISCOVER
          ===================================================== */}
      {searchOpen && (
        <View style={styles.searchOverlay}>
          <DiscoverScreen
            onBack={handleSearchBack}
            onSongPress={handleSongPress}
          />
        </View>
      )}

      {/* =====================================================
          GLOBAL PLAYER MODAL (DRAG DOWN TO DISMISS)
          ===================================================== */}
      {playerOpen && (
        <Animated.View
          {...playerPanResponder.panHandlers}
          style={[
            styles.playerOverlay,
            {
              transform: [{translateY: playerY}],
            },
          ]}>
          <PlayerScreen
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNextSong={handleNextSong}
            onPreviousSong={handlePreviousSong}
            onBack={handlePlayerBack}
            onQueuePress={handleOpenQueueFromPlayer}
            onEqualizerPress={handleOpenEqualizerFromPlayer}
          />
        </Animated.View>
      )}

      {/* =====================================================
          GLOBAL SIDEBAR
          ===================================================== */}
      {sidebarOpen && (
        <View style={styles.sidebarLayer} pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backgroundOverlay,
              {opacity: overlayOpacity},
            ]}
          />

          <Pressable
            style={[
              styles.outsidePress,
              {left: DRAWER_WIDTH},
            ]}
            onPress={closeSidebar}
          />

          <Animated.View
            style={[
              styles.drawer,
              {
                width: DRAWER_WIDTH,
                transform: [{translateX: drawerX}],
              },
            ]}>
            <View style={styles.drawerTop}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>♫</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.7}
                onPress={closeSidebar}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navigation}>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'home' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Home')}>
                <Image
                  source={ICONS.home}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'home' && styles.selectedText,
                  ]}>
                  Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'allsongs' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('All Songs')}>
                <Image
                  source={ICONS.allSongs}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'allsongs' && styles.selectedText,
                  ]}>
                  All Songs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'queue' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Queue')}>
                <Image
                  source={ICONS.queue}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'queue' && styles.selectedText,
                  ]}>
                  Queue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'albums' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Albums')}>
                <Image
                  source={ICONS.albums}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'albums' && styles.selectedText,
                  ]}>
                  Albums
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'artists' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Artists')}>
                <Image
                  source={ICONS.artists}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'artists' && styles.selectedText,
                  ]}>
                  Artists
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'genres' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Genres')}>
                <Image
                  source={ICONS.genres}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'genres' && styles.selectedText,
                  ]}>
                  Genres
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'playlists' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Playlists')}>
                <Image
                  source={ICONS.playlists}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'playlists' && styles.selectedText,
                  ]}>
                  Playlists
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentPage === 'folders' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Folders')}>
                <Image
                  source={ICONS.folders}
                  style={styles.navIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.navText,
                    currentPage === 'folders' && styles.selectedText,
                  ]}>
                  Folders
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomNavigation}>
              <View style={styles.bottomDivider} />

              <TouchableOpacity
                style={[
                  styles.bottomItem,
                  currentPage === 'settings' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Settings')}>
                <Image
                  source={ICONS.settings}
                  style={styles.bottomIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.bottomText,
                    currentPage === 'settings' && styles.selectedText,
                  ]}>
                  Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bottomItem,
                  currentPage === 'equalizer' && styles.navItemSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => handleDrawerItemPress('Equalizer')}>
                <Image
                  source={ICONS.equalizer}
                  style={styles.bottomIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.bottomText,
                    currentPage === 'equalizer' && styles.selectedText,
                  ]}>
                  Equalizer
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
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
  searchOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    elevation: 50,
  },
  playerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 75,
    elevation: 75,
    backgroundColor: '#090F22',
  },
  sidebarLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  outsidePress: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#050719',
    borderRightWidth: 1,
    borderRightColor: '#18213A',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 0,
    },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  drawerTop: {
    height: 100,
    paddingTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#5369F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#78839A',
    fontSize: 29,
    fontWeight: '300',
  },
  navigation: {
    paddingHorizontal: 8,
    paddingTop: 5,
  },
  navItem: {
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  navItemSelected: {
    height: 58,
    backgroundColor: '#3548C5',
    marginVertical: 3,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  navText: {
    color: '#B7C0D0',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomNavigation: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 78,
  },
  bottomDivider: {
    height: 1,
    backgroundColor: '#1B253D',
    marginHorizontal: 2,
    marginBottom: 12,
  },
  bottomItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 9,
  },
  bottomIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  bottomText: {
    color: '#B7C0D0',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;