'use client';

import React from 'react';
import { FaTimes, FaTrophy, FaWallet, FaGamepad, FaCoins } from 'react-icons/fa';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-green-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-green-900 p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-bold text-white">How to Play</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-red-400 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-white">
          <div className="flex gap-4">
            <div className="bg-green-700 p-3 rounded-full">
              <FaWallet className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">1. Connect Wallet</h3>
              <p className="text-green-200 text-sm">
                Connect your BNB wallet (MetaMask) and set up your display name to start playing.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-700 p-3 rounded-full">
              <FaGamepad className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">2. Choose Your Racer</h3>
              <p className="text-green-200 text-sm">
                Select one of the 4 characters to bet on. Each character has random speed variations during the race.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-700 p-3 rounded-full">
              <FaCoins className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">3. Place Your Bet</h3>
              <p className="text-green-200 text-sm">
                Choose your bet amount in SOL. You can use preset buttons (1, 2, 5, 10) or adjust manually. Enable "Automatic" mode to repeat your bet every race.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-700 p-3 rounded-full">
              <FaTrophy className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">4. Watch & Win</h3>
              <p className="text-green-200 text-sm">
                Once bets are placed, the race starts! If your character wins, you receive the prize pool winnings (3.8x multiplier on your bet).
              </p>
            </div>
          </div>

          <div className="bg-green-900 rounded-lg p-4">
            <h3 className="font-bold text-yellow-400 mb-2">Prize Pool Distribution</h3>
            <ul className="text-green-200 text-sm space-y-1">
              <li>• 95% distributed to winners</li>
              <li>• 5% house fee</li>
            </ul>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
            <h3 className="font-bold text-yellow-400 mb-2">Tips</h3>
            <ul className="text-green-200 text-sm space-y-1">
              <li>• Use the chat to connect with other players</li>
              <li>• Check the "Bets" panel to see what others are betting on</li>
              <li>• Enable auto-bet for hands-free racing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
