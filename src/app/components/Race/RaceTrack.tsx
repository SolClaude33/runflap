'use client';

import { useState, useEffect, useRef } from 'react';
import Confetti from './Confetti';
import Commentator from './Commentator';
import { useSoundManager } from './SoundManager';
import WinnerCelebration from './WinnerCelebration';

interface Racer {
  id: number;
  name: string;
  image: string;
  color: string;
  carColor: string;
  distance: number;
  lap: number;
  baseSpeed: number;
  currentSpeed: number;
  targetSpeed: number;
  lastSpeedChange: number;
  finished: boolean;
  finishTime: number | null;
  prevAngle: number;
}

const TOTAL_LAPS = 5;

interface RaceTrackProps {
  raceState: 'betting' | 'pre_countdown' | 'countdown' | 'racing' | 'finished';
  countdown: number | null;
  onRaceEnd: (winner: number) => void;
  raceId: number; // ID de la carrera para seed determinístico
  raceStartTime: number; // Timestamp del contrato cuando empieza la carrera (Unix timestamp)
  raceSeed: { raceId: number; bettingEndTime: number; totalBets: number; blockHash: string } | null; // Datos para generar seed impredecible
}

// Professional F1/NASCAR hybrid oval track - clean racing circuit
// Features: Smooth banked turns, wide straights, perfect for racing
const RACE_PATH = "M 300,480 L 700,480 C 880,480 880,340 880,340 C 880,200 880,200 700,200 L 260,200 C 80,200 80,340 80,340 C 80,480 80,480 260,480 L 300,480 Z";

// Mulberry32 PRNG - deterministic and fast
const createPRNG = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const createInitialRacers = (seed: number = 0): Racer[] => {
  return [
    { id: 1, name: 'Pepe', image: '/race/racer1.png', color: '#4ade80', carColor: '#22c55e' },
    { id: 2, name: 'Alon', image: '/race/racer2.png', color: '#fbbf24', carColor: '#f59e0b' },
    { id: 3, name: 'Cupsey', image: '/race/racer3.png', color: '#34d399', carColor: '#10b981' },
    { id: 4, name: 'Wojack', image: '/race/racer4.png', color: '#e5e5e5', carColor: '#a3a3a3' },
  ].map((r) => {
    // Base speed calculated to complete 5 laps in ~30 seconds
    // Circuit length ~1966 units: 5 laps = 9830 units / 30s = ~328 units/sec average
    // Using higher base speed (450) to ensure race completes in time with variations
    const baseSpeed = 450; // Increased from 400 to ensure race completes
    return {
      ...r,
      distance: 0,
      lap: 1,
      baseSpeed,
      currentSpeed: baseSpeed,
      targetSpeed: baseSpeed,
      lastSpeedChange: 0,
      finished: false,
      finishTime: null,
      prevAngle: 0
    };
  });
};

