'use client';

import { useEffect, useState, useRef } from 'react';

interface WinnerCelebrationProps {
  winner: number;
  onClose: () => void;
}

const CHARACTER_NAMES = ['Pepe', 'Alon', 'Cupsey', 'Wojack'];
const CHARACTER_VIDEOS = [
  '/race/pepe-win.mp4',
  '/race/alon-win.mp4',
  '/race/cupsey-win.mp4',
  '/race/wojack-win.mp4',
];
const CHARACTER_COLORS = ['#4ade80', '#f59e0b', '#34d399', '#e5e5e5'];

export default function WinnerCelebration({ winner, onClose }: WinnerCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [videoFade, setVideoFade] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
    
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const duration = video.duration;
      const currentTime = video.currentTime;
      const fadeStart = duration - 0.8;
      
      if (currentTime >= fadeStart) {
        const fadeProgress = (currentTime - fadeStart) / 0.8;
        setVideoFade(1 - fadeProgress * 0.7);
      } else if (currentTime < 0.5) {
        setVideoFade(currentTime / 0.5 * 0.3 + 0.7);
      } else {
        setVideoFade(1);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const winnerIndex = winner - 1;
  const characterName = CHARACTER_NAMES[winnerIndex] || 'Unknown';
  const videoSrc = CHARACTER_VIDEOS[winnerIndex] || '';
  const accentColor = CHARACTER_COLORS[winnerIndex] || '#d4a517';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={handleClose}
    >
      <div 
        className={`relative transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
        }}
      >
        <div 
          className="absolute -inset-1 rounded-2xl opacity-75 blur-md animate-pulse"
          style={{ 
            background: `linear-gradient(135deg, #d4a517, ${accentColor}, #d4a517)`,
          }}
        />
        
        <div 
          className="absolute -inset-0.5 rounded-2xl"
          style={{ 
            background: `linear-gradient(135deg, #d4a517, ${accentColor})`,
          }}
        />
        
        <div className="relative bg-[#0d3320] rounded-xl overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 py-2 md:py-3 px-4 md:px-6 text-center z-10"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            }}
          >
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="text-lg md:text-2xl">🏆</span>
              <h2 
                className="text-xl md:text-3xl font-bold uppercase tracking-wider"
                style={{ 
                  color: '#d4a517',
                  textShadow: '0 0 20px rgba(212, 165, 23, 0.8), 0 0 40px rgba(212, 165, 23, 0.4)',
                }}
              >
                {characterName} Wins!
              </h2>
              <span className="text-lg md:text-2xl">🏆</span>
            </div>
          </div>
          
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto transition-opacity duration-200"
            style={{
              maxHeight: '60vh',
              objectFit: 'contain',
              opacity: videoFade,
            }}
          />
          
          <div 
            className="absolute bottom-0 left-0 right-0 py-3 md:py-4 px-4 md:px-6 text-center"
            style={{
              background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
            }}
          >
            <button
              onClick={handleClose}
              className="px-6 md:px-8 py-2 rounded-lg font-bold text-white text-sm md:text-base uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #d4a517, #b8941a)',
                boxShadow: '0 4px 15px rgba(212, 165, 23, 0.4)',
              }}
            >
              Continue
            </button>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1a4a2e] border-2 border-[#d4a517] text-white text-sm md:text-base flex items-center justify-center hover:bg-[#2d6b4a] transition-colors z-20"
          style={{
            boxShadow: '0 0 10px rgba(212, 165, 23, 0.5)',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
