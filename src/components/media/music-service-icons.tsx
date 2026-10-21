import React from 'react';
import { MusicServiceType } from '@/lib/media/media-storage';
import { Music, Disc3, Radio } from 'lucide-react';

export function SpotifyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.303a.75.75 0 0 1-1.03.248c-2.82-1.722-6.37-2.112-10.55-1.157a.75.75 0 1 1-.336-1.462c4.58-1.045 8.52-.596 11.668 1.341.344.21.456.66.248 1.03zm1.467-3.26a.937.937 0 0 1-1.29.309c-3.228-1.984-8.15-2.56-11.97-1.4a.938.938 0 0 1-.55-1.792c4.368-1.326 9.792-.685 13.5 1.593.415.255.547.798.31 1.29zm.126-3.413c-3.87-2.298-10.26-2.51-13.974-1.382a1.125 1.125 0 1 1-.652-2.154c4.27-1.296 11.313-1.047 15.776 1.603a1.125 1.125 0 0 1-1.15 1.933z" />
    </svg>
  );
}

export function YouTubeMusicIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#FF0000" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
      <polygon points="10,8.5 16,12 10,15.5" fill="#FFFFFF" />
    </svg>
  );
}

export function AppleMusicIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.64-.78 1.08-1.86.96-2.95-.93.04-2.06.62-2.73 1.4-.59.68-1.11 1.77-.97 2.83 1.04.08 2.1-.5 2.74-1.28z" />
    </svg>
  );
}

export function SoundCloudIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.167 15.667a.5.5 0 0 1-.5-.5v-3.334a.5.5 0 0 1 1 0v3.334a.5.5 0 0 1-.5.5zm2.333 1.666a.5.5 0 0 1-.5-.5V9.167a.5.5 0 0 1 1 0v7.666a.5.5 0 0 1-.5.5zm2.333.667a.5.5 0 0 1-.5-.5V8.167a.5.5 0 0 1 1 0V17.5a.5.5 0 0 1-.5.5zm2.334.333a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 1 0v10.667a.5.5 0 0 1-.5.5zm4.833-1.666h6.5a3.5 3.5 0 0 0 .5-6.964 5.5 5.5 0 0 0-10.457-1.37A4.476 4.476 0 0 0 13 8.333v8.334h-.5a.5.5 0 0 1 0-1h.5V8.333a3.486 3.486 0 0 1 1.542-2.884 4.5 4.5 0 0 1 8.558 1.167.5.5 0 0 0 .445.492A2.5 2.5 0 0 1 23.5 9.5a2.5 2.5 0 0 1-2.5 2.5h-8a.5.5 0 0 1 0-1h8a1.5 1.5 0 0 0 0-3h-.25a.5.5 0 0 1-.5-.5 3.5 3.5 0 0 0-6.9-1.026.5.5 0 0 1-.416.398A2.5 2.5 0 0 0 11 10.333v6.334a.5.5 0 0 1-.5.5z" />
    </svg>
  );
}

export function AmazonMusicIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 13.5c-2.3 1.5-5.3 1.5-7.5.1-.3-.2-.1-.6.2-.5 1.9 1 4.7 1 6.8-.2.3-.2.7.3.5.6zm1-2.3c-2.8 1.8-6.5 1.8-9.2.1-.3-.2-.1-.7.3-.6 2.4 1.3 5.8 1.3 8.3-.1.4-.2.9.3.6.6zm-1.8-4.2v3.1c0 1.2-.8 2.1-2 2.1-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1c.4 0 .7.1 1 .3V7.5l4-1.2v2.7h-3z" />
    </svg>
  );
}

interface MusicServiceIconProps {
  service?: MusicServiceType;
  className?: string;
}

export function MusicServiceIcon({ service, className = 'w-4 h-4' }: MusicServiceIconProps) {
  switch (service) {
    case 'spotify':
      return <SpotifyIcon className={`${className} text-emerald-400`} />;
    case 'youtube_music':
      return <YouTubeMusicIcon className={className} />;
    case 'youtube_playlist':
      return <YouTubeMusicIcon className={className} />;
    case 'apple_music':
      return <AppleMusicIcon className={`${className} text-rose-400`} />;
    case 'amazon_music':
      return <AmazonMusicIcon className={`${className} text-cyan-400`} />;
    case 'soundcloud':
      return <SoundCloudIcon className={`${className} text-amber-500`} />;
    case 'jiosaavn':
    case 'gaana':
    case 'wynk':
    case 'tidal':
    case 'deezer':
      return <Disc3 className={`${className} text-indigo-400 animate-spin-slow`} />;
    default:
      return <Music className={`${className} text-emerald-400`} />;
  }
}
