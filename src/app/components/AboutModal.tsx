"use client"
import React, { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FaTimes } from 'react-icons/fa'

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
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

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      
      <div 
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0d3320] to-[#1a4a2e] rounded-2xl border-2 border-green-500 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold text-green-400 text-center mb-8">
            ABOUT THE GAME
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-green-500/50">
              <h3 className="text-xl font-bold text-green-400 mb-3">🎮 What is XPR?</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                FlapRace is a thrilling BNB-based multiplayer racing game. Connect your wallet, 
                bet real SOL on your favorite characters, and watch thrilling 3-lap races with random outcomes!
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-green-500/50">
              <h3 className="text-xl font-bold text-green-400 mb-3">💰 Prize Pool</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Winners take <span className="text-yellow-400 font-bold">95%</span> of the total prize pool! 
                The more you bet, the bigger the potential win. Real-time pari-mutuel odds update as bets come in.
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-green-500/50 mb-6">
            <h3 className="text-xl font-bold text-green-400 mb-4 text-center">🏁 Meet The Racers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-900/30 rounded-lg p-3 text-center border border-[#4ade80]/50">
                <Image src="/race/select1.png" alt="Pepe" width={60} height={60} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
                <h4 className="text-[#4ade80] font-bold">PEPE</h4>
                <p className="text-white/60 text-xs">The legendary frog</p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 text-center border border-[#fbbf24]/50">
                <Image src="/race/select2.png" alt="Alon" width={60} height={60} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
                <h4 className="text-[#fbbf24] font-bold">ALON</h4>
                <p className="text-white/60 text-xs">Stop Being Poor!</p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 text-center border border-[#34d399]/50">
                <Image src="/race/select3.png" alt="Cupsey" width={60} height={60} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
                <h4 className="text-[#34d399] font-bold">CUPSEY</h4>
                <p className="text-white/60 text-xs">The cheerful one</p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 text-center border border-[#e5e5e5]/50">
                <Image src="/race/select4.png" alt="Wojack" width={60} height={60} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
                <h4 className="text-[#e5e5e5] font-bold">WOJACK</h4>
                <p className="text-white/60 text-xs">The emotional one</p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-green-500/50 mb-6">
            <h3 className="text-xl font-bold text-green-400 mb-4 text-center">📋 How To Play</h3>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-green-800/30 rounded-lg p-3">
                <div className="text-2xl mb-1">👛</div>
                <p className="text-white font-bold text-xs">Connect Wallet</p>
              </div>
              <div className="bg-green-800/30 rounded-lg p-3">
                <div className="text-2xl mb-1">🏎️</div>
                <p className="text-white font-bold text-xs">Pick Racer</p>
              </div>
              <div className="bg-green-800/30 rounded-lg p-3">
                <div className="text-2xl mb-1">💎</div>
                <p className="text-white font-bold text-xs">Place Bet</p>
              </div>
              <div className="bg-green-800/30 rounded-lg p-3">
                <div className="text-2xl mb-1">🏁</div>
                <p className="text-white font-bold text-xs">Watch Race</p>
              </div>
              <div className="bg-green-800/30 rounded-lg p-3">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-white font-bold text-xs">Win SOL!</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-green-500/50 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="text-green-400 font-bold mb-1">Fair Racing</h4>
              <p className="text-white/70 text-xs">Equal base speeds with random events - any car can win!</p>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-green-500/50 text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="text-green-400 font-bold mb-1">Secure</h4>
              <p className="text-white/70 text-xs">BNB Smart Chain transactions, instant payouts to your wallet</p>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-green-500/50 text-center">
              <div className="text-3xl mb-2">📱</div>
              <h4 className="text-green-400 font-bold mb-1">Mobile Ready</h4>
              <p className="text-white/70 text-xs">Play anywhere with our fully responsive design</p>
            </div>
          </div>

          <div className="text-center">
            <Link 
              href="/race" 
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-8 py-3 rounded-full border-2 border-green-400 transition-all transform hover:scale-105"
              onClick={onClose}
            >
              🎄 START RACING NOW 🎄
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
