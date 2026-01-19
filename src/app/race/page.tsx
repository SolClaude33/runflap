'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWeb3Context } from '../contexts/Web3Provider';
import RaceTrack from '../components/Race/RaceTrack';
import BettingPanel from '../components/Race/BettingPanel';
import WalletChat from '../components/Chat/WalletChat';
import { WalletButton } from '../components/Wallet/WalletButton';
import { ProfileModal } from '../components/Wallet/ProfileModal';
import HelpModal from '../components/HelpModal';
import JackpotPanel from '../components/JackpotPanel';
import { FaBars, FaQuestionCircle, FaFlask, FaCommentDots, FaChartBar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  getCurrentRaceId,
  getRaceInfo,
  getRaceBets,
  getCarStats,
  getUserBet,
  placeBet,
  claimWinnings,
  getValidBetAmounts,
  getRaceStats,
  getRaceSeed,
  type RaceInfo,
  type Bet,
  type CarStats,
  type RaceStats,
} from '../services/flaprace';
import { ethers } from 'ethers';

type RaceState = 'betting' | 'pre_countdown' | 'countdown' | 'racing' | 'finished';

// Nuevos tiempos: 2 min apuestas, 5 seg countdown, 30 seg carrera
const BETTING_TIME = 120; // 2 minutos
const PRE_COUNTDOWN_DURATION = 5; // 5 segundos
const RACE_DURATION = 30; // 30 segundos

const CAR_NAMES: Record<number, string> = {
  1: 'Car 1',
  2: 'Car 2',
  3: 'Car 3',
  4: 'Car 4',
};

