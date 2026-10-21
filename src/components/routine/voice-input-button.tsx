'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
}

export function VoiceInputButton({
  onTranscript,
  className,
  size = 'md',
  title = 'Voice input (Click to speak)',
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]?.transcript) {
            onTranscript(item[0].transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event?.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? 'Listening... Tap to finish' : title}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 select-none active:scale-95',
        size === 'sm' ? 'p-1.5 min-w-[32px] min-h-[32px]' : 'p-2 min-w-[38px] min-h-[38px]',
        isListening
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-md shadow-rose-900/40 ring-2 ring-rose-500/30'
          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white border border-white/10',
        className
      )}
    >
      {isListening ? (
        <>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <Mic className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'animate-pulse text-rose-400')} />
        </>
      ) : (
        <Mic className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
    </button>
  );
}
