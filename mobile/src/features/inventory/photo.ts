import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { uid } from '@/store';

const MAX_WEB_EDGE = 640;

/** Web picks are blob URLs that die on reload; store a small JPEG data URI instead. */
function downscaleWeb(uri: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_WEB_EDGE / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(uri);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          resolve(uri);
        }
      };
      img.onerror = () => resolve(uri);
      img.src = uri;
    } catch {
      resolve(uri);
    }
  });
}

/** Picker results live in a cache folder the OS may clear; keep a copy in documents. */
async function persistNative(uri: string): Promise<string> {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const src = new File(uri);
    const dest = new File(dir, `${uid()}.${src.extension.replace('.', '') || 'jpg'}`);
    await src.copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export type PhotoResult = { uri: string } | { error: string } | null;

/** Lets the person choose a photo. Returns null when cancelled. */
export async function pickPhoto(): Promise<PhotoResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return null;
    const uri = result.assets[0].uri;
    return { uri: Platform.OS === 'web' ? await downscaleWeb(uri) : await persistNative(uri) };
  } catch {
    return { error: 'The photo could not be opened. Try another image.' };
  }
}
