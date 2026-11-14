import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {LocalSong} from '../services/localMusic';
import {getLyrics} from '../services/lyricsService';

type LyricsScreenProps = {
  visible: boolean;
  song: LocalSong | null;
  onClose: () => void;
};

const LyricsScreen = ({visible, song, onClose}: LyricsScreenProps) => {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLyrics = async () => {
    if (!song) return;

    setLoading(true);
    setError(null);

    const result = await getLyrics(
      song.id,
      song.title,
      song.artist,
      song.duration,
    );

    if (result && result.lyrics) {
      setLyrics(result.lyrics);
      setIsOffline(result.isOffline);
    } else {
      setLyrics(null);
      setError('No lyrics found for this track.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (visible && song) {
      fetchLyrics();
    } else {
      setLyrics(null);
      setError(null);
    }
  }, [visible, song?.id]);

  if (!visible || !song) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* TOP BAR */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {song.artist || 'Unknown artist'}
            </Text>
          </View>

          {isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>SAVED</Text>
            </View>
          )}
        </View>

        {/* BODY */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#3E80FF" />
              <Text style={styles.loadingText}>Fetching lyrics online...</Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>♪</Text>
              <Text style={styles.errorTitle}>Lyrics Unavailable</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.8}
                onPress={fetchLyrics}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && lyrics && (
            <Text style={styles.lyricsBodyText}>{lyrics}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050719',
  },
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#121D38',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#0D162B',
  },
  backIcon: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 14,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  trackArtist: {
    color: '#7B88A2',
    fontSize: 12,
    marginTop: 2,
  },
  offlineBadge: {
    backgroundColor: '#11294F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1D4580',
  },
  offlineBadgeText: {
    color: '#3E80FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
  },
  lyricsBodyText: {
    color: '#E2E8F0',
    fontSize: 20,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  centerContainer: {
    paddingTop: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#718096',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyIcon: {
    fontSize: 48,
    color: '#283B66',
    marginBottom: 12,
  },
  errorTitle: {
    color: '#EDF2F7',
    fontSize: 18,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: '#718096',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#3548C5',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LyricsScreen;