export default function RacePage() {
  const { isConnected, account, provider, signer, balance, userProfile, isProfileComplete, connectWallet } = useWeb3Context();
  const [raceState, setRaceState] = useState<RaceState>('betting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [raceNumber, setRaceNumber] = useState(0);
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [carStats, setCarStats] = useState<CarStats | null>(null);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [raceSeedData, setRaceSeedData] = useState<{ raceId: number; bettingEndTime: number; totalBets: number; blockHash: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [lastWinner, setLastWinner] = useState<number | null>(null);
  const [userBet, setUserBet] = useState<Bet | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [betTab, setBetTab] = useState<'bets' | 'mybet'>('bets');
  const [testMode, setTestMode] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileBets, setShowMobileBets] = useState(false);
  const [bettingTimer, setBettingTimer] = useState(BETTING_TIME);
  const [preCountdown, setPreCountdown] = useState<number | null>(null);
  const [validBetAmounts, setValidBetAmounts] = useState<string[]>(['0.01', '0.05', '0.1', '0.5']);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper para hacer llamadas con timeout
  const callWithTimeout = async <T,>(
    promise: Promise<T>,
    timeoutMs: number = 10000,
    errorMessage: string = 'Timeout'
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  };

  // Obtener información de la carrera desde el contrato
  const fetchRaceData = useCallback(async () => {
    if (!provider) return;

    try {
      // Verificar que el provider esté listo
      try {
        await callWithTimeout(provider.getNetwork(), 3000, 'Provider not ready');
      } catch (error) {
        // Si el provider no está listo, no hacer nada
        return;
      }

      let currentRace: number;
      try {
        currentRace = await callWithTimeout(getCurrentRaceId(provider), 5000, 'Failed to get race ID');
        setRaceNumber(currentRace);
      } catch (error: any) {
        // Si falla obtener el race ID, no continuar
        if (error.message !== 'Failed to get race ID') {
          console.error('Error getting current race ID:', error);
        }
        return;
      }

      let info: RaceInfo | null = null;
      try {
        info = await callWithTimeout(getRaceInfo(provider, currentRace), 5000, 'Failed to get race info');
        if (info) {
          setRaceInfo(info);
          
          // Determinar estado basado en tiempos del contrato (fuente de verdad)
          // Usar tiempos del contrato para sincronización global
          const now = Math.floor(Date.now() / 1000);
          const startTime = Number(info.startTime);
          const bettingEndTime = Number(info.bettingEndTime);
          const raceStartTime = bettingEndTime + PRE_COUNTDOWN_DURATION; // Cuando empieza la carrera visual
          const raceEndTime = Number(info.raceEndTime);

          // Si la carrera no ha sido inicializada (startTime = 0), significa que nadie ha apostado todavía
          // En este caso, la carrera empezará cuando alguien apueste, pero mostramos estado de "betting" listo para apostar
          if (startTime === 0 || bettingEndTime === 0) {
            // Carrera no inicializada - está lista para que alguien apueste
            // La carrera se inicializará automáticamente cuando alguien apueste
            setRaceState('betting');
            // No hay timer porque la carrera empezará cuando alguien apueste
            setBettingTimer(BETTING_TIME);
          } else if (now < bettingEndTime) {
            setRaceState('betting');
            setBettingTimer(Math.max(0, bettingEndTime - now));
          } else if (now < raceStartTime) {
            setRaceState('pre_countdown');
            setPreCountdown(Math.max(0, raceStartTime - now));
          } else if (now < raceEndTime) {
            setRaceState('racing');
            // Calcular countdown basado en tiempo del contrato
            const timeSinceRaceStart = now - raceStartTime;
            if (timeSinceRaceStart < 3) {
              setCountdown(3 - timeSinceRaceStart);
            } else {
              setCountdown(null);
            }
          } else if (info.finalized) {
            setRaceState('finished');
            if (info.winner > 0) {
              setLastWinner(info.winner);
            }
          } else {
            // La carrera terminó pero no está finalizada
            setRaceState('finished');
          }
        }
      } catch (error: any) {
        // Si falla obtener race info, continuar con otros datos si es posible
        if (error.message !== 'Failed to get race info') {
          console.error('Error getting race info:', error);
        }
        // Si no hay info, asumir que la carrera está lista para apostar
        setRaceState('betting');
        setBettingTimer(BETTING_TIME);
      }

      // Obtener apuestas (no crítico, puede fallar silenciosamente)
      try {
        const raceBets = await callWithTimeout(getRaceBets(provider, currentRace), 5000);
        setBets(raceBets);
      } catch (error) {
        // Silenciar errores de RPC para no spamear la consola
      }

      // Obtener estadísticas de autos (no crítico)
      try {
        const stats = await callWithTimeout(getCarStats(provider, currentRace), 5000);
        setCarStats(stats);
      } catch (error) {
        // Silenciar errores
      }

      // Obtener estadísticas de la carrera (no crítico)
      let raceStatsData: RaceStats | null = null;
      try {
        raceStatsData = await callWithTimeout(getRaceStats(provider, currentRace), 5000);
        setRaceStats(raceStatsData);
      } catch (error) {
        // Silenciar errores
      }
      
      // Obtener seed impredecible (incluye hash del bloque)
      // Solo obtenerlo cuando las apuestas ya se cerraron (para evitar llamadas innecesarias)
      if (info && raceStatsData && Number(info.bettingEndTime) <= Math.floor(Date.now() / 1000)) {
        try {
          const seedData = await callWithTimeout(
            getRaceSeed(provider, currentRace, Number(info.bettingEndTime), raceStatsData.totalBets),
            10000, // Más tiempo para obtener el bloque
            'Failed to get race seed'
          );
          setRaceSeedData({
            raceId: currentRace,
            bettingEndTime: Number(info.bettingEndTime),
            totalBets: raceStatsData.totalBets,
            blockHash: seedData.blockHash,
          });
        } catch (error) {
          // Fallback: usar datos sin hash del bloque
          setRaceSeedData({
            raceId: currentRace,
            bettingEndTime: Number(info.bettingEndTime),
            totalBets: raceStatsData.totalBets,
            blockHash: '',
          });
        }
      } else {
        // Si las apuestas aún no se cierran, no hay seed disponible
        setRaceSeedData(null);
      }

      // Obtener apuesta del usuario (no crítico)
      if (account) {
        try {
          const userBetData = await callWithTimeout(getUserBet(provider, account, currentRace), 5000);
          setUserBet(userBetData);
        } catch (error) {
          // Silenciar errores
        }
      }
    } catch (error: any) {
      // Solo loggear errores críticos que no sean de timeout/RPC
      if (error.message && !error.message.includes('Timeout') && !error.message.includes('RPC')) {
        console.error('Error fetching race data:', error);
      }
    }
  }, [provider, account]);

  // Actualizar datos periódicamente
  // Durante carrera, actualizar cada 1 segundo para sincronización precisa
  // Fuera de carrera, cada 5 segundos es suficiente
  useEffect(() => {
    if (!provider) return;

    fetchRaceData();
    const updateInterval = (raceState === 'racing' || raceState === 'countdown' || raceState === 'pre_countdown') ? 1000 : 5000;
    const interval = setInterval(fetchRaceData, updateInterval);
    return () => clearInterval(interval);
  }, [provider, fetchRaceData, raceState]);

  // Los timers ahora se sincronizan con fetchRaceData que usa tiempos del contrato
  // No necesitamos timers locales separados para evitar desincronización

  // Obtener montos válidos de apuesta
  useEffect(() => {
    if (!provider) return;
    
    const fetchValidBetAmounts = async () => {
      try {
        const amounts = await getValidBetAmounts(provider);
        setValidBetAmounts(amounts);
      } catch (error) {
        console.error('Error fetching valid bet amounts:', error);
      }
    };
    
    fetchValidBetAmounts();
  }, [provider]);

  const handleRaceEnd = useCallback(async (winnerId: number) => {
    setRaceState('finished');
    setLastWinner(winnerId);
    
    // Finalizar la carrera en el contrato automáticamente
    // El endpoint verifica que la carrera realmente terminó antes de permitir la finalización
    if (!testMode && raceNumber > 0) {
      try {
        const response = await fetch('/api/race/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raceId: raceNumber,
            winner: winnerId,
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log(`Race ${raceNumber} finalized. Winner: ${winnerId}. TX: ${result.txHash}`);
        } else {
          console.error('Error finalizing race:', result.error);
        }
      } catch (error) {
        console.error('Failed to finalize race:', error);
      }
    }
    
    // Recargar datos después de que termine la carrera
    setTimeout(() => {
      fetchRaceData();
    }, 2000);
  }, [fetchRaceData, raceNumber, testMode]);

  const handlePlaceBet = useCallback(async (carId: number, betAmount: string) => {
    if (testMode) {
      const newBet: Bet = {
        user: account || 'TestUser',
        carId,
        raceId: BigInt(raceNumber),
        amount: BigInt(0),
        claimed: false,
      };
      setBets(prev => [...prev, newBet]);
      setUserBet(newBet);
      return;
    }

    if (!signer || !account || raceState !== 'betting') {
      toast.error('No puedes apostar en este momento');
      return;
    }

    if (userBet) {
      toast.error('Ya has apostado en esta carrera');
      return;
    }

    try {
      toast.loading('Procesando apuesta...', { id: 'bet' });
      const result = await placeBet(signer, carId, betAmount);
      
      if (result.success) {
        toast.success('Apuesta colocada exitosamente!', { id: 'bet' });
        // Recargar datos
        setTimeout(() => fetchRaceData(), 2000);
      } else {
        toast.error(result.error || 'Error al colocar apuesta', { id: 'bet' });
      }
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      toast.error(error.message || 'Error al colocar apuesta', { id: 'bet' });
    }
  }, [signer, account, raceState, userBet, raceNumber, testMode, fetchRaceData]);

  const handleClaimWinnings = useCallback(async () => {
    if (!signer || !userBet) return;

    try {
      toast.loading('Reclamando ganancias...', { id: 'claim' });
      const result = await claimWinnings(signer, raceNumber);
      
      if (result.success) {
        toast.success('Ganancias reclamadas exitosamente!', { id: 'claim' });
        setTimeout(() => fetchRaceData(), 2000);
      } else {
        toast.error(result.error || 'Error al reclamar ganancias', { id: 'claim' });
      }
    } catch (error: any) {
      console.error('Failed to claim winnings:', error);
      toast.error(error.message || 'Error al reclamar ganancias', { id: 'claim' });
    }
  }, [signer, userBet, raceNumber, fetchRaceData]);

  const getCarName = (id: number) => CAR_NAMES[id] || 'Unknown';

  const prizePool = useMemo(() => {
    if (!raceInfo) return 0;
    const total = Number(ethers.formatEther(raceInfo.totalPool + raceInfo.nextRacePool));
    return total;
  }, [raceInfo]);

  const betStats = useMemo(() => {
    if (!carStats) return [];
    
    const totalPool = prizePool;
    
    return [1, 2, 3, 4].map(carId => {
      const count = Number(carStats.counts[carId - 1]);
      const amount = Number(ethers.formatEther(carStats.amounts[carId - 1]));
      const odds = amount > 0 && totalPool > 0 
        ? totalPool / amount 
        : 4.0;
      
      return {
        characterId: carId,
        totalBets: count,
        totalAmount: amount,
        odds: Math.min(odds, 20),
      };
    });
  }, [carStats, prizePool]);

  const bettingDisabled = raceState !== 'betting' || userBet !== null || !isConnected;

  const showBetting = raceState === 'betting';
  const showRace = raceState === 'countdown' || raceState === 'racing' || raceState === 'finished';
  const showPreCountdown = raceState === 'pre_countdown';

  useEffect(() => {
    if (isConnected && !isProfileComplete) {
      setShowProfileModal(true);
    }
  }, [isConnected, isProfileComplete]);

  useEffect(() => {
    if (raceState === 'racing' || raceState === 'countdown') {
      setShowMobileChat(false);
      setShowMobileBets(false);
    }
  }, [raceState]);

  return (
    <div className="bg-[#1a5a35] min-h-screen flex flex-col text-white">
      <nav className="flex justify-between items-center p-2 md:p-3 bg-[#0d3320] border-b-2 border-[#2d6b4a] mt-2">
        <Link href="/">
          <Image width={80} height={80} src="/ppraceLogo.png" alt="FlapRace" className="w-12 h-12 md:w-[80px] md:h-[80px]" style={{ width: 'auto', height: 'auto' }} />
        </Link>

        <div className="flex md:hidden items-center gap-2">
          <div className="bg-[#0a2818] rounded-lg py-1 px-3 text-sm font-bold border border-[#2d6b4a] text-white">
            #{raceNumber}
          </div>
          <div className="bg-[#0a2818] rounded-lg py-1 px-3 text-sm font-bold border border-[#2d6b4a] text-[#d4a517]">
            {prizePool.toFixed(2)} BNB
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex flex-col items-center">
            <p className="text-white/80 text-xs">Race</p>
            <div className="bg-[#0a2818] rounded-lg py-1 px-4 font-bold border-2 border-[#2d6b4a] text-white">{raceNumber}</div>
          </div>
          
          <div className="hidden md:flex flex-col items-center">
            <p className="text-white/80 text-xs">Balance</p>
            <div className="bg-[#0a2818] rounded-lg py-1 px-4 font-bold border-2 border-[#2d6b4a] text-white">
              {testMode ? '100.00 BNB' : (isConnected ? `${balance.toFixed(2)} BNB` : '---')}
            </div>
          </div>

          {!testMode && (
            <div className="hidden md:block">
              <WalletButton />
            </div>
          )}

          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <FaQuestionCircle size={18} />
          </button>

          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <FaBars size={20} />
          </button>
        </div>
      </nav>

      {showMenu && (
        <div className="absolute top-16 right-4 bg-[#0d3320] border-2 border-[#2d6b4a] rounded-xl p-4 z-50 min-w-[200px] shadow-xl">
          <WalletButton />
          <div className="mt-3 space-y-2">
            <button 
              onClick={() => {
                setTestMode(!testMode);
                setShowMenu(false);
              }}
              className={`w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 transition-colors ${testMode ? 'bg-[#d4a517]/20 text-[#d4a517]' : 'hover:bg-[#1a4a2e]'}`}
            >
              <FaFlask /> {testMode ? 'Exit Test Mode' : 'Test Mode'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-5 gap-3 p-2 md:p-3 overflow-y-auto">
        <section className="hidden lg:flex bg-[#1a4a2e] p-4 rounded-xl border-2 border-[#2d6b4a] flex-col gap-3">
          <div className="text-center py-2">
            <div className="text-[#7cb894] text-sm font-medium mb-1">Prize Pool</div>
            <div className="font-bold text-3xl text-white">{prizePool.toFixed(2)} <span className="text-[#d4a517]">BNB</span></div>
            {raceStats && (
              <div className="mt-2 space-y-1">
                <div className="text-[#7cb894] text-xs">
                  <span className="text-white font-semibold">{raceStats.totalBettors}</span> people bet
                </div>
                <div className="text-[#7cb894] text-xs">
                  Total bets: <span className="text-white font-semibold">{raceStats.totalBets}</span>
                </div>
                <div className="text-[#7cb894] text-xs">
                  Added to pool: <span className="text-[#d4a517] font-semibold">{ethers.formatEther(raceStats.totalPool)} BNB</span>
                </div>
              </div>
            )}
            <div className="text-[#7cb894] text-xs mt-2">Bet amounts: {validBetAmounts.join(', ')} BNB</div>
          </div>

          <JackpotPanel />

          <div className="flex items-center gap-2 bg-[#0d3320] rounded-full w-fit p-1">
            <button 
              onClick={() => setBetTab('bets')}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${betTab === 'bets' ? 'bg-[#2d6b4a]' : ''}`}
            >
              Bets
            </button>
            <button 
              onClick={() => setBetTab('mybet')}
              className={`px-3 py-1 text-sm transition-colors ${betTab === 'mybet' ? 'bg-[#2d6b4a] rounded-full' : ''}`}
            >
              My Bet
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {betTab === 'bets' ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1a4a2e]">
                  <tr className="border-b border-[#2d6b4a]">
                    <th className="py-2 text-left text-[#7cb894]">User</th>
                    <th className="py-2 text-right text-[#7cb894]">Car</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-[#7cb894]">
                        No bets yet
                      </td>
                    </tr>
                  ) : (
                    bets.map((bet, idx) => (
                      <tr key={idx} className="border-b border-[#0d3320]">
                        <td className="py-2 text-xs">{bet.user.slice(0, 6)}...{bet.user.slice(-4)}</td>
                        <td className="py-2 text-right text-xs">
                          <span className="bg-[#0d3320] px-2 py-0.5 rounded">#{bet.carId}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <div className="space-y-3">
                {userBet ? (
                  <div className="bg-[#0d3320] border-2 border-[#2d6b4a] rounded-xl p-3 text-center">
                    <div className="text-[#7cb894] text-xs mb-1">Your Current Bet</div>
                    <div className="font-bold text-lg text-[#d4a517]">{ethers.formatEther(userBet.amount)} BNB</div>
                    <div className="text-sm">{getCarName(userBet.carId)}</div>
                    {raceInfo?.finalized && userBet.carId === raceInfo.winner && !userBet.claimed && (
                      <button
                        onClick={handleClaimWinnings}
                        className="mt-2 bg-[#d4a517] hover:bg-[#b8940f] text-black px-4 py-2 rounded-lg font-bold text-sm"
                      >
                        Claim Winnings
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#7cb894]">
                    No bet placed yet
                  </div>
                )}
              </div>
            )}
          </div>

          {lastWinner && raceState === 'finished' && (
            <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl p-2 text-center">
              <div className="text-[#d4a517] text-xs">Winner</div>
              <div className="font-bold">{getCarName(lastWinner)}</div>
            </div>
          )}
        </section>

        <section className="flex-1 lg:col-span-3 flex flex-col gap-2">
          <div className="bg-gradient-to-r from-[#0d3320] via-[#1a4a2e] to-[#0d3320] border-2 border-[#d4a517] rounded-xl px-3 md:px-8 py-2 md:py-4 flex flex-col md:flex-row items-center justify-between gap-2 shadow-lg">
            {showBetting && (
              <>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-white text-sm md:text-xl font-bold tracking-wider">PLACE YOUR BETS!</div>
                  <div className="hidden md:block text-white/60 text-sm">Race #{raceNumber}</div>
                </div>
                <div className="flex items-center gap-2">
                  {raceInfo && raceInfo.startTime > 0 ? (
                    <>
                      <div className="hidden md:block text-white/80 text-sm">Starting in</div>
                      <div className="bg-black/50 border-2 border-[#d4a517] rounded-xl px-4 md:px-6 py-1 md:py-2">
                        <span className="text-[#d4a517] text-2xl md:text-4xl font-bold" style={{ textShadow: '0 0 20px rgba(212,165,23,0.6)' }}>{bettingTimer}s</span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-black/50 border-2 border-[#d4a517] rounded-xl px-4 md:px-6 py-1 md:py-2">
                      <span className="text-[#d4a517] text-sm md:text-base font-bold">Race starts when first bet is placed</span>
                    </div>
                  )}
                </div>
              </>
            )}
            {showPreCountdown && (
              <>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-white text-sm md:text-xl font-bold tracking-wider animate-pulse">RACE STARTING!</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-black/50 border-2 border-[#d4a517] rounded-xl px-4 md:px-6 py-1 md:py-2">
                    <span className="text-[#d4a517] text-2xl md:text-4xl font-bold animate-pulse" style={{ textShadow: '0 0 20px rgba(212,165,23,0.6)' }}>{preCountdown}s</span>
                  </div>
                </div>
              </>
            )}
            {(raceState === 'countdown' || raceState === 'racing') && (
              <>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-[#d4a517] text-sm md:text-xl font-bold tracking-wider">RACE IN PROGRESS</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl px-4 md:px-6 py-1 md:py-2">
                    <span className="text-white text-sm md:text-lg font-bold">RACING...</span>
                  </div>
                </div>
              </>
            )}
            {raceState === 'finished' && (
              <>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-[#d4a517] text-sm md:text-xl font-bold tracking-wider">RACE FINISHED!</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl px-4 md:px-6 py-1 md:py-2">
                    <span className="text-white text-sm md:text-lg font-bold">Next race soon...</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-h-[250px] md:min-h-[400px] rounded-xl overflow-hidden relative bg-black">
            {showBetting && (
              <div className="w-full h-full relative overflow-hidden">
                <video
                  ref={videoRef}
                  src="/api/video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Video loading error, trying fallback');
                    const video = e.currentTarget;
                    if (video.src !== '/race/loading.mp4') {
                      video.src = '/race/loading.mp4';
                    }
                  }}
                />
              </div>
            )}

            {showPreCountdown && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0d3320] to-[#0a2818]">
                <div className="text-center">
                  <div className="text-2xl text-white mb-2">Race Starting!</div>
                  <div className="text-8xl font-bold text-[#d4a517] animate-pulse">{preCountdown}</div>
                  <div className="text-lg text-[#7cb894] mt-2">Get ready...</div>
                </div>
              </div>
            )}

            {showRace && (
              <RaceTrack 
                raceState={raceState}
                countdown={countdown}
                onRaceEnd={handleRaceEnd}
                raceId={raceNumber}
                raceStartTime={raceInfo ? Number(raceInfo.bettingEndTime) + PRE_COUNTDOWN_DURATION : 0}
                raceSeed={raceSeedData}
              />
            )}
          </div>

          <BettingPanel
            disabled={bettingDisabled}
            selectedCharacter={selectedCar}
            onCharacterSelect={setSelectedCar}
            onPlaceBet={handlePlaceBet}
            autoBetEnabled={false}
            onAutoBetToggle={() => {}}
            autoBetAmount={0}
            onAutoBetAmountChange={() => {}}
            autoBetCharacter={null}
            onAutoBetCharacterChange={() => {}}
            betStats={betStats}
          />
        </section>

        <section className="hidden lg:block h-full">
          <WalletChat />
        </section>
      </div>

      {/* Mobile floating buttons */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40 flex flex-col gap-3">
        <button
          onClick={() => { setShowMobileBets(true); setShowMobileChat(false); }}
          className="bg-[#1a4a2e] border-2 border-[#d4a517] text-[#d4a517] p-3 rounded-full shadow-lg"
        >
          <FaChartBar size={20} />
        </button>
        <button
          onClick={() => { setShowMobileChat(true); setShowMobileBets(false); }}
          className="bg-[#d4a517] text-black p-3 rounded-full shadow-lg"
        >
          <FaCommentDots size={20} />
        </button>
      </div>

      {/* Mobile bets overlay */}
      {showMobileBets && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setShowMobileBets(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 h-[60vh] bg-[#1a4a2e] rounded-t-3xl p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold text-lg">Bets & Stats</h3>
              <button onClick={() => setShowMobileBets(false)} className="text-white/60 text-2xl">&times;</button>
            </div>
            
            <div className="text-center py-3 mb-3 bg-[#0d3320] rounded-xl">
              <div className="text-[#7cb894] text-sm font-medium mb-1">Prize Pool</div>
              <div className="font-bold text-2xl text-white">{prizePool.toFixed(2)} <span className="text-[#d4a517]">BNB</span></div>
              {raceStats && (
                <div className="mt-2 space-y-1">
                  <div className="text-[#7cb894] text-xs">
                    <span className="text-white font-semibold">{raceStats.totalBettors}</span> people bet
                  </div>
                  <div className="text-[#7cb894] text-xs">
                    Added: <span className="text-[#d4a517] font-semibold">{ethers.formatEther(raceStats.totalPool)} BNB</span>
                  </div>
                </div>
              )}
            </div>

            {userBet && (
              <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl p-3 mb-3 text-center">
                <div className="text-[#d4a517] text-xs">Your Bet</div>
                <div className="font-bold text-lg text-white">{ethers.formatEther(userBet.amount)} BNB on {getCarName(userBet.carId)}</div>
              </div>
            )}

            <div className="bg-[#0d3320] rounded-xl p-3">
              <h4 className="text-[#7cb894] text-sm mb-2">Live Bets</h4>
              {bets.length === 0 ? (
                <p className="text-center py-4 text-[#7cb894] text-sm">No bets yet</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {bets.map((bet, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-[#2d6b4a] pb-2">
                      <span className="text-white">{bet.user.slice(0, 8)}...</span>
                      <span className="bg-[#1a4a2e] px-2 py-0.5 rounded text-xs">#{bet.carId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile chat overlay */}
      {showMobileChat && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setShowMobileChat(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 h-[70vh] bg-[#1a4a2e] rounded-t-3xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold text-lg">Race Chat</h3>
              <button onClick={() => setShowMobileChat(false)} className="text-white/60 text-2xl">&times;</button>
            </div>
            <div className="h-[calc(100%-40px)]">
              <WalletChat />
            </div>
          </div>
        </div>
      )}

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
