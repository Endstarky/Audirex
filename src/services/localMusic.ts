import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

export type LocalSong = {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  duration: number;
  artwork?: string;
  path: string;
  uri: string;
  albumId?: string;
  dateAdded?: number;
};

type LocalMusicModule = {
  getSongs(query?: string, allowedFolders?: string[]): Promise<LocalSong[]>;
  scanStorage(): Promise<number>;
  pickFolder(): Promise<string | null>; // <-- Added
};

const {LocalMusic} = NativeModules as {LocalMusic?: LocalMusicModule};

export const requestMusicPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const result = await PermissionsAndroid.request(permission);

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const scanStorage = async (): Promise<number> => {
  if (Platform.OS !== 'android' || !LocalMusic?.scanStorage) {
    return 0;
  }

  try {
    return await LocalMusic.scanStorage();
  } catch (error) {
    console.log('Error triggering storage scan:', error);
    return 0;
  }
};

/**
 * Opens Android's native system folder selection window.
 * Returns the relative folder path or null if user cancelled.
 */
export const pickFolder = async (): Promise<string | null> => {
  if (Platform.OS !== 'android' || !LocalMusic?.pickFolder) {
    return null;
  }

  try {
    return await LocalMusic.pickFolder();
  } catch (error) {
    console.log('Error opening folder picker:', error);
    return null;
  }
};

export const getLocalSongs = async (
  query = '',
  folders: string[] = ['Music', 'Download'],
): Promise<LocalSong[]> => {
  if (Platform.OS !== 'android' || !LocalMusic) {
    return [];
  }

  try {
    await scanStorage();
  } catch {}

  const mergedFolders = Array.from(new Set(['Music', 'Download', ...folders]));
  return LocalMusic.getSongs(query, mergedFolders);
};