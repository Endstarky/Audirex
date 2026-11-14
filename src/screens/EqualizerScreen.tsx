import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LocalSong} from '../services/localMusic';
import {
  initAudioEffects,
  setAllBandsDb,
  setBandDb,
  setBassBoostEnabled as nativeSetBassBoostEnabled,
  setBassBoostStrength,
  setEqualizerEnabled as nativeSetEqualizerEnabled,
} from '../services/audioEffects';

/* =============================================================
   TYPES & PRESETS
   ============================================================= */

type EqualizerScreenProps = {
  currentSong?: LocalSong | null;
  isPlaying?: boolean;
  onMenuPress?: () => void;
  onPlayerPress: () => void;
  onBack?: () => void;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
};

type PresetType = 'Custom' | 'Pop' | 'Rock' | 'Hip-Hop' | 'Classical' | 'Jazz';

type BandInfo = {
  id: number;
  freq: string;
  value: number; // dB from -12 to +12
};

const BANDS_DEFAULT: BandInfo[] = [
  {id: 0, freq: '60 Hz', value: 3},
  {id: 1, freq: '230 Hz', value: 1},
  {id: 2, freq: '910 Hz', value: -2},
  {id: 3, freq: '3.6 kHz', value: 2},
  {id: 4, freq: '14 kHz', value: 4},
];

const PRESETS: Record<PresetType, number[]> = {
  Custom: [3, 1, -2, 2, 4],
  Pop: [-1, 2, 5, 1, -2],
  Rock: [4, 2, -2, 2, 5],
  'Hip-Hop': [5, 3, 0, 2, 3],
  Classical: [4, 3, -2, 2, -1],
  Jazz: [3, 2, -1, 2, 4],
};

const STORAGE_KEY = '@audirex_equalizer_profile';
const SLIDER_HEIGHT = 160;

/* =============================================================
   COMPONENT: VERTICAL EQ SLIDER
   ============================================================= */

interface VerticalBandSliderProps {
  band: BandInfo;
  disabled?: boolean;
  onValueChange: (id: number, value: number) => void;
}

const VerticalBandSlider = ({
  band,
  disabled = false,
  onValueChange,
}: VerticalBandSliderProps) => {
  const startValRef = useRef(band.value);
  const lastEmittedVal = useRef(band.value);

  const percent = ((band.value + 12) / 24) * 100;
  const thumbTop = SLIDER_HEIGHT - (percent / 100) * SLIDER_HEIGHT;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        startValRef.current = band.value;
      },
      onPanResponderMove: (_e, gestureState) => {
        const deltaY = -gestureState.dy;
        const dBChange = (deltaY / SLIDER_HEIGHT) * 24;
        const raw = startValRef.current + dBChange;
        const clamped = Math.round(Math.max(-12, Math.min(12, raw)));
        if (clamped !== lastEmittedVal.current) {
          lastEmittedVal.current = clamped;
          onValueChange(band.id, clamped);
        }
      },
    }),
  ).current;

  const formattedDb = band.value > 0 ? `+${band.value} dB` : `${band.value} dB`;

  return (
    <View style={styles.bandColumn}>
      <Text style={[styles.bandDbValue, disabled && styles.textDisabled]}>
        {formattedDb}
      </Text>

      <View style={styles.sliderTrackContainer} {...panResponder.panHandlers}>
        <View style={styles.sliderTrackBackground}>
          <View
            style={[
              styles.sliderFill,
              {
                height: `${Math.max(0, Math.min(100, percent))}%`,
                backgroundColor: disabled ? '#334155' : '#3E80FF',
              },
            ]}
          />

          <View
            style={[
              styles.sliderThumb,
              {
                top: Math.max(0, Math.min(SLIDER_HEIGHT - 16, thumbTop - 8)),
                borderColor: disabled ? '#64748B' : '#5791FF',
                backgroundColor: disabled ? '#1E293B' : '#FFFFFF',
              },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.bandFreqLabel, disabled && styles.textDisabled]}>
        {band.freq}
      </Text>
    </View>
  );
};

/* =============================================================
   MAIN SCREEN COMPONENT
   ============================================================= */

