"use client"
import React, { useEffect } from 'react'
import { FaTimes, FaExpand } from 'react-icons/fa'

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhitepaperModal({ isOpen, onClose }: WhitepaperModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const openFullscreen = () => {
    window.open('/api/whitepaper', '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      <div 
        className="relative z-10 w-full max-w-5xl h-[90vh] bg-gradient-to-b from-[#0d3320] to-[#1a4a2e] rounded-2xl border-2 border-green-500 shadow-2xl animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-green-500/50">
          <h2 className="text-2xl md:text-3xl font-bold text-[#d4a517]">
            WHITEPAPER
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={openFullscreen}
              className="p-2 bg-green-600 hover:bg-green-500 rounded-full text-white transition-colors"
              title="Open in new tab"
            >
              <FaExpand size={16} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-2 overflow-hidden">
          <iframe
            src="/api/whitepaper"
            className="w-full h-full rounded-lg border border-green-500/30 bg-white"
            title="XMAS Pumpfun Race Whitepaper"
          />
        </div>
      </div>
    </div>
  )
}
