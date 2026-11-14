import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {getLocalSongs, LocalSong, requestMusicPermission} from '../services/localMusic';

type DiscoverScreenProps = {
  onBack: () => void;
  onSongPress: (song: LocalSong) => void;
};

const DiscoverScreen = ({onBack, onSongPress}: DiscoverScreenProps) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LocalSong[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const granted = await requestMusicPermission();
        if (!granted) {
          if (active) setSearchError('Allow music access to search your library.');
          return;
        }
        const songs = await getLocalSongs(query);
        if (active) setResults(songs);
      } catch (error) {
        console.log('Music search failed:', error);
        if (active) setSearchError('Your music library could not be searched.');
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText]);

  const handleBack = () => {
    Keyboard.dismiss();
    onBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchArea}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          ref={inputRef}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#7B8497"
          style={styles.searchInput}
          returnKeyType="search"
          selectionColor="#5369FF"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.clearIcon}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!searchText.trim() ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Search your library</Text>
            <Text style={styles.emptyText}>
              Search the music stored on this device. Audirex does not invent results or use an online catalogue here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Songs on this device</Text>
            {isSearching && <ActivityIndicator color="#5369FF" style={styles.loader} />}
            {!isSearching && searchError ? <Text style={styles.emptyText}>{searchError}</Text> : null}
            {!isSearching && !searchError && results.length === 0 ? (
              <Text style={styles.emptyText}>No matching songs found.</Text>
            ) : null}
            {results.map(song => (
              <TouchableOpacity key={song.id} style={styles.songRow} onPress={() => onSongPress(song)} activeOpacity={0.75}>
                <View style={styles.artwork}>
                  <Text style={styles.artworkIcon}>♪</Text>
                </View>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{song.artist || 'Unknown artist'}</Text>
                </View>
                <Text style={styles.more}>⋮</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050719'},
  searchArea: {height: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#18213A'},
  backButton: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center'},
  backIcon: {color: '#E8EBF3', fontSize: 38, fontWeight: '300'},
  searchIcon: {color: '#AEB6C8', fontSize: 24, marginRight: 8},
  searchInput: {flex: 1, color: '#F4F5F8', fontSize: 15, height: 48},
  clearIcon: {color: '#AEB6C8', fontSize: 25, paddingHorizontal: 10},
  content: {padding: 18, paddingBottom: 40},
  emptyState: {marginTop: 70, paddingHorizontal: 12},
  emptyTitle: {color: '#F4F5F8', fontSize: 22, fontWeight: '700', marginBottom: 10},
  emptyText: {color: '#7B8497', fontSize: 13, lineHeight: 20},
  sectionTitle: {color: '#F4F5F8', fontSize: 20, fontWeight: '700', marginBottom: 14},
  loader: {marginVertical: 18},
  songRow: {height: 68, flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8, borderRadius: 12},
  artwork: {width: 52, height: 52, borderRadius: 9, backgroundColor: '#151D36', alignItems: 'center', justifyContent: 'center'},
  artworkIcon: {color: '#6678EE', fontSize: 23},
  songInfo: {flex: 1, marginLeft: 13},
  songTitle: {color: '#F1F3F8', fontSize: 15, fontWeight: '600'},
  artist: {color: '#7F899E', fontSize: 12, marginTop: 4},
  more: {color: '#7F899E', fontSize: 23, paddingHorizontal: 8},
});

export default DiscoverScreen;
