'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ActivityOccurrence, MediaAttachment } from '@/types/routine';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getLocalMediaBlob,
  formatFileSize,
  getMusicServiceInfo,
  openExternalMusicApp,
} from '@/lib/media/media-storage';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  ExternalLink,
  Music,
  Video,
  FileAudio,
  FileVideo,
  Layers,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react';
import { YouTubeIcon as Youtube } from './youtube-icon';
import { MusicServiceIcon } from './music-service-icons';
import { CategoryBadge } from '../routine/activity-badge';

interface MediaPlayerModalProps {
  isOpen: boolean;
  occurrence: ActivityOccurrence | null;
  initialMediaIndex?: number;
  onClose: () => void;
}

export function MediaPlayerModal({
  isOpen,
  occurrence,
  initialMediaIndex = 0,
  onClose,
}: MediaPlayerModalProps) {
  const mediaList = occurrence?.media || [];
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Sync index when initialMediaIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const idx = Math.min(Math.max(0, initialMediaIndex), Math.max(0, mediaList.length - 1));
      setCurrentIndex(idx);
    }
  }, [isOpen, initialMediaIndex, mediaList.length]);

  const currentAttachment: MediaAttachment | undefined = mediaList[currentIndex];

  const handleCopyLink = () => {
    if (!currentAttachment?.url) return;
    try {
      navigator.clipboard?.writeText(currentAttachment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  // Resolve local IndexedDB media blob to Object URL
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (currentAttachment && currentAttachment.type === 'local_file') {
      const key = currentAttachment.localKey || currentAttachment.id;
      setIsLoadingLocal(true);
      setLoadError(null);

      getLocalMediaBlob(key)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            createdUrl = URL.createObjectURL(blob);
            setLocalBlobUrl(createdUrl);
          } else {
            setLoadError('Media file was not found in offline storage.');
            setLocalBlobUrl(null);
          }
        })
        .catch((err) => {
          if (!active) return;
          console.error('Failed to load local media blob:', err);
          setLoadError('Failed to load offline file.');
          setLocalBlobUrl(null);
        })
        .finally(() => {
          if (active) setIsLoadingLocal(false);
        });
    } else {
      setLocalBlobUrl(null);
      setIsLoadingLocal(false);
      setLoadError(null);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [currentAttachment]);

  // Reset audio state when track switches
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [currentIndex, currentAttachment?.id]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [isLooping, localBlobUrl, currentAttachment?.url]);

  if (!isOpen || !occurrence || mediaList.length === 0 || !currentAttachment) {
    return null;
  }

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.warn('Audio play prevented:', err));
    }
  };

  const handleSeek = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipTime = (deltaSeconds: number) => {
    if (!audioRef.current) return;
    const target = Math.min(Math.max(0, audioRef.current.currentTime + deltaSeconds), duration || 1000);
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  // Determine media category
  const musicInfo = getMusicServiceInfo(currentAttachment.url || '');
  const isMusicService = currentAttachment.type === 'music_service' || musicInfo.isMusicService;
  const isYouTube = !isMusicService && (currentAttachment.type === 'youtube' || Boolean(extractYouTubeId(currentAttachment.url || '')));
  const isLocal = currentAttachment.type === 'local_file';
  const isAudio =
    !isMusicService &&
    (currentAttachment.type === 'audio_url' ||
      (isLocal && currentAttachment.mimeType?.startsWith('audio/')) ||
      (isLocal && !currentAttachment.mimeType?.startsWith('video/') && currentAttachment.fileName?.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)));
  const isVideo =
    !isMusicService &&
    (currentAttachment.type === 'video_url' ||
      (isLocal && currentAttachment.mimeType?.startsWith('video/')) ||
      (isLocal && currentAttachment.fileName?.match(/\.(mp4|webm|mov|mkv)$/i)));

  const ytVideoId = isYouTube ? extractYouTubeId(currentAttachment.url || '') : null;
  const audioSrc = isLocal ? localBlobUrl : currentAttachment.url;
  const videoSrc = isLocal ? localBlobUrl : currentAttachment.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              {isMusicService ? (
                <MusicServiceIcon service={musicInfo.service} className="w-5 h-5" />
              ) : isYouTube ? (
                <Youtube className="w-5 h-5 text-rose-500" />
              ) : isAudio ? (
                <Music className="w-5 h-5 text-emerald-400" />
              ) : (
                <Video className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {currentAttachment.title || currentAttachment.fileName || occurrence.title}
                </h3>
                <CategoryBadge category={occurrence.category} size="sm" />
              </div>
              <p className="text-xs text-slate-400 truncate">
                Activity: <span className="text-slate-200 font-medium">{occurrence.title}</span>
                {isMusicService && ` • ${musicInfo.serviceName} ${musicInfo.isPlaylist ? 'Playlist' : 'Music'}`}
                {currentAttachment.fileSize ? ` • ${formatFileSize(currentAttachment.fileSize)}` : ''}
                {isLocal && ' • Offline Downloaded File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentAttachment.url && (
              <button
                type="button"
                onClick={() => openExternalMusicApp(currentAttachment.url)}
                title={isMusicService ? `Open in ${musicInfo.serviceName} App` : 'Open source link in external browser'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Playlist Switcher (if multiple items attached) */}
        {mediaList.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-slate-950/60 border-b border-white/5 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" /> Media ({mediaList.length}):
            </span>
            {mediaList.map((item, idx) => {
              const itemMusicInfo = getMusicServiceInfo(item.url || '');
              const itemIsMusicService = item.type === 'music_service' || itemMusicInfo.isMusicService;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    idx === currentIndex
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {itemIsMusicService ? (
                    <MusicServiceIcon service={itemMusicInfo.service} className="w-3 h-3" />
                  ) : item.type === 'youtube' ? (
                    <Youtube className="w-3 h-3 text-rose-400" />
                  ) : item.type === 'audio_url' || item.fileName?.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <Music className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Video className="w-3 h-3 text-blue-400" />
                  )}
                  <span className="truncate max-w-[120px]">{item.title || item.fileName || `Track ${idx + 1}`}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Player Viewport */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex flex-col justify-center bg-slate-950/30">
          {isLoadingLocal ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading offline media file from device storage...</p>
            </div>
          ) : loadError ? (
            <div className="py-12 text-center space-y-2 bg-rose-950/20 border border-rose-500/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-rose-400">{loadError}</p>
              <p className="text-xs text-slate-400">The file might have been moved or removed.</p>
            </div>
          ) : isMusicService ? (
            /* Dedicated Music App Streamer / Playlist Hub */
            <div className="w-full max-w-xl mx-auto space-y-4 py-2">
              {musicInfo.embedUrl ? (
                <div className="space-y-3">
                  {/* Interactive Music Embed (Spotify / YouTube Music / Apple Music Embed) */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-white/10">
                    <iframe
                      src={musicInfo.embedUrl}
                      title={currentAttachment.title || `${musicInfo.serviceName} Player`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="w-full border-0 min-h-[352px] sm:min-h-[380px]"
                    />
                  </div>

                  {/* Quick Launch Banner under embed */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-white/5 shrink-0">
                        <MusicServiceIcon service={musicInfo.service} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold text-white truncate">
                          Listen in {musicInfo.serviceName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Switch to native app for background playback
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Copy playlist link"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openExternalMusicApp(currentAttachment.url)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{
                          backgroundColor: musicInfo.color || '#1DB954',
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in App</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Branded App Launcher Card (for services without iframe embeds) */
                <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-white/10 text-center space-y-5 shadow-2xl overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none blur-3xl rounded-full"
                    style={{ backgroundColor: musicInfo.color || '#1DB954' }}
                  />

                  <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-950 border border-white/15 flex items-center justify-center shadow-xl">
                    <MusicServiceIcon service={musicInfo.service} className="w-12 h-12 sm:w-14 sm:h-14" />
                  </div>

                  <div className="relative space-y-1.5">
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        color: musicInfo.color,
                        backgroundColor: `${musicInfo.color}15`,
                        border: `1px solid ${musicInfo.color}35`,
                      }}
                    >
                      <MusicServiceIcon service={musicInfo.service} className="w-3.5 h-3.5" />
                      <span>{musicInfo.serviceName} {musicInfo.isPlaylist ? 'Playlist' : 'Music'}</span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {currentAttachment.title || `${musicInfo.serviceName} Playlist`}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      This playlist opens directly in your <strong>{musicInfo.serviceName}</strong> app on your device for uninterrupted background playback while doing your routine.
                    </p>
                  </div>

                  <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => openExternalMusicApp(currentAttachment.url)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        backgroundColor: musicInfo.color || '#1DB954',
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in {musicInfo.serviceName} App</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Link Copied!' : 'Copy Playlist Link'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isYouTube && ytVideoId ? (
            /* YouTube Video Embed */
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
              <iframe
                src={getYouTubeEmbedUrl(ytVideoId, true)}
                title={currentAttachment.title || 'YouTube Video Player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          ) : isVideo && videoSrc ? (
            /* Direct Video or Downloaded Video Player */
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center">
              <video
                src={videoSrc}
                controls
                autoPlay
                playsInline
                className="w-full h-full rounded-xl object-contain"
              >
                Your device does not support HTML5 video playback.
              </video>
            </div>
          ) : isAudio && audioSrc ? (
            /* Audio & Music Player */
            <div className="w-full max-w-xl mx-auto space-y-6 py-4">
              <audio
                ref={audioRef}
                src={audioSrc}
                loop={isLooping}
                preload="metadata"
              />

              {/* Album Art / Soundwave Animation Visualizer */}
              <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-slate-800 via-indigo-950 to-slate-900 border border-white/10 flex flex-col items-center justify-center shadow-2xl overflow-hidden group">
                <div
                  className={`absolute inset-0 bg-blue-500/10 rounded-3xl transition-opacity duration-700 ${
                    isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0'
                  }`}
                />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Music className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  {/* Equalizer bars */}
                  <div className="flex items-center gap-1 h-6">
                    {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.8].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full bg-emerald-400 transition-all duration-300 ${
                          isPlaying ? 'animate-bounce' : 'opacity-40'
                        }`}
                        style={{
                          height: isPlaying ? `${h * 20}px` : '4px',
                          animationDelay: `${i * 120}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Title and Metadata */}
              <div className="text-center space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {currentAttachment.title || currentAttachment.fileName || 'Audio Track'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isLocal ? 'Offline Audio File' : 'Online Audio Stream'}
                  {currentAttachment.fileSize ? ` • ${formatFileSize(currentAttachment.fileSize)}` : ''}
                </p>
              </div>

              {/* Time Scrubber */}
              <div className="space-y-1.5 px-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  title={isLooping ? 'Disable Loop' : 'Enable Loop'}
                  className={`p-2 rounded-xl transition ${
                    isLooping
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skipTime(-10)}
                  title="Rewind 10 seconds"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[10px]">10s</span>
                </button>

                <button
                  onClick={togglePlayAudio}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-slate-950" />
                  ) : (
                    <Play className="w-6 h-6 fill-slate-950 translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={() => skipTime(10)}
                  title="Forward 10 seconds"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="text-[10px]">10s</span>
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className="p-2 rounded-xl text-slate-400 hover:text-white transition"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hidden sm:block"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 bg-slate-800/40 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-200">Unsupported media stream</p>
              <p className="text-xs text-slate-400">
                You can still access this media by opening the link directly:
              </p>
              {currentAttachment.url && (
                <a
                  href={currentAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Link
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-white/10 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>MyRoutine In-App Media Player</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
