/**
 * Deterministic race simulation
 * This module provides a shared function to calculate the race winner
 * deterministically based on the seed, ensuring frontend and backend
 * always agree on the winner.
 */

// Mulberry32 PRNG - same as in RaceTrack.tsx
function createPRNG(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

interface RacerState {
  id: number;
  distance: number;
  lap: number;
  baseSpeed: number;
  currentSpeed: number;
  targetSpeed: number;
  lastSpeedChange: number;
  finished: boolean;
}

const TOTAL_LAPS = 5;
const RACE_DURATION_SECONDS = 30;
const TICKS_PER_SECOND = 10; // 10 ticks per second for speed changes

/**
 * Simulates the race deterministically and returns the winner
 * @param seed The race seed from the contract
 * @param circuitLength The length of the race circuit (default: ~1966 units)
 * @returns The winner car ID (1-4)
 */
export function calculateRaceWinner(
  seed: number,
  circuitLength: number = 1966.32
): number {
  // Normalize seed to 32-bit unsigned integer
  const normalizedSeed = (seed >>> 0);
  const rng = createPRNG(normalizedSeed);
  
  // Initialize racers (same as RaceTrack.tsx)
  const racers: RacerState[] = [1, 2, 3, 4].map((id) => ({
    id,
    distance: 0,
    lap: 1,
    baseSpeed: 500, // Match RaceTrack.tsx base speed
    currentSpeed: 500,
    targetSpeed: 500,
    lastSpeedChange: 0,
    finished: false,
  }));
  
  // Simulate race for 30 seconds at 10 ticks per second = 300 ticks
  const totalTicks = RACE_DURATION_SECONDS * TICKS_PER_SECOND;
  
  for (let tick = 0; tick < totalTicks; tick++) {
    const contractRaceTime = tick / TICKS_PER_SECOND;
    const deltaTime = 0.1; // 0.1 seconds per tick
    
    // Calculate current positions
    const racerDistances = racers.map(r => ({
      id: r.id,
      totalDist: (r.lap - 1) * circuitLength + r.distance
    })).sort((a, b) => b.totalDist - a.totalDist);
    
    const leaderDist = racerDistances[0].totalDist;
    const lastPlaceDist = racerDistances[3].totalDist;
    
    // Update each racer
    for (let index = 0; index < racers.length; index++) {
      const racer = racers[index];
      if (racer.finished) continue;
      
      let newTargetSpeed = racer.targetSpeed;
      let newLastSpeedChange = racer.lastSpeedChange;
      const racerTotalDist = (racer.lap - 1) * circuitLength + racer.distance;
      const position = racerDistances.findIndex(r => r.id === racer.id) + 1;
      
      // Speed changes every 0.3 seconds (3 ticks)
      if (tick % 3 === index) {
        // Base variation
        const variation = 0.75 + rng() * 0.50;
        newTargetSpeed = racer.baseSpeed * variation;
        
        // Dramatic events
        const eventRoll = rng();
        if (eventRoll < 0.075) {
          newTargetSpeed *= 1.35; // SURGE
        } else if (eventRoll < 0.15) {
          newTargetSpeed *= 0.70; // STUMBLE
        }
        
        // Rubber-banding
        const distanceBehind = leaderDist - racerTotalDist;
        const timeRemaining = RACE_DURATION_SECONDS - contractRaceTime;
        const isFinalSeconds = timeRemaining <= 5;
        
        if (distanceBehind > 0 && position > 1 && !isFinalSeconds) {
          const catchUpBoost = Math.min(0.06, (distanceBehind / circuitLength) * 0.10);
          newTargetSpeed *= (1 + catchUpBoost);
        }
        
        if (isFinalSeconds && position > 1) {
          const minimalCatchUp = Math.min(0.02, (distanceBehind / circuitLength) * 0.05);
          newTargetSpeed *= (1 + minimalCatchUp);
        }
        
        // Leader penalty
        if (position === 1 && (leaderDist - lastPlaceDist) > circuitLength * 0.15) {
          newTargetSpeed *= 0.90;
        }
        
        // Final lap surge
        if (racer.lap === TOTAL_LAPS && position > 1) {
          newTargetSpeed *= 1.15 + rng() * 0.10;
        }
        
        // Mid-race shakeup
        const raceProgress = (racer.lap - 1 + racer.distance / circuitLength) / TOTAL_LAPS;
        if (raceProgress > 0.45 && raceProgress < 0.55) {
          newTargetSpeed *= 0.85 + rng() * 0.30;
        }
        
        // Clamp speeds
        newTargetSpeed = Math.max(300, Math.min(650, newTargetSpeed));
        newLastSpeedChange = contractRaceTime;
      }
      
      // Interpolate speed
      const speedLerp = 0.20;
      const timeSinceSpeedChange = contractRaceTime - racer.lastSpeedChange;
      const lerpFactor = Math.min(1.0, timeSinceSpeedChange * (1 / speedLerp));
      const newSpeed = racer.currentSpeed + (newTargetSpeed - racer.currentSpeed) * lerpFactor;
      
      // Adjust speed to ensure race completes in time
      const raceProgress = contractRaceTime / RACE_DURATION_SECONDS;
      const totalDistanceNeeded = circuitLength * TOTAL_LAPS;
      const distanceRemaining = totalDistanceNeeded - racerTotalDist;
      const timeRemaining = Math.max(0.1, RACE_DURATION_SECONDS - contractRaceTime);
      
      const isFinalSeconds = timeRemaining <= 5;
      let adjustedSpeed = newSpeed;
      if (timeRemaining > 0 && distanceRemaining > 0 && !isFinalSeconds) {
        const requiredSpeed = distanceRemaining / timeRemaining;
        adjustedSpeed = newSpeed * 0.70 + requiredSpeed * 0.30;
        adjustedSpeed = Math.max(400, Math.min(700, adjustedSpeed)); // Increased min to 400 for better completion
      } else if (isFinalSeconds) {
        adjustedSpeed = newSpeed;
      }
      
      // Calculate distance
      const averageSpeed = (racer.currentSpeed + adjustedSpeed) / 2;
      let newDistance = racer.distance + averageSpeed * deltaTime;
      let newLap = racer.lap;
      
      // Check for lap completion
      if (racer.lap === TOTAL_LAPS && newDistance >= circuitLength) {
        newDistance = circuitLength;
        newLap = TOTAL_LAPS;
        racer.finished = true;
      } else if (newDistance >= circuitLength && racer.lap < TOTAL_LAPS) {
        newLap = racer.lap + 1;
        newDistance = newDistance - circuitLength;
      }
      
      if (newLap > TOTAL_LAPS) {
        newLap = TOTAL_LAPS;
        newDistance = circuitLength;
      }
      
      // Update racer state
      racer.distance = newDistance;
      racer.lap = newLap;
      racer.currentSpeed = newSpeed;
      racer.targetSpeed = newTargetSpeed;
      racer.lastSpeedChange = newLastSpeedChange;
    }
  }
  
  // Determine winner by final positions
  const finalPositions = racers.map(r => ({
    id: r.id,
    totalDist: (r.lap - 1) * circuitLength + r.distance
  })).sort((a, b) => {
    const distDiff = b.totalDist - a.totalDist;
    if (Math.abs(distDiff) < 1) {
      return a.id - b.id; // Tiebreaker: lower ID wins
    }
    return distDiff;
  });
  
  return finalPositions[0].id;
}