const EqualizerScreen = ({
  currentSong = null,
  isPlaying = false,
  onPlayerPress,
  onBack,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
}: EqualizerScreenProps) => {
  const [eqEnabled, setEqEnabled] = useState(true);
  const [bassBoostEnabled, setBassBoostEnabled] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('Custom');
  const [bands, setBands] = useState<BandInfo[]>(BANDS_DEFAULT);

  /* =========================================================
     INIT NATIVE HARDWARE AUDIOFX & LOAD STORAGE
     ========================================================= */

  const loadSettingsAndInitDSP = useCallback(async () => {
    try {
      // 1. Initialize native Android Equalizer & BassBoost
      await initAudioEffects(0);

      // 2. Load saved profile
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const isEqOn = parsed.eqEnabled ?? true;
        const isBbOn = parsed.bassBoostEnabled ?? true;
        const loadedPreset = parsed.selectedPreset || 'Custom';
        const loadedBands: BandInfo[] = parsed.bands || BANDS_DEFAULT;

        setEqEnabled(isEqOn);
        setBassBoostEnabled(isBbOn);
        setSelectedPreset(loadedPreset);
        setBands(loadedBands);

        // Apply loaded settings to hardware DSP immediately
        await nativeSetEqualizerEnabled(isEqOn);
        await nativeSetBassBoostEnabled(isBbOn);
        if (isBbOn) await setBassBoostStrength(700);
        await setAllBandsDb(loadedBands.map(b => b.value));
      } else {
        // Apply defaults to DSP
        await nativeSetEqualizerEnabled(true);
        await nativeSetBassBoostEnabled(true);
        await setBassBoostStrength(700);
        await setAllBandsDb(BANDS_DEFAULT.map(b => b.value));
      }
    } catch (e) {
      console.log('Error initializing DSP:', e);
    }
  }, []);

  useEffect(() => {
    loadSettingsAndInitDSP();
  }, [loadSettingsAndInitDSP]);

  /* =========================================================
     HARDWARE-CONNECTED ACTIONS
     ========================================================= */

  const handleToggleEqualizer = async (enabled: boolean) => {
    setEqEnabled(enabled);
    await nativeSetEqualizerEnabled(enabled);
  };

  const handleToggleBassBoost = async (enabled: boolean) => {
    setBassBoostEnabled(enabled);
    await nativeSetBassBoostEnabled(enabled);
    if (enabled) {
      await setBassBoostStrength(700);
    }
  };

  const handleBandChange = async (id: number, newValue: number) => {
    setSelectedPreset('Custom');
    setBands(prev =>
      prev.map(band => (band.id === id ? {...band, value: newValue} : band)),
    );
    // Real-time hardware DSP modulation
    await setBandDb(id, newValue);
  };

  const handleSelectPreset = async (preset: PresetType) => {
    setSelectedPreset(preset);
    const presetValues = PRESETS[preset];
    const updatedBands = bands.map((band, idx) => ({
      ...band,
      value: presetValues[idx] !== undefined ? presetValues[idx] : 0,
    }));
    setBands(updatedBands);

    // Apply entire curve to hardware DSP
    await setAllBandsDb(updatedBands.map(b => b.value));
  };

  const handleReset = async () => {
    setSelectedPreset('Custom');
    const flatBands = bands.map(b => ({...b, value: 0}));
    setBands(flatBands);
    setBassBoostEnabled(false);

    await setAllBandsDb([0, 0, 0, 0, 0]);
    await nativeSetBassBoostEnabled(false);
  };

  const handleSave = async () => {
    try {
      const payload = {
        eqEnabled,
        bassBoostEnabled,
        selectedPreset,
        bands,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      Alert.alert('Saved', 'Your equalizer profile has been applied and saved.');
    } catch {
      Alert.alert('Error', 'Unable to save equalizer settings.');
    }
  };

  const handleInfoPress = () => {
    Alert.alert(
      'Audirex Equalizer',
      'Fine-tunes the output audio using Android hardware DSP. Slide to boost or cut frequencies in real-time.',
    );
  };

  /* =========================================================
     MINI PLAYER RENDERER
     ========================================================= */

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
            }}
            android_ripple={{color: '#203452', borderless: true}}>
            <Text style={styles.miniPrevious}>|◁</Text>
          </Pressable>
        )}

        {onTogglePlay && (
          <Pressable
            style={styles.miniButton}
            onPress={e => {
              e.stopPropagation();
              onTogglePlay();
            }}
            android_ripple={{color: '#203452', borderless: true}}>
            <Text style={styles.miniPause}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
          </Pressable>
        )}

        {onNextSong && (
          <Pressable
            style={styles.miniButton}
            onPress={e => {
              e.stopPropagation();
              onNextSong();
            }}
            android_ripple={{color: '#203452', borderless: true}}>
            <Text style={styles.miniNext}>▷|</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Equalizer</Text>

        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={handleInfoPress}>
          <View style={styles.infoCircle}>
            <Text style={styles.infoText}>i</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* SHAPE YOUR SOUND (MASTER TOGGLE) */}
        <View style={styles.titleSection}>
          <View style={styles.titleTextContainer}>
            <Text style={styles.mainTitle}>Shape your sound</Text>
            <Text style={styles.subTitle}>Small adjustments. A whole new feeling.</Text>
          </View>

          <Switch
            value={eqEnabled}
            onValueChange={handleToggleEqualizer}
            trackColor={{false: '#18243C', true: '#3B82F6'}}
            thumbColor={'#FFFFFF'}
          />
        </View>

        {/* PRESETS */}
        <Text style={styles.sectionHeading}>Presets</Text>

        <View style={styles.presetsGrid}>
          {(['Custom', 'Pop', 'Rock', 'Hip-Hop', 'Classical', 'Jazz'] as PresetType[]).map(
            preset => {
              const isSelected = selectedPreset === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetPill,
                    isSelected && styles.presetPillActive,
                    !eqEnabled && styles.pillDisabled,
                  ]}
                  disabled={!eqEnabled}
                  activeOpacity={0.75}
                  onPress={() => handleSelectPreset(preset)}>
                  <Text
                    style={[
                      styles.presetPillText,
                      isSelected && styles.presetPillTextActive,
                      !eqEnabled && styles.textDisabled,
                    ]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {/* EQUALIZER CARD (SLIDERS) */}
        <View style={[styles.eqCard, !eqEnabled && styles.eqCardDisabled]}>
          <View style={styles.dbMarkersRow}>
            <Text style={styles.dbMarkerText}>+12 dB</Text>
            <Text style={styles.dbMarkerText}>0 dB</Text>
            <Text style={styles.dbMarkerText}>-12 dB</Text>
          </View>

          <View style={styles.slidersRow}>
            {bands.map(band => (
              <VerticalBandSlider
                key={band.id}
                band={band}
                disabled={!eqEnabled}
                onValueChange={handleBandChange}
              />
            ))}
          </View>
        </View>

        {/* BASS BOOST TOGGLE */}
        <View style={styles.bassBoostCard}>
          <View style={styles.titleTextContainer}>
            <Text style={styles.bassBoostTitle}>Bass Boost</Text>
            <Text style={styles.subTitle}>A little more depth to every beat.</Text>
          </View>

          <Switch
            value={bassBoostEnabled}
            onValueChange={handleToggleBassBoost}
            trackColor={{false: '#18243C', true: '#3B82F6'}}
            thumbColor={'#FFFFFF'}
          />
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.resetButton} activeOpacity={0.75} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: '#BAC7DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    color: '#BAC7DE',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 160,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subTitle: {
    color: '#7685A0',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  presetPill: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: '#0D172A',
    borderWidth: 1,
    borderColor: '#192847',
  },
  presetPillActive: {
    backgroundColor: '#0C234E',
    borderColor: '#2F6EE8',
  },
  pillDisabled: {
    opacity: 0.45,
  },
  presetPillText: {
    color: '#8493AD',
    fontSize: 14,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  textDisabled: {
    color: '#4B5563',
  },
  eqCard: {
    backgroundColor: '#081023',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#12203D',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  eqCardDisabled: {
    opacity: 0.45,
  },
  dbMarkersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  dbMarkerText: {
    color: '#657492',
    fontSize: 12,
    fontWeight: '600',
  },
  slidersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandColumn: {
    alignItems: 'center',
    flex: 1,
  },
  bandDbValue: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  sliderTrackContainer: {
    height: SLIDER_HEIGHT,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrackBackground: {
    height: SLIDER_HEIGHT,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#17243F',
    position: 'relative',
    alignItems: 'center',
  },
  sliderFill: {
    position: 'absolute',
    bottom: 0,
    width: 3.5,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3.5,
    elevation: 4,
  },
  bandFreqLabel: {
    color: '#8593AD',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 12,
  },
  bassBoostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 26,
  },
  bassBoostTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  resetButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0B1426',
    borderWidth: 1,
    borderColor: '#1B2C4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#5269F5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  saveButtonText: {
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
});

export default EqualizerScreen;