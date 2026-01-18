'use client';

interface Character {
  id: number;
  name: string;
  image: string;
  color: string;
}

interface BetStats {
  characterId: number;
  totalBets: number;
  totalAmount: number;
  odds: number;
}

interface CharacterSelectProps {
  selectedCharacter: number | null;
  onSelect: (id: number) => void;
  disabled?: boolean;
  betStats?: BetStats[];
}

const CHARACTERS: Character[] = [
  { id: 1, name: 'Pepe', image: '/race/select1.png', color: '#4ade80' },
  { id: 2, name: 'Alon', image: '/race/select2.png', color: '#fbbf24' },
  { id: 3, name: 'Cupsey', image: '/race/select3.png', color: '#34d399' },
  { id: 4, name: 'Wojack', image: '/race/select4.png', color: '#e5e5e5' },
];

export default function CharacterSelect({ selectedCharacter, onSelect, disabled, betStats = [] }: CharacterSelectProps) {
  const getCharStats = (charId: number): BetStats | undefined => {
    return betStats.find(s => s.characterId === charId);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 p-2 md:p-3 bg-[#0d3320] rounded-xl border-2 border-[#2d6b4a]">
      {CHARACTERS.map((char) => {
        const stats = getCharStats(char.id);
        
        return (
          <button
            key={char.id}
            onClick={() => !disabled && onSelect(char.id)}
            disabled={disabled}
            className={`
              relative p-2 md:p-3 rounded-xl transition-all duration-200
              ${selectedCharacter === char.id 
                ? 'scale-105 bg-[#0a2818]' 
                : 'bg-[#0a2818] hover:bg-[#1a4a2e]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{
              boxShadow: selectedCharacter === char.id 
                ? `0 0 20px ${char.color}, 0 0 40px ${char.color}60`
                : '0 2px 8px rgba(0,0,0,0.3)',
              border: selectedCharacter === char.id 
                ? `3px solid ${char.color}` 
                : '2px solid #2d6b4a',
            }}
          >
            <div 
              className="relative flex items-center justify-center"
              style={{
                filter: selectedCharacter === char.id 
                  ? `drop-shadow(0 0 8px ${char.color}) drop-shadow(0 0 16px ${char.color})`
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            >
              <img 
                src={char.image} 
                alt={char.name}
                className="w-full h-12 md:h-20 object-contain"
              />
            </div>
            <div className="text-white text-xs md:text-sm mt-1 md:mt-2 text-center font-medium">
              {char.name}
            </div>
            
            <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-[#7cb894]">Bets:</span>
                <span className="text-white font-bold">{stats?.totalBets || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-[#7cb894]">Pool:</span>
                <span className="text-[#d4a517] font-bold">{(stats?.totalAmount || 0).toFixed(1)}</span>
              </div>
              <div className="bg-[#0d3320] rounded px-1 md:px-2 py-0.5 md:py-1 text-center">
                <span className="text-[#d4a517] font-bold text-xs md:text-sm">
                  {stats?.totalBets > 0 ? `${stats.odds.toFixed(1)}x` : '—'}
                </span>
              </div>
            </div>
            
            {selectedCharacter === char.id && (
              <div 
                className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: char.color }}
              >
                <span className="text-[10px] md:text-xs text-white font-bold">✓</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