export default function RaceTrack({ raceState, countdown, onRaceEnd, raceId, raceStartTime, raceSeed }: RaceTrackProps) {
  const [racers, setRacers] = useState<Racer[]>(createInitialRacers());
  const [winner, setWinner] = useState<Racer | null>(null);
  const [totalLength, setTotalLength] = useState<number>(0);
  const [racersReady, setRacersReady] = useState(false);
  const [displaySeed, setDisplaySeed] = useState<string>('');
  const [showTransparency, setShowTransparency] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const raceTimeRef = useRef<number>(0);
  const winnerFoundRef = useRef<boolean>(false);
  const racersRef = useRef<Racer[]>(createInitialRacers());
  const pathRef = useRef<SVGPathElement | null>(null);
  const seedRef = useRef<number>(0);
  const rngRef = useRef<() => number>(() => Math.random());
  const tickCounterRef = useRef<number>(0);
  
  const soundManager = useSoundManager();

  // Calcular tiempo estimado para 5 vueltas
  const calculateEstimatedRaceTime = (circuitLength: number): number => {
    if (circuitLength === 0) return 0;
    const TOTAL_DISTANCE = circuitLength * TOTAL_LAPS;
    const AVG_SPEED = 400; // Velocidad promedio entre min (350) y max (550)
    return TOTAL_DISTANCE / AVG_SPEED;
  };

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setTotalLength(length);
      // Log para debugging
      const estimatedTime = calculateEstimatedRaceTime(length);
      console.log(`[RaceTrack] Circuit length: ${length.toFixed(2)} units`);
      console.log(`[RaceTrack] Estimated time for ${TOTAL_LAPS} laps: ${estimatedTime.toFixed(2)}s`);
    }
  }, []);

  // Improved position and angle calculation with smoothing
  const getPositionAndAngle = (distance: number, laneOffset: number = 0, prevAngle: number = 0): { x: number; y: number; angle: number } => {
    if (!pathRef.current || totalLength === 0) {
      return { x: 300, y: 480, angle: 0 };
    }

    const normalizedDist = ((distance % totalLength) + totalLength) % totalLength;
    const point = pathRef.current.getPointAtLength(normalizedDist);
    
    // Use scaled delta for better tangent calculation (0.15% of total length)
    const delta = Math.max(1, Math.min(4, totalLength * 0.0015));
    const pointAhead = pathRef.current.getPointAtLength((normalizedDist + delta) % totalLength);
    
    const dx = pointAhead.x - point.x;
    const dy = pointAhead.y - point.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    let nx = 0, ny = 0;
    let targetAngle = prevAngle;
    
    if (len > 0.001) {
      nx = -dy / len;
      ny = dx / len;
      targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    }
    
    // Smooth angle interpolation to prevent jitter
    let angleDiff = targetAngle - prevAngle;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    const smoothedAngle = prevAngle + angleDiff * 0.12;
    
    // Apply lane offset using normal vector
    const laneOffsetPx = laneOffset * 16;
    
    return {
      x: point.x + nx * laneOffsetPx,
      y: point.y + ny * laneOffsetPx,
      angle: smoothedAngle
    };
  };

  useEffect(() => {
    // Initialize racers even if raceSeed is null (use fallback seed)
    if ((raceState === 'countdown' || raceState === 'racing') && totalLength > 0 && !racersReady && raceId >= 0) {
      // Generar seed impredecible combinando múltiples factores:
      // 1. raceId (para sincronización)
      // 2. bettingEndTime (timestamp cuando se cerraron apuestas)
      // 3. blockHash (hash del bloque cuando se cerraron apuestas - impredecible)
      // 4. totalBets (cantidad de apuestas, impredecible antes de cerrar)
      // Esto hace que sea prácticamente imposible predecir el resultado antes de que se cierren las apuestas
      
      // CRITICAL: Calculate seed deterministically for all clients
      // Convert blockHash to number using a more robust method
      let blockHashValue = 0;
      if (raceSeed && raceSeed.blockHash) {
        const hashString = raceSeed.blockHash.slice(2); // Remover '0x'
        // Use first 16 characters (8 bytes) for consistency
        const seedString = hashString.slice(0, 16);
        // Use BigInt for precision, then convert to Number
        // This ensures exact same conversion for all clients
        try {
          blockHashValue = Number(BigInt('0x' + seedString) & BigInt(0xFFFFFFFF));
        } catch {
          // Fallback to parseInt if BigInt fails
          blockHashValue = parseInt(seedString, 16) & 0xFFFFFFFF;
        }
      }
      
      // CRITICAL: Combine factors in exact same order for all clients
      // Use XOR which is commutative and associative, ensuring same result
      // Order: raceId, bettingEndTime, blockHashValue, totalBets
      const seed = raceSeed 
        ? (raceSeed.raceId ^ raceSeed.bettingEndTime ^ blockHashValue ^ raceSeed.totalBets)
        : (raceId ^ Math.floor(Date.now() / 1000));
      
      // CRITICAL: Ensure seed is a 32-bit integer for consistent PRNG
      const normalizedSeed = (seed >>> 0); // Convert to unsigned 32-bit integer
      seedRef.current = normalizedSeed;
      rngRef.current = createPRNG(normalizedSeed);
      tickCounterRef.current = 0;
      setDisplaySeed(`${normalizedSeed.toString(36).toUpperCase()}`);
      const resetRacers = createInitialRacers(seed);
      setRacers(resetRacers);
      racersRef.current = resetRacers;
      setWinner(null);
      winnerFoundRef.current = false;
      
      // CRITICAL: Calculate initial race time from contract
      // This ensures all clients start from the same point
      const now = Math.floor(Date.now() / 1000);
      const actualRaceStartTime = raceStartTime > 0 ? raceStartTime : now;
      const initialContractRaceTime = Math.max(0, now - actualRaceStartTime);
      raceTimeRef.current = initialContractRaceTime;
      
      // CRITICAL: Pre-consume RNG to sync with current contract time
      // This ensures clients connecting late are synchronized
      const initialTimeBasedTick = Math.floor(initialContractRaceTime * 10); // 10 ticks per second
      // Pre-consume RNG for all ticks that have already passed
      // This makes the RNG state identical for all clients regardless of when they connected
      // Limit pre-consumption to prevent performance issues (max 300 ticks = 30 seconds)
      const maxPreConsume = Math.min(initialTimeBasedTick, 300);
      for (let i = 0; i < maxPreConsume; i++) {
        rngRef.current(); // Consume RNG without using the value
      }
      tickCounterRef.current = maxPreConsume;
      
      setRacersReady(true);
    }
  }, [raceState, totalLength, racersReady, raceId, raceSeed, raceStartTime]);

  useEffect(() => {
    if (raceState === 'betting' || raceState === 'finished') {
      setRacersReady(false);
    }
  }, [raceState]);

  // Sound effects for countdown
  useEffect(() => {
    if (raceState === 'countdown' && countdown !== null) {
      if (countdown > 0) {
        soundManager.playCountdown(countdown);
      } else if (countdown === 0) {
        soundManager.playGo();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState, countdown]);

  // Engine sound during racing
  useEffect(() => {
    if (raceState === 'racing') {
      soundManager.playEngine();
    } else {
      soundManager.stopEngine();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState]);

  // Victory effects
  useEffect(() => {
    if (raceState === 'finished' && winner) {
      soundManager.playVictory();
      setShowConfetti(true);
      setShowCelebration(true);
      const timeout = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timeout);
    } else {
      setShowConfetti(false);
      setShowCelebration(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState, winner]);

  useEffect(() => {
    // Allow animation to start even if raceStartTime is 0 (use current time as fallback)
    if (raceState !== 'racing' || totalLength === 0 || !racersReady) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    if (animationRef.current) {
      return;
    }

    lastTimeRef.current = performance.now();
    winnerFoundRef.current = false;

    const animate = (currentTime: number) => {
      if (winnerFoundRef.current) return;

      // CRITICAL: Use contract time as absolute source of truth for synchronization
      // This ensures all clients see the same race progression
      const now = Math.floor(Date.now() / 1000);
      const actualRaceStartTime = raceStartTime > 0 ? raceStartTime : now;
      const contractRaceTime = Math.max(0, now - actualRaceStartTime);
      
      // Use contract time directly - this is the synchronized time for all clients
      const previousRaceTime = raceTimeRef.current;
      
      // CRITICAL: If client is far behind (e.g., just connected), catch up quickly
      // But limit catch-up to prevent huge jumps that look unnatural
      const timeDiff = contractRaceTime - previousRaceTime;
      let deltaTime: number;
      
      if (timeDiff > 1.0) {
        // Client is more than 1 second behind - catch up in larger steps
        // This happens when client connects late to an ongoing race
        deltaTime = Math.min(timeDiff, 0.5); // Max 0.5s per frame for catch-up
        raceTimeRef.current = previousRaceTime + deltaTime;
      } else {
        // Normal operation - use smooth frame-based deltaTime
        // Use actual frame time for smooth animation, but sync with contract time
        const frameDelta = (currentTime - lastTimeRef.current) / 1000;
        deltaTime = Math.min(frameDelta, 0.033); // Cap at ~30fps minimum
        raceTimeRef.current = contractRaceTime; // Sync to contract time
      }
      
      lastTimeRef.current = currentTime;
      
      // CRITICAL: Consume RNG based on synchronized contract time, not frame count
      // Use time-based ticks (every 0.1 seconds) instead of frame-based ticks
      // This ensures all clients consume RNG at the same rate regardless of FPS
      // CRITICAL: Use Math.floor to ensure exact same tick calculation for all clients
      const timeBasedTick = Math.floor(contractRaceTime * 10); // 10 ticks per second
      
      // CRITICAL: If we're behind on RNG consumption (e.g., client connected late),
      // catch up by consuming RNG for all missed ticks
      // This ensures all clients have the same RNG state at any given contract time
      // IMPORTANT: Always consume RNG in the same order, even if we're catching up
      while (tickCounterRef.current < timeBasedTick) {
        rngRef.current(); // Consume RNG to catch up - MUST be in exact same order
        tickCounterRef.current++;
      }
      
      // CRITICAL: Use the synchronized tick, not a local counter
      const tick = timeBasedTick;
      const rng = rngRef.current;

      const currentRacers = racersRef.current;
      let raceWinner: Racer | null = null;

      // Constants
      const RACE_DURATION_SECONDS = 30;

      // Calculate all racers' total distances for position sorting
      // Sort by total distance DESCENDING (highest distance = winner)
      const racerDistances = currentRacers.map(r => ({
        id: r.id,
        totalDist: (r.lap - 1) * totalLength + r.distance
      })).sort((a, b) => b.totalDist - a.totalDist);
      
      const leaderDist = racerDistances[0].totalDist;
      const lastPlaceDist = racerDistances[3].totalDist;

      const updated = currentRacers.map((racer, index) => {
        if (racer.finished) return racer;

        let newTargetSpeed = racer.targetSpeed;
        let newLastSpeedChange = racer.lastSpeedChange;
        const racerTotalDist = (racer.lap - 1) * totalLength + racer.distance;
        const position = racerDistances.findIndex(r => r.id === racer.id) + 1;
        
        // Speed changes every 0.3 seconds (3 ticks at 10 ticks/second)
        // Use time-based ticks for synchronization across all clients
        if (tick % 3 === index) {
          // Base variation: ±25% for more dramatic racing (was ±12%)
          const variation = 0.75 + rng() * 0.50;
          newTargetSpeed = racer.baseSpeed * variation;
          
          // DRAMATIC EVENTS (15% chance each tick cycle, was 8%)
          const eventRoll = rng();
          
          if (eventRoll < 0.075) {
            // SURGE! Random racer gets massive boost (increased from 1.20 to 1.35)
            newTargetSpeed *= 1.35;
          } else if (eventRoll < 0.15) {
            // STUMBLE! Random slowdown (increased from 0.80 to 0.70)
            newTargetSpeed *= 0.70;
          }
          
          // Reduced rubber-banding: trailing racers get smaller boost
          // CRITICAL: Disable rubber-banding in final 5 seconds to increase separation at finish
          const distanceBehind = leaderDist - racerTotalDist;
          const timeRemaining = RACE_DURATION_SECONDS - contractRaceTime;
          const isFinalSeconds = timeRemaining <= 5;
          
          if (distanceBehind > 0 && position > 1 && !isFinalSeconds) {
            // Smaller boost for those further behind (only if not in final seconds)
            const catchUpBoost = Math.min(0.06, (distanceBehind / totalLength) * 0.10);
            newTargetSpeed *= (1 + catchUpBoost);
          }
          
          // In final seconds, reduce rubber-banding even more to create clear separation
          if (isFinalSeconds && position > 1) {
            // Minimal catch-up in final seconds (only 2% max)
            const minimalCatchUp = Math.min(0.02, (distanceBehind / totalLength) * 0.05);
            newTargetSpeed *= (1 + minimalCatchUp);
          }
          
          // Leader penalty: more drag when too far ahead (increased from 0.94 to 0.90)
          if (position === 1 && (leaderDist - lastPlaceDist) > totalLength * 0.15) {
            newTargetSpeed *= 0.90;
          }
          
          // Drama moments at key race points
          const raceProgress = (racer.lap - 1 + racer.distance / totalLength) / TOTAL_LAPS;
          
          // Final lap surge for non-leaders (increased from 1.10 to 1.15)
          if (racer.lap === TOTAL_LAPS && position > 1) {
            newTargetSpeed *= 1.15 + rng() * 0.10;
          }
          
          // Mid-race shakeup (more dramatic)
          if (raceProgress > 0.45 && raceProgress < 0.55) {
            newTargetSpeed *= 0.85 + rng() * 0.30;
          }
          
          // Clamp speeds - wider range for 30-second race (was 350-550, now 300-650)
          newTargetSpeed = Math.max(300, Math.min(650, newTargetSpeed));
          newLastSpeedChange = raceTimeRef.current;
        }
        
        // Smooth speed interpolation for natural acceleration/deceleration
        const speedLerp = 0.20; // Slightly faster interpolation
        const newSpeed = racer.currentSpeed + (newTargetSpeed - racer.currentSpeed) * speedLerp;
        
        // Calculate distance traveled this frame
        // Speed is in units per second, deltaTime is in seconds
        // Adjust speed based on race progress to ensure race completes in ~30 seconds
        const raceProgress = contractRaceTime / RACE_DURATION_SECONDS;
        const totalDistanceNeeded = totalLength * TOTAL_LAPS;
        const distanceRemaining = totalDistanceNeeded - racerTotalDist;
        const timeRemaining = Math.max(0.1, RACE_DURATION_SECONDS - contractRaceTime);
        
        // Dynamic speed adjustment to ensure race completes in time
        // In final seconds, reduce speed adjustment to allow natural separation
        const isFinalSeconds = timeRemaining <= 5;
        let adjustedSpeed = newSpeed;
        if (timeRemaining > 0 && distanceRemaining > 0 && !isFinalSeconds) {
          const requiredSpeed = distanceRemaining / timeRemaining;
          // Blend between current speed and required speed (70% current, 30% required)
          // Increased required speed influence to ensure race completes in time
          adjustedSpeed = newSpeed * 0.70 + requiredSpeed * 0.30;
          // Clamp to reasonable range (wider range)
          adjustedSpeed = Math.max(350, Math.min(700, adjustedSpeed));
        } else if (isFinalSeconds) {
          // In final seconds, use natural speed with minimal adjustment to create clear separation
          adjustedSpeed = newSpeed;
        }
        
        let newDistance = racer.distance + adjustedSpeed * deltaTime;
        let newLap = racer.lap;
        
        // Check for lap completion
        if (newDistance >= totalLength) {
          newLap = racer.lap + 1;
          newDistance = newDistance - totalLength;
          
          // Check for race finish - racer completes TOTAL_LAPS
          if (newLap > TOTAL_LAPS && !winnerFoundRef.current) {
            winnerFoundRef.current = true;
            raceWinner = {
              ...racer,
              distance: totalLength, // Set to finish line
              lap: TOTAL_LAPS,
              finished: true,
              finishTime: raceTimeRef.current,
            };
            return raceWinner;
          }
        }
        
        // Also check if racer is on final lap and crosses finish line
        // IMPORTANT: Check BEFORE updating distance to catch the exact moment of crossing
        if (racer.lap === TOTAL_LAPS && racer.distance < totalLength && newDistance >= totalLength && !winnerFoundRef.current) {
          winnerFoundRef.current = true;
          raceWinner = {
            ...racer,
            distance: totalLength,
            lap: TOTAL_LAPS,
            finished: true,
            finishTime: raceTimeRef.current,
          };
          return raceWinner;
        }

        // Calculate new angle for this frame
        const laneOffset = (index - 1.5);
        const posData = getPositionAndAngle(newDistance, laneOffset, racer.prevAngle);

        return { 
          ...racer, 
          distance: newDistance,
          lap: newLap,
          currentSpeed: newSpeed,
          targetSpeed: newTargetSpeed,
          lastSpeedChange: newLastSpeedChange,
          prevAngle: posData.angle
        };
      });

      racersRef.current = updated;
      setRacers([...updated]);

      // Check for winner after updating positions
      if (raceWinner) {
        // Stop animation immediately
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Set winner and trigger celebration
        setWinner(raceWinner);
        setShowConfetti(true);
        setShowCelebration(true);
        
        // Call onRaceEnd to update parent component
        onRaceEnd(raceWinner.id);
        
        console.log(`🏁 Race finished! Winner: ${raceWinner.name} (Car ${raceWinner.id})`);
        return;
      }

      // Check if race time exceeded and determine winner by current position
      // Use contractRaceTime (synchronized) instead of raceTimeRef
      if (contractRaceTime >= RACE_DURATION_SECONDS && !winnerFoundRef.current) {
        // Calculate current positions after update
        const currentRacerDistances = updated.map(r => ({
          id: r.id,
          totalDist: (r.lap - 1) * totalLength + r.distance
        })).sort((a, b) => b.totalDist - a.totalDist);
        
        if (currentRacerDistances.length > 0) {
          const winnerId = currentRacerDistances[0].id; // Highest distance = winner
          const winnerRacer = updated.find(r => r.id === winnerId);
          if (winnerRacer) {
            winnerFoundRef.current = true;
            const raceWinner = {
              ...winnerRacer,
              distance: Math.min(winnerRacer.distance, totalLength),
              lap: Math.min(winnerRacer.lap, TOTAL_LAPS),
              finished: true,
              finishTime: raceTimeRef.current,
            };
            setWinner(raceWinner);
            setShowConfetti(true);
            setShowCelebration(true);
            onRaceEnd(raceWinner.id);
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            return;
          }
        }
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState, onRaceEnd, totalLength, racersReady]);

  const CarSprite = ({ racer, x, y, angle }: { racer: Racer; x: number; y: number; angle: number }) => (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      {/* Car shadow */}
      <ellipse cx="3" cy="6" rx="24" ry="12" fill="rgba(0,0,0,0.4)" />
      
      {/* Main body - sleek racing shape */}
      <path 
        d="M -22,0 L -18,-10 L 8,-10 L 18,-6 L 22,0 L 18,6 L 8,10 L -18,10 Z" 
        fill={racer.carColor}
      />
      
      {/* Body highlights */}
      <path 
        d="M -20,-2 L -16,-8 L 6,-8 L 14,-5 L 16,-2 Z" 
        fill="white" 
        opacity="0.25"
      />
      
      {/* Cockpit/cabin */}
      <ellipse cx="-2" cy="0" rx="8" ry="6" fill="#1a1a1a" />
      <ellipse cx="-2" cy="-1" rx="6" ry="4" fill="#2d4a6a" opacity="0.8" />
      <ellipse cx="-3" cy="-2" rx="3" ry="2" fill="#87CEEB" opacity="0.6" />
      
      {/* Racing stripes */}
      <rect x="-18" y="-2" width="36" height="4" fill="white" opacity="0.15" />
      
      {/* Front nose detail */}
      <ellipse cx="-20" cy="0" rx="3" ry="5" fill={racer.carColor} />
      <rect x="-23" y="-2" width="4" height="4" rx="1" fill="#333" />
      
      {/* Rear wing/spoiler */}
      <rect x="18" y="-8" width="4" height="16" rx="1" fill="#1a1a1a" />
      <rect x="20" y="-10" width="3" height="20" rx="1" fill={racer.carColor} />
      
      {/* Wheels with detail */}
      <g>
        {/* Front left */}
        <ellipse cx="-12" cy="-10" rx="5" ry="4" fill="#1a1a1a" />
        <ellipse cx="-12" cy="-10" rx="3" ry="2.5" fill="#444" />
        <ellipse cx="-12" cy="-10" rx="1.5" ry="1" fill="#666" />
        {/* Front right */}
        <ellipse cx="-12" cy="10" rx="5" ry="4" fill="#1a1a1a" />
        <ellipse cx="-12" cy="10" rx="3" ry="2.5" fill="#444" />
        <ellipse cx="-12" cy="10" rx="1.5" ry="1" fill="#666" />
        {/* Rear left */}
        <ellipse cx="10" cy="-10" rx="6" ry="4.5" fill="#1a1a1a" />
        <ellipse cx="10" cy="-10" rx="4" ry="3" fill="#444" />
        <ellipse cx="10" cy="-10" rx="2" ry="1.2" fill="#666" />
        {/* Rear right */}
        <ellipse cx="10" cy="10" rx="6" ry="4.5" fill="#1a1a1a" />
        <ellipse cx="10" cy="10" rx="4" ry="3" fill="#444" />
        <ellipse cx="10" cy="10" rx="2" ry="1.2" fill="#666" />
      </g>
      
      {/* Exhaust flames (subtle glow) */}
      <ellipse cx="24" cy="0" rx="4" ry="2" fill="#ff6b35" opacity="0.6" />
      <ellipse cx="25" cy="0" rx="2" ry="1" fill="#ffdd00" opacity="0.8" />
    </g>
  );

  const RacerAvatar = ({ racer, x, y, position }: { racer: Racer; x: number; y: number; position: number }) => (
    <g transform={`translate(${x}, ${y - 38})`}>
      <circle r="18" fill={racer.color} stroke="white" strokeWidth="2" />
      <image
        href={racer.image}
        x="-14"
        y="-16"
        width="28"
        height="32"
        preserveAspectRatio="xMidYMid meet"
        clipPath="inset(0 round 50%)"
      />
      <circle r="18" fill="none" stroke="white" strokeWidth="2" />
      {/* Position number badge */}
      <g transform="translate(14, -14)">
        <circle r="10" fill={position === 1 ? '#d4a517' : position === 2 ? '#c0c0c0' : position === 3 ? '#cd7f32' : '#4a4a4a'} stroke="white" strokeWidth="1.5"/>
        <path 
          d={position === 1 ? "M0,-4 L0,4" : position === 2 ? "M-3,-4 L3,-4 L-3,4 L3,4" : position === 3 ? "M-3,-4 L3,-4 M0,-4 L0,4 M-3,4 L3,4" : "M-3,-4 L3,4 M3,-4 L-3,4"}
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
      </g>
    </g>
  );

  // Calculate positions based on total distance covered
  const getPositions = () => {
    return [...racers]
      .map(r => ({ ...r, totalDistance: (r.lap - 1) * totalLength + r.distance }))
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .map((r, i) => ({ id: r.id, position: i + 1 }));
  };

  const positions = getPositions();

  return (
    <div className="relative w-full h-full bg-[#0a2818] rounded-xl overflow-hidden">
      <svg 
        viewBox="0 0 960 600" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Sky/ambient gradient background */}
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1628"/>
            <stop offset="50%" stopColor="#0d3320"/>
            <stop offset="100%" stopColor="#0a2818"/>
          </linearGradient>
          
          {/* Grass with realistic texture feel */}
          <radialGradient id="grassGradient" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#1e6b3f"/>
            <stop offset="40%" stopColor="#1a5a35"/>
            <stop offset="70%" stopColor="#134428"/>
            <stop offset="100%" stopColor="#0a2818"/>
          </radialGradient>
          
          {/* Track shadow - deeper and more realistic */}
          <filter id="trackShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="15" floodColor="#000000" floodOpacity="0.6"/>
          </filter>

          {/* Asphalt with realistic dark texture */}
          <linearGradient id="asphaltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d2d2d"/>
            <stop offset="25%" stopColor="#252525"/>
            <stop offset="50%" stopColor="#1f1f1f"/>
            <stop offset="75%" stopColor="#252525"/>
            <stop offset="100%" stopColor="#2a2a2a"/>
          </linearGradient>

          {/* Track surface with subtle shine */}
          <linearGradient id="trackSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#404040"/>
            <stop offset="20%" stopColor="#353535"/>
            <stop offset="50%" stopColor="#2d2d2d"/>
            <stop offset="80%" stopColor="#353535"/>
            <stop offset="100%" stopColor="#3a3a3a"/>
          </linearGradient>

          {/* Racing line highlight */}
          <linearGradient id="racingLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a4a4a" stopOpacity="0"/>
            <stop offset="50%" stopColor="#5a5a5a" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#4a4a4a" stopOpacity="0"/>
          </linearGradient>

          {/* Curb red gradient */}
          <linearGradient id="curbRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4757"/>
            <stop offset="50%" stopColor="#e63946"/>
            <stop offset="100%" stopColor="#c0392b"/>
          </linearGradient>

          {/* Golden glow for start/finish */}
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feFlood floodColor="#d4a517" floodOpacity="0.5"/>
            <feComposite in2="blur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Ambient lighting effect */}
          <filter id="ambientGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Track lights glow */}
          <filter id="lightGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background grass */}
        <rect width="960" height="600" fill="url(#grassGradient)"/>

        {/* Outer track boundary shadow */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="#000"
          strokeWidth="95"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          transform="translate(2, 4)"
        />

        {/* Outer safety barrier */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="92"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Red/white curbing - outer - cleaner stripes */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="url(#curbRed)"
          strokeWidth="88"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={RACE_PATH}
          fill="none"
          stroke="white"
          strokeWidth="88"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20,20"
        />

        {/* Track base */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="url(#asphaltGradient)"
          strokeWidth="72"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trackShadow)"
        />

        {/* Track surface */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="url(#trackSurface)"
          strokeWidth="65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center lane marking */}
        <path
          d={RACE_PATH}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="30,25"
          opacity="0.7"
        />

        {/* Reference path (invisible) */}
        <path
          ref={pathRef}
          d={RACE_PATH}
          fill="none"
          stroke="transparent"
          strokeWidth="1"
        />

        {/* Finish line - on bottom straight at start point (300, 480) */}
        <g transform="translate(300, 440)">
          <rect x="-35" y="-8" width="70" height="85" fill="#0a0a0a" rx="3"/>
          <rect x="-33" y="-6" width="66" height="81" fill="#1a1a1a" rx="2"/>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(row => (
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(col => (
              <rect
                key={`check-${row}-${col}`}
                x={-31 + col * 6.5}
                y={-4 + row * 7}
                width="6.5"
                height="7"
                fill={(row + col) % 2 === 0 ? '#1a1a1a' : '#f8f8f8'}
              />
            ))
          ))}
        </g>

        {/* Start/Finish gantry - F1 style - aligned with finish line */}
        <g transform="translate(300, 435)">
          {/* Main structural posts */}
          <rect x="-40" y="-55" width="10" height="100" fill="#2a2a2a"/>
          <rect x="-38" y="-53" width="6" height="96" fill="#3d3d3d"/>
          <rect x="30" y="-55" width="10" height="100" fill="#2a2a2a"/>
          <rect x="32" y="-53" width="6" height="96" fill="#3d3d3d"/>
          
          {/* Top beam spanning the track */}
          <rect x="-45" y="-70" width="90" height="18" fill="#2a2a2a" rx="3"/>
          <rect x="-43" y="-68" width="86" height="14" fill="#3d3d3d" rx="2"/>
          
          {/* F1-style start lights (5 lights) */}
          {[0, 1, 2, 3, 4].map(i => (
            <g key={`light-${i}`} transform={`translate(${-35 + i * 16}, -62)`}>
              <rect x="0" y="0" width="12" height="8" fill="#1a1a1a" rx="2"/>
              <circle cx="6" cy="4" r="3" fill="#ff0000" filter="url(#lightGlow)" opacity="0.9"/>
            </g>
          ))}
          
          {/* Golden banner */}
          <rect x="-30" y="-82" width="60" height="10" fill="#d4a517" rx="2"/>
        </g>

        {/* Track distance markers on top straight */}
        {[250, 480, 710].map((xPos, i) => (
          <g key={`marker-${i}`} transform={`translate(${xPos}, 178)`}>
            <rect x="-12" y="-6" width="24" height="12" fill="#2a2a2a" rx="2"/>
            <rect x="-10" y="-4" width="20" height="8" fill="#d4a517" rx="1"/>
          </g>
        ))}

        {/* Grandstands - top */}
        <g transform="translate(480, 110)">
          <rect x="-200" y="-25" width="400" height="50" fill="#3a3a3a" rx="4"/>
          <rect x="-195" y="-20" width="390" height="40" fill="#4a4a4a" rx="3"/>
          {/* Spectators */}
          {Array.from({ length: 30 }).map((_, i) => (
            <circle
              key={`spec-top-${i}`}
              cx={-180 + i * 13}
              cy={-5 + (i % 3) * 10}
              r="4"
              fill={['#e63946', '#3B82F6', '#f6c446', '#22c55e', '#8B5CF6', '#ff9f43'][i % 6]}
            />
          ))}
        </g>

        {/* Grandstands - bottom */}
        <g transform="translate(580, 555)">
          <rect x="-180" y="-20" width="360" height="40" fill="#3a3a3a" rx="4"/>
          <rect x="-175" y="-15" width="350" height="30" fill="#4a4a4a" rx="3"/>
          {/* Spectators */}
          {Array.from({ length: 26 }).map((_, i) => (
            <circle
              key={`spec-bottom-${i}`}
              cx={-160 + i * 13}
              cy={-2 + (i % 2) * 8}
              r="4"
              fill={['#ff9f43', '#22c55e', '#3B82F6', '#e63946', '#8B5CF6', '#f6c446'][i % 6]}
            />
          ))}
        </g>

        {/* Palm trees at corners */}
        {[
          { x: 30, y: 150, scale: 0.8 },
          { x: 30, y: 420, scale: 0.75 },
          { x: 930, y: 150, scale: 0.8 },
          { x: 930, y: 420, scale: 0.75 },
        ].map((pos, i) => (
          <g key={`palm-${i}`} transform={`translate(${pos.x}, ${pos.y}) scale(${pos.scale})`}>
            <rect x="-4" y="-55" width="8" height="60" fill="#8B6914" rx="2"/>
            <rect x="-3" y="-53" width="2" height="56" fill="#6B4F0E" opacity="0.5"/>
            {[-50, -25, 0, 25, 50].map((angle, j) => (
              <g key={`leaf-${i}-${j}`} transform={`rotate(${angle}) translate(0, -58)`}>
                <ellipse rx="32" ry="7" fill="#1a5a35" transform="rotate(-8)"/>
                <ellipse rx="28" ry="5" fill="#22c55e" transform="rotate(-4) translate(2, -2)"/>
              </g>
            ))}
          </g>
        ))}

        {/* Interior grass decorations */}
        {[
          { x: 350, y: 340, r: 20 },
          { x: 480, y: 320, r: 24 },
          { x: 610, y: 340, r: 20 },
          { x: 430, y: 360, r: 16 },
          { x: 530, y: 360, r: 16 },
        ].map((bush, i) => (
          <g key={`bush-${i}`} transform={`translate(${bush.x}, ${bush.y})`}>
            <ellipse rx={bush.r} ry={bush.r * 0.65} fill="#0d3320"/>
            <ellipse rx={bush.r * 0.75} ry={bush.r * 0.45} cy={-bush.r * 0.2} fill="#1a5a35"/>
            <ellipse rx={bush.r * 0.5} ry={bush.r * 0.3} cy={-bush.r * 0.35} fill="#22804a"/>
          </g>
        ))}

        {/* Racing cars and avatars */}
        {racers.map((racer, index) => {
          const laneOffset = (index - 1.5);
          const pos = getPositionAndAngle(racer.distance, laneOffset, racer.prevAngle);
          const racerPosition = positions.find(p => p.id === racer.id)?.position || index + 1;
          
          return (
            <g key={racer.id}>
              <CarSprite racer={racer} x={pos.x} y={pos.y} angle={pos.angle} />
              <RacerAvatar racer={racer} x={pos.x} y={pos.y} position={racerPosition} />
            </g>
          );
        })}
      </svg>

      {/* Race countdown overlay - only show during countdown phase, not during racing */}
      {raceState === 'countdown' && countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-8xl font-bold text-white animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {raceState === 'countdown' && countdown === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-8xl font-bold text-green-400 animate-pulse">
            GO!
          </div>
        </div>
      )}

      {/* Winner celebration popup */}
      {showCelebration && winner && (
        <WinnerCelebration 
          winner={winner.id} 
          onClose={() => setShowCelebration(false)} 
        />
      )}

      {/* Lap counter */}
      <div className="absolute top-4 left-4 bg-[#0d3320]/90 rounded-lg px-4 py-2 border border-[#2d6b4a]/50">
        <div className="text-[#d4a517] text-lg font-bold">
          LAP {Math.min(Math.max(...racers.map(r => r.lap)), TOTAL_LAPS)}/{TOTAL_LAPS}
        </div>
      </div>

      {/* Positions panel */}
      <div className="absolute top-4 right-4 bg-[#0d3320]/90 rounded-lg p-3 border border-[#2d6b4a]/50">
        <div className="text-white text-sm font-bold mb-2">Positions</div>
        {positions.map(({ id, position }) => {
          const racer = racers.find(r => r.id === id);
          if (!racer) return null;
          return (
            <div key={racer.id} className="flex items-center gap-2 text-xs text-white py-0.5">
              <span className={`w-4 font-bold ${position === 1 ? 'text-[#d4a517]' : ''}`}>{position}.</span>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: racer.color }} 
              />
              <span>{racer.name}</span>
              <span className="text-[#7cb894] ml-auto">L{racer.lap}</span>
            </div>
          );
        })}
      </div>

      {/* Transparency toggle button */}
      <button
        onClick={() => setShowTransparency(!showTransparency)}
        className="absolute bottom-4 right-4 bg-[#0d3320]/90 rounded-lg px-3 py-2 border border-[#2d6b4a]/50 text-white text-xs hover:bg-[#1a4a2e] transition-colors"
      >
        {showTransparency ? 'Hide' : 'Show'} Race Data
      </button>

      {/* Transparency panel */}
      {showTransparency && (
        <div className="absolute bottom-14 right-4 bg-[#0d3320]/95 rounded-lg p-3 border border-[#2d6b4a]/50 w-64">
          <div className="text-[#d4a517] text-xs font-bold mb-2">RACE TRANSPARENCY</div>
          
          <div className="text-[10px] text-white/80 mb-2">
            <span className="text-[#7cb894]">Seed:</span>{' '}
            <span className="font-mono break-all">{displaySeed || 'Waiting...'}</span>
          </div>

          <div className="text-[10px] text-white/80 mb-1">
            <span className="text-[#7cb894]">Time:</span> {raceTimeRef.current.toFixed(2)}s
          </div>
          
          {totalLength > 0 && (
            <div className="text-[10px] text-white/80 mb-1">
              <span className="text-[#7cb894]">Circuit:</span> {totalLength.toFixed(0)} units
            </div>
          )}
          
          {totalLength > 0 && (
            <div className="text-[10px] text-white/80 mb-1">
              <span className="text-[#7cb894]">Est. Time:</span> {calculateEstimatedRaceTime(totalLength).toFixed(1)}s for {TOTAL_LAPS} laps
            </div>
          )}

          <div className="text-[10px] text-[#7cb894] mb-1 mt-2">Live Speeds:</div>
          {racers.map(racer => (
            <div key={racer.id} className="flex items-center gap-2 text-[10px] text-white py-0.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: racer.color }} 
              />
              <span className="truncate w-16">{racer.name}</span>
              <div className="flex-1 bg-[#1a4a2e] rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-100"
                  style={{ 
                    width: `${Math.min(((racer.currentSpeed - 300) / 300) * 100, 100)}%`,
                    backgroundColor: racer.color 
                  }}
                />
              </div>
            </div>
          ))}

          <div className="text-[8px] text-white/50 mt-2 border-t border-[#2d6b4a]/50 pt-2">
            Fair racing: All racers have balanced speeds (400 base) with rubber-banding for trailing cars. Race duration: ~30 seconds.
          </div>
        </div>
      )}

      {/* Confetti celebration */}
      <Confetti 
        isActive={showConfetti} 
        winnerColor={winner?.color || '#d4a517'} 
        duration={5000}
      />

      {/* Race commentator */}
      <Commentator 
        raceState={raceState}
        countdown={countdown}
        positions={positions.map(p => {
          const racer = racers.find(r => r.id === p.id);
          return { id: p.id, name: racer?.name || '', position: p.position, lap: racer?.lap || 1 };
        })}
        winner={winner ? { id: winner.id, name: winner.name } : null}
        totalLaps={TOTAL_LAPS}
      />
    </div>
  );
}
