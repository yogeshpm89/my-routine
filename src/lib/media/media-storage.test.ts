import { describe, it, expect, vi } from 'vitest';
import {
  extractYouTubeId,
  extractYouTubePlaylistId,
  detectMediaType,
  getYouTubeEmbedUrl,
  getYouTubePlaylistEmbedUrl,
  getMusicServiceInfo,
  openExternalMusicApp,
  formatFileSize,
} from './media-storage';

describe('Media Storage & URL Helpers', () => {
  it('extracts YouTube ID from standard watch URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube ID from youtu.be short URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ?t=42';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube ID from youtube shorts URL', () => {
    const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube ID from music.youtube.com single track', () => {
    const url = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube playlist ID from URLs', () => {
    expect(
      extractYouTubePlaylistId('https://music.youtube.com/playlist?list=PL4fGSIFgk93DQ8u4a3cT2tM0m4A')
    ).toBe('PL4fGSIFgk93DQ8u4a3cT2tM0m4A');
    expect(
      extractYouTubePlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL12345678')
    ).toBe('PL12345678');
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('generates privacy-friendly youtube embed URL', () => {
    const embedUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ', true);
    expect(embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedUrl).toContain('autoplay=1');
  });

  it('generates privacy-friendly youtube playlist embed URL', () => {
    const embedUrl = getYouTubePlaylistEmbedUrl('PL4fGSIFgk93DQ8u4a3cT2tM0m4A', false);
    expect(embedUrl).toContain('https://www.youtube-nocookie.com/embed/videoseries');
    expect(embedUrl).toContain('list=PL4fGSIFgk93DQ8u4a3cT2tM0m4A');
  });

  describe('Music Streaming Services & Playlist Detection (Issue #4)', () => {
    it('detects Spotify playlist links and generates embed & scheme URLs', () => {
      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abcd123';
      const info = getMusicServiceInfo(url);
      expect(info.isMusicService).toBe(true);
      expect(info.service).toBe('spotify');
      expect(info.serviceName).toBe('Spotify');
      expect(info.isPlaylist).toBe(true);
      expect(info.embedUrl).toContain('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
      expect(info.appSchemeUrl).toBe('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
    });

    it('detects Spotify album and track links', () => {
      const albumInfo = getMusicServiceInfo('https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa');
      expect(albumInfo.isMusicService).toBe(true);
      expect(albumInfo.isPlaylist).toBe(true);
      expect(albumInfo.embedUrl).toContain('/embed/album/4m2880jivSbbyEGAKfITCa');

      const trackInfo = getMusicServiceInfo('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6');
      expect(trackInfo.isMusicService).toBe(true);
      expect(trackInfo.isPlaylist).toBe(false);
      expect(trackInfo.embedUrl).toContain('/embed/track/6rqhFgbbKwnb9MLmUQDhG6');
    });

    it('detects Spotify URI custom scheme', () => {
      const info = getMusicServiceInfo('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
      expect(info.isMusicService).toBe(true);
      expect(info.service).toBe('spotify');
      expect(info.embedUrl).toContain('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    });

    it('detects YouTube Music playlist and track links', () => {
      const playlistUrl = 'https://music.youtube.com/playlist?list=PL4fGSIFgk93DQ8u4a3cT2tM0m4A';
      const info = getMusicServiceInfo(playlistUrl);
      expect(info.isMusicService).toBe(true);
      expect(info.service).toBe('youtube_music');
      expect(info.serviceName).toBe('YouTube Music');
      expect(info.isPlaylist).toBe(true);
      expect(info.embedUrl).toContain('list=PL4fGSIFgk93DQ8u4a3cT2tM0m4A');
    });

    it('detects YouTube video playlist links', () => {
      const url = 'https://www.youtube.com/playlist?list=PL1234567890';
      const info = getMusicServiceInfo(url);
      expect(info.isMusicService).toBe(true);
      expect(info.service).toBe('youtube_playlist');
      expect(info.isPlaylist).toBe(true);
    });

    it('detects Apple Music playlist links', () => {
      const url = 'https://music.apple.com/us/playlist/todays-hits/pl.f4d1060a52114a1792200444b40dfb02';
      const info = getMusicServiceInfo(url);
      expect(info.isMusicService).toBe(true);
      expect(info.service).toBe('apple_music');
      expect(info.serviceName).toBe('Apple Music');
      expect(info.isPlaylist).toBe(true);
      expect(info.embedUrl).toContain('https://embed.music.apple.com');
    });

    it('detects Amazon Music, SoundCloud, JioSaavn, and other providers', () => {
      expect(getMusicServiceInfo('https://music.amazon.com/playlists/B07XYZ').service).toBe('amazon_music');
      expect(getMusicServiceInfo('https://soundcloud.com/artist/sets/workout-beats').service).toBe('soundcloud');
      expect(getMusicServiceInfo('https://www.jiosaavn.com/featured/weekly-top-songs/').service).toBe('jiosaavn');
      expect(getMusicServiceInfo('https://gaana.com/playlist/top-hits').service).toBe('gaana');
      expect(getMusicServiceInfo('https://wynk.in/music/playlist/party-time').service).toBe('wynk');
      expect(getMusicServiceInfo('https://tidal.com/playlist/123').service).toBe('tidal');
      expect(getMusicServiceInfo('https://deezer.com/playlist/456').service).toBe('deezer');
    });

    it('returns isMusicService: false for direct audio/video files and regular sites', () => {
      expect(getMusicServiceInfo('https://example.com/audio/song.mp3').isMusicService).toBe(false);
      expect(getMusicServiceInfo('https://example.com/video/workout.mp4').isMusicService).toBe(false);
      expect(getMusicServiceInfo('').isMusicService).toBe(false);
    });
  });

  describe('detectMediaType', () => {
    it('detects music_service for streaming and playlist URLs', () => {
      expect(detectMediaType('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe('music_service');
      expect(detectMediaType('https://music.youtube.com/playlist?list=PL123')).toBe('music_service');
      expect(detectMediaType('https://www.youtube.com/playlist?list=PL123')).toBe('music_service');
      expect(detectMediaType('https://music.apple.com/us/playlist/today/pl.123')).toBe('music_service');
      expect(detectMediaType('https://soundcloud.com/artist/track')).toBe('music_service');
    });

    it('detects youtube, audio_url, and video_url correctly', () => {
      expect(detectMediaType('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
      expect(detectMediaType('https://example.com/audio/track.mp3')).toBe('audio_url');
      expect(detectMediaType('my-meditation.m4a')).toBe('audio_url');
      expect(detectMediaType('workout-routine.mp4')).toBe('video_url');
      expect(detectMediaType('https://example.com/stream.webm')).toBe('video_url');
    });
  });

  describe('openExternalMusicApp', () => {
    it('returns false when url is empty or invalid', () => {
      expect(openExternalMusicApp('')).toBe(false);
      expect(openExternalMusicApp(undefined)).toBe(false);
    });

    it('calls window.open without throwing errors', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      openExternalMusicApp('https://open.spotify.com/playlist/123');
      expect(openSpy).toHaveBeenCalledWith(
        'https://open.spotify.com/playlist/123',
        '_blank',
        'noopener,noreferrer'
      );
      openSpy.mockRestore();
    });
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(10485760)).toBe('10.0 MB');
  });
});
