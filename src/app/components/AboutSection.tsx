"use client"
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AboutSection() {
  return (
    <section id="about" className="relative py-16 px-4" style={{ backgroundImage: 'url(/hero-background.png)', backgroundSize: 'cover', backgroundPosition: 'center bottom' }}>
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="relative z-10 max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-green-400 text-center mb-10 textBorder">
          ABOUT THE GAME
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-500">
            <h3 className="text-2xl font-bold text-green-400 mb-4">🎮 What is XPR?</h3>
            <p className="text-white leading-relaxed">
              FlapRace is a thrilling BNB-based multiplayer racing game. Connect your wallet, 
              bet real SOL on your favorite characters, and watch thrilling 3-lap races with random outcomes!
            </p>
          </div>

          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-500">
            <h3 className="text-2xl font-bold text-green-400 mb-4">💰 Prize Pool</h3>
            <p className="text-white leading-relaxed">
              Winners take <span className="text-yellow-400 font-bold">95%</span> of the total prize pool! 
              The more you bet, the bigger the potential win. Real-time pari-mutuel odds update as bets come in.
            </p>
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-500 mb-8">
          <h3 className="text-2xl font-bold text-green-400 mb-6 text-center">🏁 Meet The Racers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-900/50 rounded-xl p-4 text-center border-2 border-[#4ade80]">
              <Image src="/race/select1.png" alt="Pepe" width={80} height={80} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
              <h4 className="text-[#4ade80] font-bold text-lg">PEPE</h4>
              <p className="text-white/70 text-sm">The legendary frog</p>
            </div>
            <div className="bg-green-900/50 rounded-xl p-4 text-center border-2 border-[#fbbf24]">
              <Image src="/race/select2.png" alt="Alon" width={80} height={80} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
              <h4 className="text-[#fbbf24] font-bold text-lg">ALON</h4>
              <p className="text-white/70 text-sm">Stop Being Poor!</p>
            </div>
            <div className="bg-green-900/50 rounded-xl p-4 text-center border-2 border-[#34d399]">
              <Image src="/race/select3.png" alt="Cupsey" width={80} height={80} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
              <h4 className="text-[#34d399] font-bold text-lg">CUPSEY</h4>
              <p className="text-white/70 text-sm">The cheerful one</p>
            </div>
            <div className="bg-green-900/50 rounded-xl p-4 text-center border-2 border-[#e5e5e5]">
              <Image src="/race/select4.png" alt="Wojack" width={80} height={80} className="mx-auto mb-2" style={{ width: 'auto', height: 'auto' }} />
              <h4 className="text-[#e5e5e5] font-bold text-lg">WOJACK</h4>
              <p className="text-white/70 text-sm">The emotional one</p>
            </div>
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-500 mb-8">
          <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">📋 How To Play</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
            <div className="bg-green-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">👛</div>
              <p className="text-white font-bold text-xs md:text-sm">Connect Wallet</p>
            </div>
            <div className="bg-green-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">🏎️</div>
              <p className="text-white font-bold text-xs md:text-sm">Pick Racer</p>
            </div>
            <div className="bg-green-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">💎</div>
              <p className="text-white font-bold text-xs md:text-sm">Place Bet</p>
            </div>
            <div className="bg-green-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">🏁</div>
              <p className="text-white font-bold text-xs md:text-sm">Watch Race</p>
            </div>
            <div className="bg-green-800/50 rounded-xl p-4 col-span-3 md:col-span-1">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-white font-bold text-xs md:text-sm">Win SOL!</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 border-2 border-green-500 text-center">
            <div className="text-4xl mb-2">⚡</div>
            <h4 className="text-green-400 font-bold mb-2">Fair Racing</h4>
            <p className="text-white/80 text-sm">Equal base speeds with random events - any car can win!</p>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 border-2 border-green-500 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h4 className="text-green-400 font-bold mb-2">Secure</h4>
            <p className="text-white/80 text-sm">BNB Smart Chain transactions, instant payouts to your wallet</p>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 border-2 border-green-500 text-center">
            <div className="text-4xl mb-2">📱</div>
            <h4 className="text-green-400 font-bold mb-2">Mobile Ready</h4>
            <p className="text-white/80 text-sm">Play anywhere with our fully responsive design</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/race" className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold text-2xl px-10 py-4 rounded-full border-2 border-green-400 transition-all transform hover:scale-105">
            🎄 START RACING NOW 🎄
          </Link>
        </div>
      </div>
    </section>
  )
}
