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
 * Extracts YouTube playlist ID from URLs containing ?list= or &list=
 */
export function extractYouTubePlaylistId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[?&]list=([\w-]+)/i);
  return match ? match[1] : null;
}

/**
 * Generates privacy-friendly YouTube embed URL for a single video.
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
 * Generates privacy-friendly YouTube embed URL for a playlist.
 */
export function getYouTubePlaylistEmbedUrl(playlistId: string, autoplay = false): string {
  const params = new URLSearchParams({
    listType: 'playlist',
    list: playlistId,
    autoplay: autoplay ? '1' : '0',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
}

export type MusicServiceType =
  | 'spotify'
  | 'youtube_music'
  | 'youtube_playlist'
  | 'apple_music'
  | 'amazon_music'
  | 'soundcloud'
  | 'jiosaavn'
  | 'gaana'
  | 'wynk'
  | 'tidal'
  | 'deezer'
  | 'generic_music';

export interface MusicServiceInfo {
  isMusicService: boolean;
  service: MusicServiceType;
  serviceName: string;
  appSchemeUrl?: string;
  webUrl: string;
  isPlaylist: boolean;
  embedUrl?: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Inspects a URL or MediaAttachment to detect if it links to an external music streaming service
 * or music playlist (e.g. Spotify, YouTube Music, Apple Music, SoundCloud, etc.).
 */
export function getMusicServiceInfo(
  urlOrItem: string | { url?: string } | undefined | null
): MusicServiceInfo {
  const rawUrl = typeof urlOrItem === 'string' ? urlOrItem : urlOrItem?.url;
  const url = (rawUrl || '').trim();

  const fallback: MusicServiceInfo = {
    isMusicService: false,
    service: 'generic_music',
    serviceName: 'Media',
    webUrl: url,
    isPlaylist: false,
    color: '#3B82F6',
    badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    badgeText: 'text-blue-400',
  };

  if (!url) return fallback;

  const lower = url.toLowerCase();

  // 1. Spotify
  if (lower.includes('spotify.com') || lower.startsWith('spotify:')) {
    let isPlaylist = true;
    let embedUrl: string | undefined;
    let appSchemeUrl: string | undefined;
    let webUrl = url;

    if (lower.startsWith('spotify:')) {
      const parts = url.split(':');
      if (parts.length >= 3) {
        const type = parts[1];
        const id = parts[2];
        isPlaylist = type === 'playlist' || type === 'album';
        webUrl = `https://open.spotify.com/${type}/${id}`;
        embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
        appSchemeUrl = url;
      }
    } else {
      const match = url.match(/spotify\.com\/(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]+)/i);
      if (match) {
        const type = match[1].toLowerCase();
        const id = match[2];
        isPlaylist = type === 'playlist' || type === 'album';
        embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
        appSchemeUrl = `spotify:${type}:${id}`;
      }
    }

    return {
      isMusicService: true,
      service: 'spotify',
      serviceName: 'Spotify',
      appSchemeUrl,
      webUrl,
      isPlaylist,
      embedUrl,
      color: '#1DB954',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeText: 'text-emerald-400',
    };
  }

  // 2. YouTube Music
  if (lower.includes('music.youtube.com')) {
    const playlistId = extractYouTubePlaylistId(url);
    const videoId = extractYouTubeId(url);
    const isPlaylist = Boolean(playlistId || (!videoId && lower.includes('playlist')));
    const embedUrl = playlistId
      ? getYouTubePlaylistEmbedUrl(playlistId)
      : videoId
      ? getYouTubeEmbedUrl(videoId, false)
      : undefined;

    return {
      isMusicService: true,
      service: 'youtube_music',
      serviceName: 'YouTube Music',
      webUrl: url,
      isPlaylist,
      embedUrl,
      color: '#FF0000',
      badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      badgeText: 'text-rose-400',
    };
  }

  // 3. YouTube Playlists (on standard youtube.com)
  const ytPlaylistId = extractYouTubePlaylistId(url);
  if (ytPlaylistId && (lower.includes('youtube.com') || lower.includes('youtu.be'))) {
    return {
      isMusicService: true,
      service: 'youtube_playlist',
      serviceName: 'YouTube Playlist',
      webUrl: url,
      isPlaylist: true,
      embedUrl: getYouTubePlaylistEmbedUrl(ytPlaylistId),
      color: '#FF0000',
      badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      badgeText: 'text-rose-400',
    };
  }

  // 4. Apple Music
  if (lower.includes('music.apple.com')) {
    const isPlaylist = lower.includes('/playlist/') || lower.includes('/album/');
    const embedUrl = url.replace('https://music.apple.com', 'https://embed.music.apple.com');
    const appSchemeUrl = url.replace(/^https?:\/\//i, 'music://');

    return {
      isMusicService: true,
      service: 'apple_music',
      serviceName: 'Apple Music',
      appSchemeUrl,
      webUrl: url,
      isPlaylist,
      embedUrl,
      color: '#FA243C',
      badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      badgeText: 'text-rose-300',
    };
  }

  // 5. Amazon Music
  if (lower.includes('music.amazon.')) {
    return {
      isMusicService: true,
      service: 'amazon_music',
      serviceName: 'Amazon Music',
      webUrl: url,
      isPlaylist: lower.includes('/playlists/') || lower.includes('/albums/'),
      color: '#25D1DA',
      badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
      badgeText: 'text-cyan-400',
    };
  }

  // 6. SoundCloud
  if (lower.includes('soundcloud.com')) {
    return {
      isMusicService: true,
      service: 'soundcloud',
      serviceName: 'SoundCloud',
      webUrl: url,
      isPlaylist: lower.includes('/sets/'),
      color: '#FF5500',
      badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      badgeText: 'text-amber-400',
    };
  }

  // 7. JioSaavn
  if (lower.includes('jiosaavn.com')) {
    return {
      isMusicService: true,
      service: 'jiosaavn',
      serviceName: 'JioSaavn',
      webUrl: url,
      isPlaylist: lower.includes('/featured/') || lower.includes('/playlist/') || lower.includes('/album/'),
      color: '#2BC5B4',
      badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
      badgeText: 'text-teal-400',
    };
  }

  // 8. Gaana
  if (lower.includes('gaana.com')) {
    return {
      isMusicService: true,
      service: 'gaana',
      serviceName: 'Gaana',
      webUrl: url,
      isPlaylist: lower.includes('/playlist/') || lower.includes('/album/'),
      color: '#E72C30',
      badgeBg: 'bg-red-500/15 border-red-500/30 text-red-400',
      badgeText: 'text-red-400',
    };
  }

  // 9. Wynk Music
  if (lower.includes('wynk.in')) {
    return {
      isMusicService: true,
      service: 'wynk',
      serviceName: 'Wynk Music',
      webUrl: url,
      isPlaylist: true,
      color: '#E11D48',
      badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-400',
      badgeText: 'text-pink-400',
    };
  }

  // 10. Tidal
  if (lower.includes('tidal.com')) {
    return {
      isMusicService: true,
      service: 'tidal',
      serviceName: 'Tidal',
      webUrl: url,
      isPlaylist: lower.includes('/playlist/') || lower.includes('/album/'),
      color: '#00FFFF',
      badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
      badgeText: 'text-sky-400',
    };
  }

  // 11. Deezer
  if (lower.includes('deezer.com') || lower.includes('deezer.page.link')) {
    return {
      isMusicService: true,
      service: 'deezer',
      serviceName: 'Deezer',
      webUrl: url,
      isPlaylist: lower.includes('/playlist/') || lower.includes('/album/'),
      color: '#A238FF',
      badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      badgeText: 'text-purple-400',
    };
  }

  // 12. Generic music playlists / audio streams
  if (
    lower.includes('.m3u') ||
    lower.includes('.pls') ||
    (lower.includes('playlist') && (lower.includes('music') || lower.includes('audio') || lower.includes('radio')))
  ) {
    return {
      isMusicService: true,
      service: 'generic_music',
      serviceName: 'Music Playlist',
      webUrl: url,
      isPlaylist: true,
      color: '#10B981',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeText: 'text-emerald-400',
    };
  }

  return fallback;
}

/**
 * Safely launches the corresponding native app or external service for a music link.
 * On Capacitor native Android/iOS, uses _system to invoke native OS app intents.
 * On Web/PWA browsers, opens the URL so mobile OS App Links / Universal Links launch the installed app.
 */
export function openExternalMusicApp(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    // 1. If in Capacitor native platform
    if (typeof window !== 'undefined') {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) {
        window.open(trimmed, '_system');
        return true;
      }
    }
  } catch (err) {
    console.warn('Capacitor native app launch failed, falling back to window.open:', err);
  }

  // 2. Browser / PWA environment
  if (typeof window !== 'undefined') {
    const opened = window.open(trimmed, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  }

  return false;
}

/**
 * Determines whether a link or file is a music service, audio, video, YouTube, or generic.
 */
export function detectMediaType(
  urlOrName: string,
  mimeType?: string
): 'youtube' | 'audio_url' | 'video_url' | 'music_service' {
  if (!urlOrName || typeof urlOrName !== 'string') return 'video_url';

  // 1. Check music services first (Spotify, YouTube Music, Apple Music, playlists, etc.)
  const musicInfo = getMusicServiceInfo(urlOrName);
  if (musicInfo.isMusicService) {
    return 'music_service';
  }

  // 2. Check standard single YouTube video ID
  if (extractYouTubeId(urlOrName)) {
    return 'youtube';
  }

  // 3. Check mimeType
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

  // If looks like an audio service / podcast
  if (clean.includes('podcast')) {
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
