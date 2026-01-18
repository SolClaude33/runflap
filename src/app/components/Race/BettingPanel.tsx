'use client';

import { useState, useEffect } from 'react';
import { useWeb3Context } from '../../contexts/Web3Provider';
import CharacterSelect from './CharacterSelect';

interface BetStats {
  characterId: number;
  totalBets: number;
  totalAmount: number;
  odds: number;
}

interface BettingPanelProps {
  disabled: boolean;
  selectedCharacter: number | null;
  onCharacterSelect: (id: number) => void;
  onPlaceBet: (carId: number, betAmount: string) => void;
  autoBetEnabled: boolean;
  onAutoBetToggle: (enabled: boolean) => void;
  autoBetAmount: number;
  onAutoBetAmountChange: (amount: number) => void;
  autoBetCharacter: number | null;
  onAutoBetCharacterChange: (id: number) => void;
  betStats?: BetStats[];
}

// Montos fijos de apuesta en BNB
const BET_AMOUNTS = ['0.01', '0.05', '0.1', '0.5'];

export default function BettingPanel({ 
  disabled, 
  selectedCharacter, 
  onCharacterSelect, 
  onPlaceBet,
  autoBetEnabled,
  onAutoBetToggle,
  autoBetAmount,
  onAutoBetAmountChange,
  autoBetCharacter,
  onAutoBetCharacterChange,
  betStats = [],
}: BettingPanelProps) {
  const { isConnected, balance, isProfileComplete } = useWeb3Context();
  const [selectedBetAmount, setSelectedBetAmount] = useState<string>('0.01');

  const handlePlaceBet = () => {
    if (!isConnected || !isProfileComplete || !selectedCharacter || disabled) {
      return;
    }

    const betAmountNum = parseFloat(selectedBetAmount);
    if (betAmountNum > balance) {
      return;
    }

    onPlaceBet(selectedCharacter, selectedBetAmount);
  };

  const canBet = isConnected && isProfileComplete && selectedCharacter && parseFloat(selectedBetAmount) <= balance && !disabled;

  return (
    <div className="bg-[#1a4a2e] rounded-xl p-2 md:p-4 flex flex-col gap-2 md:gap-4 border-2 border-[#2d6b4a]">
      <CharacterSelect 
        selectedCharacter={selectedCharacter}
        onSelect={onCharacterSelect}
        disabled={disabled}
        betStats={betStats}
      />

      <div className="flex flex-col gap-3">
        <div className="text-center">
          <div className="text-[#7cb894] text-xs md:text-sm mb-2">Select Bet Amount</div>
          <div className="grid grid-cols-4 gap-2">
            {BET_AMOUNTS.map((amount) => {
              const amountNum = parseFloat(amount);
              const isSelected = selectedBetAmount === amount;
              const canAfford = amountNum <= balance;
              
              return (
                <button
                  key={amount}
                  onClick={() => setSelectedBetAmount(amount)}
                  disabled={disabled || !canAfford}
                  className={`
                    py-2 md:py-3 px-2 rounded-lg font-bold text-sm md:text-base transition-all
                    ${isSelected 
                      ? 'bg-[#d4a517] text-black border-2 border-white shadow-lg' 
                      : canAfford
                        ? 'bg-[#0d3320] text-white hover:bg-[#1a4a2e] border-2 border-[#2d6b4a]'
                        : 'bg-[#0d3320] text-white/30 border-2 border-[#2d6b4a] opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  {amount} <span className="text-xs">BNB</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handlePlaceBet}
          disabled={!canBet}
          className={`
            w-full py-3 md:py-4 px-6 rounded-xl font-bold text-white text-base md:text-lg transition-all
            ${canBet 
              ? 'bg-[#d4a517] hover:bg-[#b8920f] text-black border-2 border-[#e6b91e] shadow-lg shadow-[#d4a517]/30' 
              : 'bg-gray-500 cursor-not-allowed'
            }
          `}
        >
          {!isConnected ? 'Connect Wallet' : 
           !isProfileComplete ? 'Setup Profile' :
           !selectedCharacter ? 'Select Car' :
           parseFloat(selectedBetAmount) > balance ? 'Insufficient Balance' :
           disabled ? 'Betting Closed' :
           `BET ${selectedBetAmount} BNB`}
        </button>

        {!isConnected && (
          <div className="text-center text-[#7cb894] text-xs">
            Connect your wallet to place bets
          </div>
        )}

        {isConnected && parseFloat(selectedBetAmount) > balance && (
          <div className="text-center text-red-400 text-xs">
            Insufficient balance. You need {selectedBetAmount} BNB
          </div>
        )}
      </div>
    </div>
  );
}
