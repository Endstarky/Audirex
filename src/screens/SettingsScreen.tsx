import React, {useState} from 'react';
import {
  Alert,
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

import {LocalSong, pickFolder} from '../services/localMusic';

/* =============================================================
   ICONS
   ============================================================= */

const ICONS = {
  albumArt: require('../../assets/icons/album_art.png'),
  scanner: require('../../assets/icons/scanner.png'),
};

type SettingsScreenProps = {
  currentSong: LocalSong | null;
  isPlaying: boolean;

  customFolders: string[];
  onAddCustomFolder: (folderPath: string) => void;
  onRemoveCustomFolder: (folderPath: string) => void;

  onMenuPress: () => void;
  onPlayerPress: () => void;
  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
};

const SettingsScreen = ({
  currentSong,
  isPlaying,

  customFolders = ['Music', 'Download'],
  onAddCustomFolder,
  onRemoveCustomFolder,

  onMenuPress,
  onPlayerPress,
  onTogglePlay,
  onPreviousSong,
  onNextSong,
}: SettingsScreenProps) => {
  /* =========================================================
     ACCORDION COLLAPSE / EXPAND STATES
     ========================================================= */

  const [audioExpanded, setAudioExpanded] = useState(true);
  const [albumArtExpanded, setAlbumArtExpanded] = useState(false);
  const [scannerExpanded, setScannerExpanded] = useState(true);

  /* =========================================================
     AUDIO SETTINGS TOGGLES
     ========================================================= */

  const [gapless, setGapless] = useState(true);
  const [crossfade, setCrossfade] = useState(true);
  const [crossfadeLength, setCrossfadeLength] = useState('1000ms');
  const [fadingPlayPause, setFadingPlayPause] = useState(true);
  const [bufferSize, setBufferSize] = useState('Standard (Normal)');
  const [audioOutput, setAudioOutput] = useState('AAudio HD');

  /* =========================================================
     SCANNER SETTINGS TOGGLES
     ========================================================= */

  const [scanOnLaunch, setScanOnLaunch] = useState(true);
  const [notifyNewTracks, setNotifyNewTracks] = useState(false);

  /* =========================================================
     ALBUM ART SETTINGS TOGGLES
     ========================================================= */

  const [loadEmbeddedArt, setLoadEmbeddedArt] = useState(true);
  const [preferHighRes, setPreferHighRes] = useState(true);

  /* =========================================================
     CUSTOM LOCATIONS MODAL STATE & HANDLERS
     ========================================================= */

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');

  const handleBrowseFolder = async () => {
    try {
      const selectedFolder = await pickFolder();
      if (selectedFolder) {
        onAddCustomFolder(selectedFolder);
      }
    } catch (error) {
      console.log('Error picking folder:', error);
      Alert.alert('Folder Picker Error', 'Could not open system directory picker.');
    }
  };

  const handleAddFolder = () => {
    const trimmed = newFolderPath.trim();
    if (!trimmed) {
      Alert.alert('Invalid Path', 'Please enter a folder name or directory path.');
      return;
    }

    onAddCustomFolder(trimmed);
    setNewFolderPath('');
  };

  /* =========================================================
     MINI PLAYER
     ========================================================= */

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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <Pressable style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* ===================================================
            1. AUDIO ACCORDION SECTION
            =================================================== */}
        <View style={styles.accordionGroup}>
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.7}
            onPress={() => setAudioExpanded(prev => !prev)}>
            <View style={styles.iconBox}>
              <Text style={styles.audioWhiteIcon}>▶</Text>
            </View>
            <Text style={styles.accordionTitle}>Audio</Text>
            <Text style={styles.chevronIcon}>{audioExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {audioExpanded && (
            <View style={styles.sectionBody}>
              {/* GAPLESS */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Gapless</Text>
                  <Text style={styles.settingSubtitle}>
                    When a track ends, next one starts instantly without a gap.
                  </Text>
                </View>
                <Switch
                  value={gapless}
                  onValueChange={setGapless}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* CROSSFADE */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Crossfade on track change</Text>
                  <Text style={styles.settingSubtitle}>
                    Smooth transition of audio from one track to another
                  </Text>
                </View>
                <Switch
                  value={crossfade}
                  onValueChange={setCrossfade}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* CROSSFADE LENGTH */}
              <TouchableOpacity
                style={styles.settingClickRow}
                activeOpacity={0.7}
                onPress={() => {
                  setCrossfadeLength(prev =>
                    prev === '1000ms'
                      ? '2000ms'
                      : prev === '2000ms'
                      ? '500ms'
                      : '1000ms',
                  );
                }}>
                <Text style={styles.settingTitle}>Crossfade length</Text>
                <Text style={styles.settingValueText}>{crossfadeLength}</Text>
              </TouchableOpacity>

              {/* FADING ON PLAY/PAUSE */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Fading on play/pause</Text>
                  <Text style={styles.settingSubtitle}>
                    Smooth fading on pause or resume playback
                  </Text>
                </View>
                <Switch
                  value={fadingPlayPause}
                  onValueChange={setFadingPlayPause}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* AUDIO BUFFER SIZE */}
              <TouchableOpacity
                style={styles.settingClickRow}
                activeOpacity={0.7}
                onPress={() => {
                  setBufferSize(prev =>
                    prev.includes('Standard')
                      ? 'Large (Low-latency)'
                      : 'Standard (Normal)',
                  );
                }}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Audio buffer size</Text>
                  <Text style={styles.settingSubtitle}>
                    Useful if audio playback stutters or clips
                  </Text>
                </View>
                <Text style={styles.settingValueText}>{bufferSize}</Text>
              </TouchableOpacity>

              {/* AUDIO OUTPUT CARD */}
              <View style={styles.outputCard}>
                <Text style={styles.outputTitle}>Audio output</Text>
                <Text style={styles.outputValue}>{audioOutput}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ===================================================
            2. ALBUM ART ACCORDION SECTION
            =================================================== */}
        <View style={styles.accordionGroup}>
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.7}
            onPress={() => setAlbumArtExpanded(prev => !prev)}>
            <View style={styles.iconBox}>
              <Image
                source={ICONS.albumArt}
                style={styles.settingIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.accordionTitle}>Album art</Text>
            <Text style={styles.chevronIcon}>
              {albumArtExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {albumArtExpanded && (
            <View style={styles.sectionBody}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Load embedded artwork</Text>
                  <Text style={styles.settingSubtitle}>
                    Extract embedded cover art tags from audio files
                  </Text>
                </View>
                <Switch
                  value={loadEmbeddedArt}
                  onValueChange={setLoadEmbeddedArt}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Prefer high-resolution art</Text>
                  <Text style={styles.settingSubtitle}>
                    Load full resolution album covers in player modal
                  </Text>
                </View>
                <Switch
                  value={preferHighRes}
                  onValueChange={setPreferHighRes}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        {/* ===================================================
            3. SCANNER ACCORDION SECTION
            =================================================== */}
        <View style={styles.accordionGroup}>
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.7}
            onPress={() => setScannerExpanded(prev => !prev)}>
            <View style={styles.iconBox}>
              <Image
                source={ICONS.scanner}
                style={styles.settingIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.accordionTitle}>Scanner</Text>
            <Text style={styles.chevronIcon}>{scannerExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {scannerExpanded && (
            <View style={styles.sectionBody}>
              {/* SCAN CUSTOM LOCATIONS */}
              <TouchableOpacity
                style={styles.settingClickRow}
                activeOpacity={0.7}
                onPress={() => setFolderModalVisible(true)}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Scan custom locations</Text>
                  <Text style={styles.settingSubtitle}>
                    {customFolders.map(f => `/storage/emulated/0/${f}`).join(' • ')}
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>

              {/* ON LAUNCH */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>On launch</Text>
                  <Text style={styles.settingSubtitle}>
                    Scan on the app launch for new tracks
                  </Text>
                </View>
                <Switch
                  value={scanOnLaunch}
                  onValueChange={setScanOnLaunch}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* NOTIFY ABOUT NEW TRACKS */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Notify about new tracks</Text>
                  <Text style={styles.settingSubtitle}>
                    Show notification banner when new songs are indexed
                  </Text>
                </View>
                <Switch
                  value={notifyNewTracks}
                  onValueChange={setNotifyNewTracks}
                  trackColor={{false: '#15213A', true: '#3E80FF'}}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* =====================================================
          CUSTOM LOCATIONS MODAL
          ===================================================== */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFolderModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan Locations</Text>
              <TouchableOpacity
                onPress={() => setFolderModalVisible(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Audirex scans these folders to index your music files:
            </Text>

            {/* FOLDERS LIST */}
            <View style={styles.folderListContainer}>
              {customFolders.map((folder, index) => (
                <View key={`${folder}-${index}`} style={styles.folderItemRow}>
                  <Text style={styles.folderIcon}>📁</Text>
                  <Text style={styles.folderPathText} numberOfLines={1}>
                    /storage/emulated/0/{folder}
                  </Text>
                  {folder !== 'Music' && folder !== 'Download' && (
                    <TouchableOpacity
                      onPress={() => onRemoveCustomFolder(folder)}
                      style={styles.deleteFolderBtn}>
                      <Text style={styles.deleteFolderText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* BROWSE SYSTEM DIALOG BUTTON */}
            <TouchableOpacity
              style={styles.browseButton}
              activeOpacity={0.8}
              onPress={handleBrowseFolder}>
              <Text style={styles.browseButtonIcon}>📁</Text>
              <Text style={styles.browseButtonText}>Browse & Select Folder</Text>
            </TouchableOpacity>

            <Text style={styles.orDividerText}>— OR ENTER PATH MANUALLY —</Text>

            {/* MANUAL INPUT */}
            <View style={styles.addFolderRow}>
              <TextInput
                style={styles.folderInput}
                placeholder="Folder name (e.g. Podcasts)"
                placeholderTextColor="#687794"
                value={newFolderPath}
                onChangeText={setNewFolderPath}
              />
              <TouchableOpacity
                style={styles.addFolderBtn}
                activeOpacity={0.8}
                onPress={handleAddFolder}>
                <Text style={styles.addFolderBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.8}
              onPress={() => setFolderModalVisible(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {renderMiniPlayer()}
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
    marginLeft: 6,
  },
  moreButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#D7DDEA',
    fontSize: 26,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 150,
  },
  accordionGroup: {
    marginBottom: 16,
    backgroundColor: '#091024',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#15213E',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#111D3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  audioWhiteIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
  settingIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  accordionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  chevronIcon: {
    color: '#717E98',
    fontSize: 13,
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: '#131E38',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#0E172C',
  },
  settingClickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#0E172C',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 14,
  },
  settingTitle: {
    color: '#EDF1F7',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: '#75839C',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  settingValueText: {
    color: '#3E80FF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionArrow: {
    color: '#75839C',
    fontSize: 22,
    fontWeight: '300',
  },
  outputCard: {
    backgroundColor: '#0D162B',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#162446',
  },
  outputTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  outputValue: {
    color: '#3E80FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 8,
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
  modalSubtitle: {
    color: '#72809A',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  folderListContainer: {
    maxHeight: 160,
    marginBottom: 16,
  },
  folderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D172E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  folderIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  folderPathText: {
    flex: 1,
    color: '#E0E5EF',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteFolderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteFolderText: {
    color: '#E05353',
    fontSize: 14,
    fontWeight: '700',
  },
  browseButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3548C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  browseButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  orDividerText: {
    color: '#556480',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  addFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  folderInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0E172C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#192644',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
    marginRight: 10,
  },
  addFolderBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1E2C52',
    borderWidth: 1,
    borderColor: '#293C6F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFolderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#16223F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  /* MINI PLAYER */
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
  miniPause: {
    color: '#F1F3F7',
    fontSize: 20,
    fontWeight: '600',
  },
  miniNext: {
    color: '#F1F3F7',
    fontSize: 21,
  },
});

export default SettingsScreen;