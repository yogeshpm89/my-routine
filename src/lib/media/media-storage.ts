/**
 * Media Storage and Helper Utilities
 * Provides offline IndexedDB storage for downloaded audio/video files
 * and URL parsers for YouTube and direct media streams.
 */

const DB_NAME = 'my_routine_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open media database'));
  });
}

/**
 * Persists a downloaded media Blob (audio or video) to local IndexedDB.
 */
export async function saveLocalMediaBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error(`Failed to save media blob ${id}`));
  });
}

/**
 * Retrieves a downloaded media Blob from local IndexedDB.
 */
export async function getLocalMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve((request.result as Blob) || null);
      };
      request.onerror = () => reject(request.error || new Error(`Failed to get media blob ${id}`));
    });
  } catch (err) {
    console.warn('Error fetching media blob from IndexedDB:', err);
    return null;
  }
}

/**
 * Deletes a downloaded media Blob from local IndexedDB.
 */
export async function deleteLocalMediaBlob(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Failed to delete media blob ${id}`));
    });
  } catch (err) {
    console.warn('Error deleting media blob from IndexedDB:', err);
  }
}

/**
 * Extracts YouTube video ID from various YouTube URL formats.
 * Supports standard watch URLs, youtu.be, shorts, embeds, and music.youtube.com.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern matches:
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // - youtube.com/embed/ID
  // - youtube.com/shorts/ID
  // - music.youtube.com/watch?v=ID
  // - youtube.com/v/ID
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/,
    /^([\w-]{11})$/, // raw 11-char ID
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates privacy-friendly YouTube embed URL.
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Determines whether a link or file is audio, video, YouTube, or generic.
 */
export function detectMediaType(
  urlOrName: string,
  mimeType?: string
): 'youtube' | 'audio_url' | 'video_url' {
  if (extractYouTubeId(urlOrName)) {
    return 'youtube';
  }

  if (mimeType) {
    if (mimeType.startsWith('audio/')) return 'audio_url';
    if (mimeType.startsWith('video/')) return 'video_url';
  }

  const clean = urlOrName.toLowerCase().split('?')[0];

  const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.flac', '.weba'];
  if (audioExtensions.some((ext) => clean.endsWith(ext))) {
    return 'audio_url';
  }

  const videoExtensions = ['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.ogv'];
  if (videoExtensions.some((ext) => clean.endsWith(ext))) {
    return 'video_url';
  }

  // If looks like an audio service (e.g. SoundCloud, podcast)
  if (clean.includes('soundcloud.com') || clean.includes('spotify.com') || clean.includes('podcast')) {
    return 'audio_url';
  }

  // Default to video_url if generic web link
  return 'video_url';
}

/**
 * Human-readable file size formatter.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
