'use client';

import { useState, useEffect, useRef } from 'react';
import RaceTrack from '../components/Race/RaceTrack';

type RaceState = 'betting' | 'countdown' | 'racing' | 'finished';

// Tiempos: 2 min apuestas, 10 seg countdown, 30 seg carrera visual
const BETTING_TIME = 120; // 2 minutos
const COUNTDOWN_DURATION = 10; // 10 segundos countdown después de cerrar apuestas
const RACE_VISUAL_DURATION = 30; // 30 segundos para mostrar la carrera visual

export default function RacePage() {
  const [raceState, setRaceState] = useState<RaceState>('betting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raceNumber, setRaceNumber] = useState(0);
  const [raceWinner, setRaceWinner] = useState<number | null>(null);
  const [raceStartTime, setRaceStartTime] = useState<number>(0);
  const [bettingTimer, setBettingTimer] = useState(BETTING_TIME);
  
  const bettingStartTimeRef = useRef<number>(0);
  const raceSeedRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para generar un seed determinístico basado en el timestamp de inicio de betting
  const generateRaceSeed = (startTime: number): number => {
    // Usar el timestamp redondeado al minuto para que todos los usuarios tengan el mismo seed
    const roundedTime = Math.floor(startTime / 60) * 60;
    return (roundedTime * 7919) >>> 0; // Convertir a 32-bit unsigned integer
  };

  // Función para elegir ganador aleatorio determinístico
  const determineWinner = (seed: number): number => {
    // Mulberry32 PRNG simple
    let state = seed;
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    const random = ((t ^ t >>> 14) >>> 0) / 4294967296;
    
    // Elegir ganador entre 1-4
    return Math.floor(random * 4) + 1;
  };

  // Iniciar nueva carrera
  const startNewRace = () => {
    const now = Date.now() / 1000;
    bettingStartTimeRef.current = now;
    setRaceState('betting');
    setBettingTimer(BETTING_TIME);
    setCountdown(null);
    setRaceWinner(null);
    setRaceStartTime(0);
    
    // Generar seed determinístico
    const seed = generateRaceSeed(now);
    raceSeedRef.current = seed;
    
    console.log(`[Race ${raceNumber}] Starting new race with seed: ${seed}`);
  };

  // Efecto para manejar los timers
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now() / 1000;
      const elapsed = now - bettingStartTimeRef.current;

      if (raceState === 'betting') {
        const remaining = Math.max(0, BETTING_TIME - elapsed);
        setBettingTimer(Math.ceil(remaining));

        if (remaining <= 0) {
          // Betting terminó, empezar countdown
          const seed = raceSeedRef.current;
          const winner = determineWinner(seed);
          setRaceWinner(winner);
          setRaceState('countdown');
          setCountdown(COUNTDOWN_DURATION);
          setRaceStartTime(now);
          console.log(`[Race ${raceNumber}] Betting ended. Winner determined: Car ${winner} (seed: ${seed})`);
        }
      } else if (raceState === 'countdown') {
        const countdownElapsed = now - (bettingStartTimeRef.current + BETTING_TIME);
        const remaining = Math.max(0, COUNTDOWN_DURATION - countdownElapsed);
        setCountdown(Math.ceil(remaining));

        if (remaining <= 0) {
          // Countdown terminó, empezar carrera
          setRaceState('racing');
          setCountdown(null);
          console.log(`[Race ${raceNumber}] Countdown ended. Starting race with winner: Car ${raceWinner}`);
        }
      } else if (raceState === 'racing') {
        const raceElapsed = now - (bettingStartTimeRef.current + BETTING_TIME + COUNTDOWN_DURATION);
        if (raceElapsed >= RACE_VISUAL_DURATION) {
          // Carrera terminó
          setRaceState('finished');
          console.log(`[Race ${raceNumber}] Race finished. Winner: Car ${raceWinner}`);
        }
      } else if (raceState === 'finished') {
        // Esperar 5 segundos antes de empezar nueva carrera
        const finishedElapsed = now - (bettingStartTimeRef.current + BETTING_TIME + COUNTDOWN_DURATION + RACE_VISUAL_DURATION);
        if (finishedElapsed >= 5) {
          setRaceNumber(prev => prev + 1);
          startNewRace();
        }
      }
    }, 100); // Actualizar cada 100ms para suavidad

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [raceState, raceNumber, raceWinner]);

  // Iniciar primera carrera al montar
  useEffect(() => {
    startNewRace();
  }, []);

  // Reiniciar cuando cambia el número de carrera
  useEffect(() => {
    startNewRace();
  }, [raceNumber]);

  const handleRaceEnd = (winner: number) => {
    console.log(`[Race ${raceNumber}] Race visual ended. Winner: Car ${winner}`);
    // El estado ya se maneja en el intervalo
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FlapRace</h1>
          <div className="text-lg text-gray-300">
            Race #{raceNumber}
            {raceState === 'betting' && (
              <span className="ml-4">Betting: {bettingTimer}s remaining</span>
            )}
            {raceState === 'countdown' && countdown !== null && (
              <span className="ml-4">Starting in: {countdown}s</span>
            )}
            {raceState === 'racing' && raceWinner && (
              <span className="ml-4">🏁 Race in progress - Winner: Car {raceWinner}</span>
            )}
            {raceState === 'finished' && raceWinner && (
              <span className="ml-4">🏆 Race finished - Winner: Car {raceWinner}</span>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          {raceState !== 'betting' && (
            <RaceTrack
              raceState={raceState === 'countdown' ? 'countdown' : raceState === 'racing' ? 'racing' : 'finished'}
              countdown={countdown}
              onRaceEnd={handleRaceEnd}
              raceId={raceNumber}
              raceStartTime={raceStartTime}
              raceSeed={raceSeedRef.current}
              raceWinner={raceWinner}
            />
          )}
        </div>
      </div>
    </div>
  );
}
