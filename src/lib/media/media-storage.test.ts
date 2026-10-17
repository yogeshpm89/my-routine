import { describe, it, expect } from 'vitest';
import {
  extractYouTubeId,
  detectMediaType,
  getYouTubeEmbedUrl,
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

  it('extracts YouTube ID from music.youtube.com', () => {
    const url = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube ID from embed URL', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('generates privacy-friendly youtube embed URL', () => {
    const embedUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ', true);
    expect(embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedUrl).toContain('autoplay=1');
  });

  it('detects media types correctly', () => {
    expect(detectMediaType('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectMediaType('https://example.com/audio/track.mp3')).toBe('audio_url');
    expect(detectMediaType('my-meditation.m4a')).toBe('audio_url');
    expect(detectMediaType('workout-routine.mp4')).toBe('video_url');
    expect(detectMediaType('https://example.com/stream.webm')).toBe('video_url');
    expect(detectMediaType('https://soundcloud.com/artist/track')).toBe('audio_url');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(10485760)).toBe('10.0 MB');
  });
});
