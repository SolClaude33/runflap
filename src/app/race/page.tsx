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
  getContractOwner,
  getContractBalance,
  withdraw,
  emergencyWithdraw,
  type RaceInfo,
  type Bet,
  type CarStats,
  type RaceStats,
} from '../services/flaprace';
import { ethers } from 'ethers';

type RaceState = 'betting' | 'pre_countdown' | 'countdown' | 'racing' | 'finished';

// Nuevos tiempos: 2 min apuestas, 10 seg countdown, 30 seg carrera visual
const BETTING_TIME = 120; // 2 minutos
const COUNTDOWN_DURATION = 10; // 10 segundos countdown después de cerrar apuestas
const RACE_VISUAL_DURATION = 30; // 30 segundos para mostrar la carrera visual

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
  const [previousRaceInfo, setPreviousRaceInfo] = useState<RaceInfo | null>(null); // Info de la carrera anterior
  const [bets, setBets] = useState<Bet[]>([]);
  const [carStats, setCarStats] = useState<CarStats | null>(null);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [contractWinner, setContractWinner] = useState<number | null>(null); // Winner from contract (determined after countdown)
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
  const finalizingRaceRef = useRef<Set<number>>(new Set()); // Track races being finalized to prevent duplicates
  const winnerDetectedRef = useRef<Map<number, number>>(new Map()); // Track detected winner per race to ensure consistency
  const verifiedFinalizedRef = useRef<Set<number>>(new Set()); // Track races verified as finalized to prevent re-checks
  const determiningWinnerRef = useRef<Map<number, boolean>>(new Map()); // Evitar múltiples llamadas al endpoint de determinar ganador
  
  // Guardar timestamps del contrato para countdown local suave
  const contractTimestampsRef = useRef<{
    bettingEndTime: number | null;
    winnerDeterminedTime: number | null;
    claimingStartTime: number | null;
  }>({
    bettingEndTime: null,
    winnerDeterminedTime: null,
    claimingStartTime: null,
  });
  const [validBetAmounts, setValidBetAmounts] = useState<string[]>(['0.01', '0.05', '0.1', '0.5']);
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState<bigint>(BigInt(0));
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeRaceId, setFinalizeRaceId] = useState<string>('');
  const [finalizeWinner, setFinalizeWinner] = useState<number>(1);
  
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
        
        // CRITICAL: Clear winner detection when race changes
        if (currentRace !== raceNumber) {
          winnerDetectedRef.current.delete(raceNumber); // Clear old race
          finalizingRaceRef.current.delete(raceNumber); // Clear old race finalization
          verifiedFinalizedRef.current.delete(raceNumber); // Clear old race verification
          determiningWinnerRef.current.delete(raceNumber); // Clear determining winner flag
          setContractWinner(null); // Clear contract winner for new race
          
          // Si cambió la carrera, obtener info de la carrera anterior
          if (currentRace > 0 && raceNumber > 0) {
            try {
              const prevRaceInfo = await callWithTimeout(getRaceInfo(provider, raceNumber), 5000, 'Failed to get previous race info');
              if (prevRaceInfo && prevRaceInfo.finalized && prevRaceInfo.winner > 0) {
                setPreviousRaceInfo(prevRaceInfo);
              }
            } catch (error) {
              // Silenciar errores al obtener carrera anterior
            }
          }
        }
        
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
          const winnerDeterminedTime = Number(info.winnerDeterminedTime);
          const claimingStartTime = Number(info.claimingStartTime);
          const raceVisualStartTime = winnerDeterminedTime; // La carrera visual empieza cuando se determina el ganador
          const raceVisualEndTime = claimingStartTime; // La carrera visual termina cuando se pueden reclamar ganancias

          // Guardar timestamps del contrato una vez para countdown local suave
          if (startTime > 0 && bettingEndTime > 0) {
            contractTimestampsRef.current = {
              bettingEndTime: Number(bettingEndTime),
              winnerDeterminedTime: Number(winnerDeterminedTime),
              claimingStartTime: Number(claimingStartTime),
            };
          }

          // Si la carrera no ha sido inicializada (startTime = 0), significa que nadie ha apostado todavía
          if (startTime === 0 || bettingEndTime === 0) {
            console.log(`[Race ${currentRace}] 🔄 Race not initialized. Setting state to BETTING.`);
            setRaceState('betting');
            setBettingTimer(BETTING_TIME);
            contractTimestampsRef.current = {
              bettingEndTime: null,
              winnerDeterminedTime: null,
              claimingStartTime: null,
            };
          } else if (now < bettingEndTime) {
            // Betting period activo
            console.log(`[Race ${currentRace}] ⏰ Betting period active (now: ${now}, ends: ${bettingEndTime}). State: BETTING`);
            setRaceState('betting');
          } else if (now < winnerDeterminedTime) {
            // Countdown period (10 segundos después de cerrar apuestas)
            console.log(`[Race ${currentRace}] 🏁 Countdown (now: ${now}, winner determined at: ${winnerDeterminedTime}). State: PRE_COUNTDOWN`);
            setRaceState('pre_countdown');
            
            // Intentar determinar ganador automáticamente llamando al endpoint del servidor
            // Esto no requiere wallet del usuario, el servidor usa OWNER_PRIVATE_KEY
            // Usar un flag para evitar múltiples llamadas
            console.log(`[Race ${currentRace}] 🔍 Countdown check - winner: ${info.winner}, now: ${now}, bettingEndTime: ${bettingEndTime}, flag: ${determiningWinnerRef.current.get(currentRace)}`);
            if (info.winner === 0 && now >= bettingEndTime && !determiningWinnerRef.current.get(currentRace)) {
              determiningWinnerRef.current.set(currentRace, true);
              console.log(`[Race ${currentRace}] 🎲 Calling server to determine winner (now: ${now}, betting ended: ${bettingEndTime})`);
              
              // Llamar al endpoint del servidor para que determine el ganador
              // El servidor usará OWNER_PRIVATE_KEY, no requiere wallet del usuario
              fetch('/api/race/determine-winner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raceId: currentRace })
              })
              .then(async (res) => {
                const data = await res.json();
                console.log(`[Race ${currentRace}] Server response:`, data);
                if (data.success) {
                  console.log(`[Race ${currentRace}] ✅ Winner determined by server: ${data.message}`);
                  // Recargar datos después de un breve delay
                  setTimeout(() => {
                    fetchRaceData();
                  }, 2000);
                } else {
                  console.warn(`[Race ${currentRace}] ⚠️ ${data.message || data.error || 'Waiting for winner determination...'}`);
                  // Si dice "winner already determined" pero el contrato muestra winner: 0, 
                  // hay un problema - permitir reintentar
                  if (data.message?.includes('winner already determined')) {
                    console.warn(`[Race ${currentRace}] ⚠️ Server says winner determined but contract shows winner: 0. Will retry...`);
                    // Recargar datos para verificar el estado real
                    setTimeout(() => {
                      fetchRaceData();
                      determiningWinnerRef.current.delete(currentRace);
                    }, 5000);
                  } else if (data.message?.includes('not ended')) {
                    // Aún no es el momento, permitir reintentar
                    determiningWinnerRef.current.delete(currentRace);
                  } else {
                    // Para otros errores, permitir reintentar después de un tiempo
                    setTimeout(() => {
                      determiningWinnerRef.current.delete(currentRace);
                    }, 10000);
                  }
                }
              })
              .catch(err => {
                console.error(`[Race ${currentRace}] ❌ Error calling determine-winner endpoint:`, err);
                // Permitir reintentar después de un tiempo
                setTimeout(() => {
                  determiningWinnerRef.current.delete(currentRace);
                }, 10000);
              });
            }
            
            // Leer el ganador del contrato cuando esté disponible
            if (info.winner > 0 && info.winner !== contractWinner) {
              setContractWinner(info.winner);
              console.log(`[Race ${currentRace}] 🎯 Contract winner set to: Car ${info.winner}`);
            } else if (info.winner === 0) {
              console.log(`[Race ${currentRace}] ⏳ Waiting for winner to be determined...`);
            }
          } else if (now < raceVisualEndTime) {
            // Race visual period (30 segundos para mostrar la carrera)
            console.log(`[Race ${currentRace}] 🏎️ Race visual in progress (now: ${now}, ends: ${raceVisualEndTime}). State: RACING`);
            setRaceState('racing');
            
            // El ganador debería estar determinado durante el countdown
            // Si aún no está determinado, intentar llamar al endpoint (puede que haya fallado antes)
            console.log(`[Race ${currentRace}] 🔍 Race visual check - winner: ${info.winner}, now: ${now}, bettingEndTime: ${bettingEndTime}, flag: ${determiningWinnerRef.current.get(currentRace)}`);
            if (info.winner > 0 && info.winner !== contractWinner) {
              setContractWinner(info.winner);
              setLastWinner(info.winner);
              console.log(`[Race ${currentRace}] 🎯 Contract winner updated: Car ${info.winner}`);
            } else if (info.winner === 0 && now >= bettingEndTime && !determiningWinnerRef.current.get(currentRace)) {
              // Si aún no hay ganador y el betting terminó, intentar determinar
              determiningWinnerRef.current.set(currentRace, true);
              console.log(`[Race ${currentRace}] 🎲 Retrying winner determination during race visual (now: ${now}, betting ended: ${bettingEndTime})`);
              
              fetch('/api/race/determine-winner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raceId: currentRace })
              })
              .then(async (res) => {
                const data = await res.json();
                console.log(`[Race ${currentRace}] Server response during race visual:`, data);
                if (data.success) {
                  console.log(`[Race ${currentRace}] ✅ Winner determined: ${data.message}`);
                  setTimeout(() => fetchRaceData(), 2000);
                } else {
                  console.warn(`[Race ${currentRace}] ⚠️ ${data.message || data.error || 'Still waiting...'}`);
                  // Permitir reintentar después de 15 segundos
                  setTimeout(() => {
                    determiningWinnerRef.current.delete(currentRace);
                  }, 15000);
                }
              })
              .catch(err => {
                console.error(`[Race ${currentRace}] ❌ Error during race visual:`, err);
                // Permitir reintentar después de 15 segundos
                setTimeout(() => {
                  determiningWinnerRef.current.delete(currentRace);
                }, 15000);
              });
            }
          } else {
            // Race visual period ended - but check if contract is finalized
            if (info.finalized && info.winner > 0) {
              // Contract is finalized and has a winner
              console.log(`[Race ${currentRace}] 🏆 Race finished and finalized. Winner: ${info.winner}. State: FINISHED`);
              setRaceState('finished');
              setContractWinner(info.winner);
              setLastWinner(info.winner);
            } else {
              // Visual race ended but contract not finalized yet (waiting for winner determination)
              console.log(`[Race ${currentRace}] ⏳ Race visual ended but not finalized yet (winner: ${info.winner}, finalized: ${info.finalized}). Attempting to determine winner...`);
              setRaceState('racing'); // Keep in racing state until finalized
              
              // CRITICAL: Intentar determinar ganador si aún no se ha determinado
              // Esto es importante porque el usuario puede conectarse después del countdown
              if (info.winner === 0 && now >= bettingEndTime && !determiningWinnerRef.current.get(currentRace)) {
                determiningWinnerRef.current.set(currentRace, true);
                console.log(`[Race ${currentRace}] 🎲 Attempting winner determination after race visual ended (now: ${now}, betting ended: ${bettingEndTime})`);
                
                fetch('/api/race/determine-winner', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ raceId: currentRace })
                })
                .then(async (res) => {
                  const data = await res.json();
                  console.log(`[Race ${currentRace}] Server response after race visual:`, data);
                  if (data.success) {
                    console.log(`[Race ${currentRace}] ✅ Winner determined: ${data.message}`);
                    setTimeout(() => fetchRaceData(), 2000);
                  } else {
                    console.warn(`[Race ${currentRace}] ⚠️ ${data.message || data.error || 'Still waiting...'}`);
                    // Permitir reintentar después de 15 segundos
                    setTimeout(() => {
                      determiningWinnerRef.current.delete(currentRace);
                    }, 15000);
                  }
                })
                .catch(err => {
                  console.error(`[Race ${currentRace}] ❌ Error after race visual:`, err);
                  // Permitir reintentar después de 15 segundos
                  setTimeout(() => {
                    determiningWinnerRef.current.delete(currentRace);
                  }, 15000);
                });
              }
              
              // Keep checking for winner
              if (info.winner > 0 && info.winner !== contractWinner) {
                setContractWinner(info.winner);
                setLastWinner(info.winner);
              }
            }
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
      
      // El ganador se determina automáticamente en el contrato después del countdown
      // Solo necesitamos leerlo cuando esté disponible
      if (info && info.winner > 0) {
        if (info.winner !== contractWinner) {
          setContractWinner(info.winner);
          setLastWinner(info.winner);
          console.log(`[Race ${currentRace}] 🏆 Winner from contract: Car ${info.winner}`);
        }
      } else {
        // Ganador aún no determinado
        setContractWinner(null);
      }

      // Obtener apuesta del usuario (no crítico)
      // Solo intentar si la carrera está inicializada (startTime > 0)
      if (account && info && Number(info.startTime) > 0) {
        try {
          const userBetData = await callWithTimeout(getUserBet(provider, account, currentRace), 5000);
          setUserBet(userBetData);
        } catch (error) {
          // Silenciar errores
        }
      } else if (account && info && Number(info.startTime) === 0) {
        // Carrera no inicializada - no hay apuestas todavía
        setUserBet(null);
      }
    } catch (error: any) {
      // Solo loggear errores críticos que no sean de timeout/RPC
      if (error.message && !error.message.includes('Timeout') && !error.message.includes('RPC')) {
        console.error('Error fetching race data:', error);
      }
    }
  }, [provider, account]);

  // Verificar y finalizar carreras que ya terminaron pero no se finalizaron
  useEffect(() => {
    if (!provider || !raceInfo) {
      return;
    }

    if (raceInfo.finalized) {
      // Limpiar el ref cuando el estado se actualiza correctamente
      verifiedFinalizedRef.current.delete(raceNumber);
      console.log(`[Auto-Finalize] Race ${raceNumber} already finalized, skipping check.`);
      return;
    }

    // Si ya verificamos que esta carrera está finalizada en el contrato, esperar a que el estado se actualice
    if (verifiedFinalizedRef.current.has(raceNumber)) {
      return;
    }

    const checkAndFinalize = async () => {
      // Verificar nuevamente si ya está verificado como finalizado (protección adicional)
      if (verifiedFinalizedRef.current.has(raceNumber)) {
        return;
      }

      // Verificar nuevamente si el estado local ya se actualizó (protección adicional)
      if (raceInfo.finalized) {
        verifiedFinalizedRef.current.delete(raceNumber);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const claimingStartTime = Number(raceInfo.claimingStartTime);
      const startTime = Number(raceInfo.startTime);
      
      // CRITICAL: Verificar que la carrera existe
      // Si startTime es 0, la carrera no ha sido inicializada (nadie ha apostado)
      if (startTime === 0) {
        // Carrera no inicializada - no intentar finalizar
        return;
      }
      
      // El contrato ahora finaliza automáticamente cuando se determina el ganador
      // Solo verificamos si está finalizada, no necesitamos finalizarla manualmente
      if (!raceInfo.finalized && raceInfo.winner > 0 && now >= claimingStartTime) {
        // PRIMERO: Verificar directamente en el contrato si ya está finalizada
        // Esto evita llamadas innecesarias al backend
        try {
          if (provider) {
            const contractInfo = await getRaceInfo(provider, raceNumber);
            if (contractInfo && contractInfo.finalized) {
              // El contrato dice que ya está finalizada, pero nuestro estado local no
              // Marcar como verificado para evitar verificaciones repetidas
              verifiedFinalizedRef.current.add(raceNumber);
              // Limpiar cualquier flag de finalización en progreso
              finalizingRaceRef.current.delete(raceNumber);
              // Forzar actualización inmediata
              console.log(`[Auto-Finalize] Race ${raceNumber} already finalized on-chain but state not updated. Forcing refresh...`);
              // Llamar fetchRaceData inmediatamente y también con un pequeño delay para asegurar actualización
              fetchRaceData();
              return;
            }
          }
        } catch (error) {
          // Si falla la verificación, continuar con el intento de finalización solo si no está en progreso
          console.warn(`[Auto-Finalize] Could not verify finalization status for race ${raceNumber}, proceeding...`);
        }
        
        // Prevenir intentos duplicados (verificar ANTES de intentar)
        if (finalizingRaceRef.current.has(raceNumber)) {
          console.log(`[Auto-Finalize] Race ${raceNumber} already being finalized, skipping...`);
          return;
        }

        // El contrato finaliza automáticamente, solo necesitamos refrescar los datos
        console.log(`[Auto-Finalize] Race ${raceNumber} should be finalized. Refreshing data...`);
        verifiedFinalizedRef.current.add(raceNumber);
        fetchRaceData();
        setTimeout(() => fetchRaceData(), 1500);
      }
    };

    // Ejecutar inmediatamente la primera vez
    checkAndFinalize();
    
    // Verificar cada 10 segundos si hay carreras pendientes de finalizar
    const checkInterval = setInterval(checkAndFinalize, 10000);
    return () => clearInterval(checkInterval);
  }, [provider, raceInfo, raceNumber, fetchRaceData]);

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

  // Timer local suave que se actualiza cada segundo
  // Usa los timestamps guardados del contrato para countdown suave
  useEffect(() => {
    // Función para actualizar timers basado en tiempo actual
    const updateTimers = () => {
      const timestamps = contractTimestampsRef.current;
      if (!timestamps.bettingEndTime && !timestamps.winnerDeterminedTime) {
        // No hay timestamps guardados aún, esperar a que fetchRaceData los establezca
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      
      if (timestamps.bettingEndTime && currentTime < timestamps.bettingEndTime) {
        // Betting phase - countdown regresivo suave
        const remaining = Math.max(0, timestamps.bettingEndTime - currentTime);
        setBettingTimer(remaining);
      } else if (timestamps.winnerDeterminedTime && currentTime < timestamps.winnerDeterminedTime) {
        // Countdown phase (10 seconds after betting closes)
        const remaining = Math.max(0, timestamps.winnerDeterminedTime - currentTime);
        setPreCountdown(remaining);
      } else if (timestamps.claimingStartTime && currentTime < timestamps.claimingStartTime) {
        // Race visual phase (30 seconds to show the race)
        const timeSinceWinnerDetermined = timestamps.winnerDeterminedTime 
          ? currentTime - timestamps.winnerDeterminedTime 
          : 0;
        if (timeSinceWinnerDetermined < 3) {
          setCountdown(Math.max(0, 3 - timeSinceWinnerDetermined));
        } else {
          setCountdown(null);
        }
      }
    };

    // Actualizar inmediatamente
    updateTimers();

    // Actualizar cada segundo para timer suave (countdown regresivo)
    const timerInterval = setInterval(updateTimers, 1000);
    
    return () => clearInterval(timerInterval);
  }, [raceState, raceInfo]); // Depende de raceState y raceInfo para actualizar cuando cambien los timestamps

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

  // Verificar si el usuario es el owner del contrato
  useEffect(() => {
    if (!provider || !account) {
      setIsOwner(false);
      return;
    }

    const checkOwner = async () => {
      try {
        const owner = await getContractOwner(provider);
        setIsOwner(owner?.toLowerCase() === account.toLowerCase());
        
        // Obtener balance del contrato si es owner
        if (owner?.toLowerCase() === account.toLowerCase()) {
          const balance = await getContractBalance(provider);
          setContractBalance(balance);
        }
      } catch (error) {
        console.error('Error checking owner:', error);
        setIsOwner(false);
      }
    };

    checkOwner();
  }, [provider, account]);

  // Función para retirar fondos (owner only)
  const handleWithdraw = useCallback(async () => {
    if (!signer || !isOwner) return;

    try {
      toast.loading('Retirando fondos...', { id: 'withdraw' });
      const result = await withdraw(signer);
      
      if (result.success) {
        toast.success('Fondos retirados exitosamente!', { id: 'withdraw' });
        setShowWithdrawModal(false);
        // Actualizar balance
        if (provider) {
          const balance = await getContractBalance(provider);
          setContractBalance(balance);
        }
      } else {
        toast.error(result.error || 'Error al retirar fondos', { id: 'withdraw' });
      }
    } catch (error: any) {
      console.error('Failed to withdraw:', error);
      toast.error(error.message || 'Error al retirar fondos', { id: 'withdraw' });
    }
  }, [signer, isOwner, provider]);

  // Función para retiro de emergencia (owner only)
  const handleEmergencyWithdraw = useCallback(async () => {
    if (!signer || !isOwner) return;

    if (!confirm('⚠️ ADVERTENCIA: Esto retirará TODOS los fondos del contrato, incluso los asignados a carreras activas. ¿Estás seguro?')) {
      return;
    }

    try {
      toast.loading('Retirando todos los fondos...', { id: 'emergency' });
      const result = await emergencyWithdraw(signer);
      
      if (result.success) {
        toast.success('Fondos de emergencia retirados!', { id: 'emergency' });
        setShowWithdrawModal(false);
        // Actualizar balance
        if (provider) {
          const balance = await getContractBalance(provider);
          setContractBalance(balance);
        }
      } else {
        toast.error(result.error || 'Error al retirar fondos', { id: 'emergency' });
      }
    } catch (error: any) {
      console.error('Failed to emergency withdraw:', error);
      toast.error(error.message || 'Error al retirar fondos', { id: 'emergency' });
    }
  }, [signer, isOwner, provider]);

  const handleRaceEnd = useCallback(async (winnerId: number) => {
    // El ganador ya está determinado en el contrato después del countdown
    // Usar el ganador del contrato si está disponible, sino usar el visual
    const finalWinner = contractWinner || winnerId;
    
    console.log(`[Race ${raceNumber}] Race visual ended. Contract winner: ${contractWinner}, Visual winner: ${winnerId}, Using: ${finalWinner}`);
    
    setRaceState('finished');
    setLastWinner(finalWinner);
    
    // El contrato ya finaliza automáticamente cuando se determina el ganador
    // Solo necesitamos recargar los datos
    setTimeout(() => {
      fetchRaceData();
    }, 2000);
  }, [fetchRaceData, raceNumber, contractWinner]);

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
    if (!signer || !userBet) {
      toast.error('No hay apuesta para reclamar');
      return;
    }

    if (!raceInfo?.finalized) {
      toast.error('La carrera aún no ha sido finalizada');
      return;
    }

    if (userBet.carId !== raceInfo.winner) {
      toast.error('No ganaste esta carrera');
      return;
    }

    if (userBet.claimed) {
      toast.error('Ya reclamaste tus ganancias');
      return;
    }

    try {
      toast.loading('Reclamando ganancias...', { id: 'claim' });
      const result = await claimWinnings(signer, raceNumber);
      
      if (result.success) {
        toast.success('¡Ganancias reclamadas exitosamente!', { id: 'claim' });
        // Recargar datos para actualizar el estado de claimed
        setTimeout(() => {
          fetchRaceData();
          // También actualizar el balance de la wallet
          if (provider) {
            // El balance se actualizará automáticamente por el Web3Provider
          }
        }, 2000);
      } else {
        toast.error(result.error || 'Error al reclamar ganancias', { id: 'claim' });
      }
    } catch (error: any) {
      console.error('Failed to claim winnings:', error);
      const errorMessage = error.reason || error.message || 'Error al reclamar ganancias';
      toast.error(errorMessage, { id: 'claim' });
    }
  }, [signer, userBet, raceNumber, raceInfo, fetchRaceData, provider]);

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

  // Profile modal disabled for now
  // useEffect(() => {
  //   if (isConnected && !isProfileComplete) {
  //     setShowProfileModal(true);
  //   }
  // }, [isConnected, isProfileComplete]);

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
            {isOwner && (
              <>
            <button 
              onClick={() => {
                    setShowWithdrawModal(true);
                setShowMenu(false);
              }}
                  className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 transition-colors hover:bg-[#1a4a2e] text-[#d4a517]"
            >
                  💰 Withdraw Funds
            </button>
          <button 
                  onClick={() => {
                    setShowFinalizeModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 transition-colors hover:bg-[#1a4a2e] text-[#d4a517]"
                >
                  🏁 Finalize Race
          </button>
              </>
            )}
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

          {/* Previous Race Winner Display */}
          {previousRaceInfo && previousRaceInfo.finalized && previousRaceInfo.winner > 0 && raceState === 'betting' && (
            <div className="bg-[#1a4a2e]/50 border border-[#2d6b4a] rounded-xl p-3 text-center">
              <div className="text-[#7cb894] text-xs mb-1">Previous Race #{raceNumber - 1}</div>
              <div className="text-[#22c55e] text-sm font-semibold">Winner: {getCarName(previousRaceInfo.winner)}</div>
            </div>
          )}

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
                  <div className={`${raceInfo?.finalized && userBet.carId === raceInfo.winner && !userBet.claimed ? 'bg-[#d4a517]/20 border-[#d4a517]' : 'bg-[#0d3320] border-[#2d6b4a]'} border-2 rounded-xl p-3 text-center`}>
                    <div className="text-[#7cb894] text-xs mb-1">Your Current Bet</div>
                    <div className="font-bold text-lg text-[#d4a517]">{ethers.formatEther(userBet.amount)} BNB</div>
                    <div className="text-sm">{getCarName(userBet.carId)}</div>
                    {raceInfo?.finalized && userBet.carId === raceInfo.winner && !userBet.claimed && (
                      <>
                        {raceInfo && Number(raceInfo.claimingStartTime) <= Math.floor(Date.now() / 1000) ? (
                          <button
                            onClick={handleClaimWinnings}
                            className="mt-3 w-full bg-[#d4a517] hover:bg-[#b8940f] text-black px-4 py-3 rounded-lg font-bold text-base shadow-lg animate-pulse"
                          >
                            🎉 Claim Winnings
                          </button>
                        ) : (
                          <div className="mt-3 w-full bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b] px-4 py-3 rounded-lg font-bold text-base text-center">
                            ⏳ Wait for race visual to finish
                          </div>
                        )}
                      </>
                    )}
                    {raceInfo?.finalized && userBet.carId === raceInfo.winner && userBet.claimed && (
                      <div className="mt-2 text-[#7cb894] text-sm">✅ Winnings claimed</div>
                    )}
                    {raceInfo?.finalized && userBet.carId !== raceInfo.winner && (
                      <div className="mt-2 text-red-400 text-sm">❌ You lost this race</div>
                    )}
                    {!raceInfo?.finalized && raceState === 'finished' && (
                      <div className="mt-2 text-yellow-400 text-sm">⏳ Race not finalized yet</div>
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

          {/* Winner Display - Visual and Contract */}
          {raceState === 'finished' && (
            <div className="space-y-2">
              {lastWinner && (
                  <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl p-2 text-center">
                  <div className="text-[#d4a517] text-xs">Visual Winner</div>
                  <div className="font-bold">{getCarName(lastWinner)}</div>
                  </div>
              )}
              {raceInfo?.finalized && raceInfo.winner > 0 && (
                <div className="bg-[#22c55e]/20 border-2 border-[#22c55e] rounded-xl p-2 text-center">
                  <div className="text-[#22c55e] text-xs">Contract Winner</div>
                  <div className="font-bold">{getCarName(raceInfo.winner)}</div>
                  {lastWinner && lastWinner !== raceInfo.winner && (
                    <div className="text-red-400 text-xs mt-1">⚠️ Mismatch detected</div>
                  )}
                  {lastWinner && lastWinner === raceInfo.winner && (
                    <div className="text-green-400 text-xs mt-1">✅ Match</div>
                )}
              </div>
            )}
              {raceState === 'finished' && !raceInfo?.finalized && (
                <div className="bg-[#f59e0b]/20 border-2 border-[#f59e0b] rounded-xl p-2 text-center">
                  <div className="text-[#f59e0b] text-xs">Status</div>
                  <div className="text-sm">⏳ Not finalized yet</div>
          </div>
              )}
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
                  {previousRaceInfo && previousRaceInfo.finalized && previousRaceInfo.winner > 0 && (
                    <div className="hidden md:block bg-[#22c55e]/20 border border-[#22c55e] rounded-lg px-2 py-1 text-xs">
                      <span className="text-[#7cb894]">Prev: </span>
                      <span className="text-[#22c55e] font-semibold">{getCarName(previousRaceInfo.winner)}</span>
                    </div>
                  )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {lastWinner && (
                    <div className="bg-[#d4a517]/20 border-2 border-[#d4a517] rounded-xl px-3 md:px-4 py-1 md:py-2">
                      <span className="text-[#d4a517] text-xs md:text-sm font-semibold">Visual: {getCarName(lastWinner)}</span>
                  </div>
                  )}
                  {raceInfo?.finalized && raceInfo.winner > 0 && (
                    <div className={`${lastWinner === raceInfo.winner ? 'bg-[#22c55e]/20 border-[#22c55e]' : 'bg-[#22c55e]/20 border-[#22c55e]'} border-2 rounded-xl px-3 md:px-4 py-1 md:py-2`}>
                      <span className="text-[#22c55e] text-xs md:text-sm font-semibold">Contract: {getCarName(raceInfo.winner)}</span>
                    </div>
                  )}
                  {!raceInfo?.finalized && (
                    <div className="bg-[#f59e0b]/20 border-2 border-[#f59e0b] rounded-xl px-3 md:px-4 py-1 md:py-2">
                      <span className="text-[#f59e0b] text-xs md:text-sm font-semibold">Not finalized</span>
                    </div>
                  )}
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
                preCountdown={preCountdown}
                onRaceEnd={handleRaceEnd}
                raceId={raceNumber}
                raceStartTime={raceInfo ? Number(raceInfo.winnerDeterminedTime) : 0}
                contractWinner={contractWinner}
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
              {/* Contract Winner Display (Mobile) */}
              {raceInfo?.finalized && raceInfo.winner > 0 && (
                <div className="mt-3 pt-3 border-t border-[#2d6b4a]">
                  <div className="text-[#22c55e] text-xs font-medium mb-1">Contract Winner</div>
                  <div className="font-bold text-lg text-[#22c55e]">{getCarName(raceInfo.winner)}</div>
                  {lastWinner && lastWinner !== raceInfo.winner && (
                    <div className="text-red-400 text-xs mt-1">⚠️ Visual: {getCarName(lastWinner)}</div>
                  )}
                  {lastWinner && lastWinner === raceInfo.winner && (
                    <div className="text-green-400 text-xs mt-1">✅ Match</div>
                  )}
                </div>
              )}
            </div>

            {userBet && (
              <div className={`${raceInfo?.finalized && userBet.carId === raceInfo.winner && !userBet.claimed ? 'bg-[#d4a517]/30 border-[#d4a517]' : 'bg-[#d4a517]/20 border-[#d4a517]'} border-2 rounded-xl p-3 mb-3 text-center`}>
                <div className="text-[#d4a517] text-xs">Your Bet</div>
                <div className="font-bold text-lg text-white">{ethers.formatEther(userBet.amount)} BNB on {getCarName(userBet.carId)}</div>
                {raceInfo?.finalized && userBet.carId === raceInfo.winner && !userBet.claimed && (
                  <button
                    onClick={handleClaimWinnings}
                    className="mt-3 w-full bg-[#d4a517] hover:bg-[#b8940f] text-black px-4 py-3 rounded-lg font-bold text-base shadow-lg"
                  >
                    🎉 Claim Winnings
                  </button>
                )}
                {raceInfo?.finalized && userBet.carId === raceInfo.winner && userBet.claimed && (
                  <div className="mt-2 text-[#7cb894] text-sm">✅ Winnings claimed</div>
                )}
                {raceInfo?.finalized && userBet.carId !== raceInfo.winner && (
                  <div className="mt-2 text-red-400 text-sm">❌ You lost this race</div>
                )}
                {!raceInfo?.finalized && raceState === 'finished' && (
                  <div className="mt-2 text-yellow-400 text-sm">⏳ Race not finalized yet</div>
                )}
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

      {/* Finalize Race Modal (Owner Only) */}
      {showFinalizeModal && isOwner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowFinalizeModal(false)}>
          <div 
            className="bg-[#1a4a2e] border-2 border-[#d4a517] rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">Finalize Race</h3>
              <button 
                onClick={() => setShowFinalizeModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-[#7cb894] text-sm mb-2">Race ID</label>
              <input
                type="number"
                value={finalizeRaceId}
                onChange={(e) => setFinalizeRaceId(e.target.value)}
                placeholder="Enter race ID (e.g., 0, 1, 2...)"
                className="w-full p-2 rounded-lg bg-[#0d3320] border border-[#2d6b4a] text-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[#7cb894] text-sm mb-2">Winner (Car ID: 1-4)</label>
              <input
                type="number"
                min="1"
                max="4"
                value={finalizeWinner}
                onChange={(e) => setFinalizeWinner(parseInt(e.target.value) || 1)}
                className="w-full p-2 rounded-lg bg-[#0d3320] border border-[#2d6b4a] text-white"
              />
            </div>

            <button
              onClick={async () => {
                if (!finalizeRaceId || !finalizeWinner || finalizeWinner < 1 || finalizeWinner > 4) {
                  toast.error('Please enter valid race ID and winner (1-4)');
                  return;
                }
                try {
                  toast.loading('Finalizing race...', { id: 'finalize' });
                  const response = await fetch('/api/race/finalize', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
                    },
                    body: JSON.stringify({
                      raceId: parseInt(finalizeRaceId),
                      winner: finalizeWinner,
                    }),
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast.success(`Race ${finalizeRaceId} finalized! Winner: Car ${finalizeWinner}`, { id: 'finalize' });
                    setShowFinalizeModal(false);
                    setFinalizeRaceId('');
                    setFinalizeWinner(1);
                    setTimeout(() => fetchRaceData(), 2000);
                  } else {
                    toast.error(result.error || 'Error finalizing race', { id: 'finalize' });
                  }
                } catch (error: any) {
                  toast.error(error.message || 'Error finalizing race', { id: 'finalize' });
                }
              }}
              className="w-full bg-[#d4a517] hover:bg-[#b8920f] text-black px-4 py-3 rounded-lg font-bold"
            >
              Finalize Race
            </button>

            <div className="mt-4 text-xs text-[#7cb894]">
              <p>⚠️ Only finalize races that have already ended</p>
              <p>This will distribute winnings and move loser funds to next race</p>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal (Owner Only) */}
      {showWithdrawModal && isOwner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <div 
            className="bg-[#1a4a2e] border-2 border-[#d4a517] rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">Withdraw Funds</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-[#7cb894] text-sm mb-2">Contract Balance</div>
              <div className="text-white font-bold text-2xl">
                {ethers.formatEther(contractBalance)} BNB
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleWithdraw}
                disabled={contractBalance === BigInt(0)}
                className={`
                  w-full py-3 px-4 rounded-lg font-bold text-white transition-all
                  ${contractBalance > BigInt(0)
                    ? 'bg-[#d4a517] hover:bg-[#b8920f] text-black'
                    : 'bg-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Withdraw Available Funds
              </button>
              
              <button
                onClick={handleEmergencyWithdraw}
                disabled={contractBalance === BigInt(0)}
                className={`
                  w-full py-3 px-4 rounded-lg font-bold transition-all
                  ${contractBalance > BigInt(0)
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-500 cursor-not-allowed text-white'
                  }
                `}
              >
                ⚠️ Emergency Withdraw (All Funds)
              </button>
            </div>

            <div className="mt-4 text-xs text-[#7cb894]">
              <p>• Normal withdraw only withdraws funds not assigned to active races</p>
              <p>• Emergency withdraw withdraws ALL funds (use with caution)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
