'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaTrophy, FaExternalLinkAlt, FaSync, FaGift } from 'react-icons/fa';
import { subscribeToJackpotState, JackpotState } from '../firebase';

interface JackpotData {
  jackpotBalance: number;
  pendingFees: number;
  totalJackpot: number;
  jackpotWallet: string;
  solscanUrl: string;
}

export default function JackpotPanel() {
  const [jackpotData, setJackpotData] = useState<JackpotData | null>(null);
  const [jackpotState, setJackpotState] = useState<JackpotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJackpot = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jackpot/balance');
      const data = await response.json();
      
      if (data.success) {
        setJackpotData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch jackpot');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJackpot();
    intervalRef.current = setInterval(fetchJackpot, 30000);
    
    const unsubscribe = subscribeToJackpotState((state) => {
      setJackpotState(state);
    });
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      unsubscribe();
    };
  }, []);

  const formatSOL = (amount: number) => {
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    if (amount >= 100) return amount.toFixed(1);
    if (amount >= 1) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const racesUntilJackpot = jackpotState 
    ? jackpotState.nextJackpotRace - jackpotState.currentRace 
    : 50;

  return (
    <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/30 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FaTrophy className="text-amber-400 text-lg animate-pulse" />
          <span className="text-amber-300 font-bold text-sm uppercase tracking-wide">
            Jackpot Pool
          </span>
        </div>
        <button 
          onClick={fetchJackpot}
          className="text-amber-400/60 hover:text-amber-300 transition-colors"
          disabled={loading}
        >
          <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !jackpotData ? (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-400 text-xs text-center py-2">
          {error}
        </div>
      ) : jackpotData ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-amber-400 tabular-nums">
              {formatSOL(jackpotData.totalJackpot)}
            </span>
            <span className="text-amber-300/80 text-sm">SOL</span>
          </div>

          {jackpotState && (
            <div className="bg-amber-500/10 rounded-md p-2 mt-2">
              <div className="flex items-center justify-center gap-2 text-amber-300">
                <FaGift className="text-sm" />
                <span className="text-xs font-medium">
                  Draw in {racesUntilJackpot} race{racesUntilJackpot !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-center text-[10px] text-amber-200/60 mt-1">
                Race {jackpotState.currentRace} / {jackpotState.nextJackpotRace}
              </div>
            </div>
          )}

          {jackpotState?.lastWinner && (
            <div className="text-center text-[10px] text-green-400/80 mt-1">
              Last winner: {jackpotState.lastWinner} ({formatSOL(jackpotState.lastWinAmount)} SOL)
            </div>
          )}

          <div className="flex justify-between text-xs text-amber-200/60">
            <span>Claimed: {formatSOL(jackpotData.jackpotBalance)} SOL</span>
            <span>Pending: {formatSOL(jackpotData.pendingFees)} SOL</span>
          </div>

          <a
            href={jackpotData.solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-amber-400/70 hover:text-amber-300 transition-colors pt-1"
          >
            <span>{shortenAddress(jackpotData.jackpotWallet)}</span>
            <FaExternalLinkAlt className="text-[10px]" />
          </a>
        </div>
      ) : null}

      <div className="mt-2 pt-2 border-t border-amber-500/20">
        <p className="text-[10px] text-amber-200/40 text-center">
          Funded by 0.05% creator rewards from $XPR trading
        </p>
      </div>
    </div>
  );
}
