import {NativeModules, Platform} from 'react-native';

const {AudioEffectModule} = NativeModules;

export type AudioEffectSpecs = {
  numBands: number;
  minLevel: number; // millibels (e.g. -1500)
  maxLevel: number; // millibels (e.g. 1500)
  centerFreqs: number[]; // frequencies in Hz
};

/**
 * Initializes the hardware DSP effects on the device.
 * @param sessionId 0 binds to global output mix
 */
export const initAudioEffects = async (sessionId = 0): Promise<AudioEffectSpecs | null> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return null;
  try {
    return await AudioEffectModule.initAudioEffects(sessionId);
  } catch (error) {
    console.log('Failed to init AudioEffects:', error);
    return null;
  }
};

export const setEqualizerEnabled = async (enabled: boolean): Promise<void> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return;
  try {
    await AudioEffectModule.setEqualizerEnabled(enabled);
  } catch (error) {
    console.log('Failed to toggle Equalizer:', error);
  }
};

/**
 * Sets a specific band level.
 * @param band 0-indexed band
 * @param db decibels (-12 to +12)
 */
export const setBandDb = async (band: number, db: number): Promise<void> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return;
  try {
    // Android AudioFX uses millibels (1 dB = 100 millibels)
    const millibels = Math.round(db * 100);
    await AudioEffectModule.setBandLevel(band, millibels);
  } catch (error) {
    console.log(`Failed to set band ${band}:`, error);
  }
};

/**
 * Sets all bands simultaneously.
 * @param dbs array of dB numbers
 */
export const setAllBandsDb = async (dbs: number[]): Promise<void> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return;
  try {
    const millibels = dbs.map(db => Math.round(db * 100));
    await AudioEffectModule.setAllBands(millibels);
  } catch (error) {
    console.log('Failed to set bands:', error);
  }
};

export const setBassBoostEnabled = async (enabled: boolean): Promise<void> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return;
  try {
    await AudioEffectModule.setBassBoostEnabled(enabled);
  } catch (error) {
    console.log('Failed to toggle BassBoost:', error);
  }
};

/**
 * Sets Bass Boost strength.
 * @param strength 0 to 1000
 */
export const setBassBoostStrength = async (strength: number): Promise<void> => {
  if (Platform.OS !== 'android' || !AudioEffectModule) return;
  try {
    await AudioEffectModule.setBassBoostStrength(strength);
  } catch (error) {
    console.log('Failed to set BassBoost strength:', error);
  }
};