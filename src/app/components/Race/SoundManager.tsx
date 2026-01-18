'use client';

import { useRef, useEffect, useMemo } from 'react';

export interface SoundManagerRef {
  playCountdown: (num: number) => void;
  playGo: () => void;
  playEngine: () => void;
  stopEngine: () => void;
  playVictory: () => void;
  playEvent: (type: 'surge' | 'overtake' | 'finalLap') => void;
}

export function useSoundManager(): SoundManagerRef {
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingMusicRef = useRef(false);

  useEffect(() => {
    return () => {
      isPlayingMusicRef.current = false;
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const manager = useMemo<SoundManagerRef>(() => {
    const getAudioContext = () => {
      if (typeof window === 'undefined') return null;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current;
    };

    const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.log('Audio not available');
      }
    };

    return {
      playCountdown: (num: number) => {
        if (num >= 1 && num <= 3) {
          playTone(440, 0.15, 'square', 0.2);
        }
      },

      playGo: () => {
        playTone(880, 0.1, 'square', 0.25);
        setTimeout(() => playTone(1100, 0.15, 'square', 0.25), 100);
        setTimeout(() => playTone(1320, 0.3, 'square', 0.3), 200);
      },

      playEngine: () => {
        if (isPlayingMusicRef.current) return;
        
        try {
          if (typeof window === 'undefined') return;
          
          const audio = new Audio('/race/racing-music.mp3');
          audio.loop = true;
          audio.volume = 0.15;
          
          audio.play().catch(e => {
            console.log('Music playback failed:', e);
          });
          
          musicAudioRef.current = audio;
          isPlayingMusicRef.current = true;
        } catch (e) {
          console.log('Music not available');
        }
      },

      stopEngine: () => {
        isPlayingMusicRef.current = false;
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
          musicAudioRef.current.currentTime = 0;
          musicAudioRef.current = null;
        }
      },

      playVictory: () => {
        isPlayingMusicRef.current = false;
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
          musicAudioRef.current.currentTime = 0;
          musicAudioRef.current = null;
        }
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 0.3, 'square', 0.2), i * 150);
        });
        setTimeout(() => {
          playTone(1047, 0.6, 'square', 0.25);
        }, 700);
      },

      playEvent: (type: 'surge' | 'overtake' | 'finalLap') => {
        switch (type) {
          case 'surge':
            playTone(600, 0.1, 'sawtooth', 0.15);
            setTimeout(() => playTone(800, 0.15, 'sawtooth', 0.15), 80);
            break;
          case 'overtake':
            playTone(500, 0.08, 'square', 0.12);
            playTone(700, 0.12, 'square', 0.12);
            break;
          case 'finalLap':
            playTone(880, 0.15, 'square', 0.2);
            setTimeout(() => playTone(880, 0.15, 'square', 0.2), 200);
            setTimeout(() => playTone(1100, 0.25, 'square', 0.25), 400);
            break;
        }
      },
    };
  }, []);

  return manager;
}
