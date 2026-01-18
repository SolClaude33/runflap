'use client';

import { useState, useEffect, useRef } from 'react';

interface CommentatorProps {
  raceState: 'betting' | 'pre_countdown' | 'countdown' | 'racing' | 'finished';
  countdown: number | null;
  positions: { id: number; name: string; position: number; lap: number }[];
  winner: { id: number; name: string } | null;
  totalLaps: number;
}

const RACE_COMMENTS = {
  start: [
    "AND THEY'RE OFF!",
    "LIGHTS OUT AND AWAY WE GO!",
    "THE RACE IS ON!",
  ],
  leadChange: [
    "{name} TAKES THE LEAD!",
    "{name} MOVES INTO P1!",
    "NEW LEADER: {name}!",
  ],
  closeRace: [
    "BATTLE FOR THE LEAD!",
    "IT'S NECK AND NECK!",
    "INCREDIBLE RACING!",
  ],
  finalLap: [
    "FINAL LAP!",
    "LAST LAP - WHO WILL WIN?",
    "ONE LAP TO GO!",
  ],
  surge: [
    "{name} WITH A BURST OF SPEED!",
    "SURGE FROM {name}!",
    "{name} IS FLYING!",
  ],
  winner: [
    "{name} WINS!",
    "CHECKERED FLAG FOR {name}!",
    "VICTORY FOR {name}!",
  ],
};

export default function Commentator({ raceState, countdown, positions, winner, totalLaps }: CommentatorProps) {
  const [message, setMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const lastLeaderRef = useRef<number | null>(null);
  const lastLapRef = useRef<number>(1);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownStartRef = useRef(false);
  const hasShownFinalLapRef = useRef(false);

  const showMessage = (msg: string, duration: number = 2500) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage(msg);
    setIsVisible(true);
    messageTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, duration);
  };

  const getRandomComment = (type: keyof typeof RACE_COMMENTS, name?: string): string => {
    const comments = RACE_COMMENTS[type];
    const comment = comments[Math.floor(Math.random() * comments.length)];
    return name ? comment.replace('{name}', name.toUpperCase()) : comment;
  };

  useEffect(() => {
    if (raceState === 'countdown' && countdown !== null) {
      if (countdown > 0) {
        showMessage(countdown.toString(), 900);
      } else {
        showMessage('GO!', 1000);
      }
    }
  }, [raceState, countdown]);

  useEffect(() => {
    if (raceState === 'racing' && !hasShownStartRef.current) {
      setTimeout(() => {
        showMessage(getRandomComment('start'), 2000);
        hasShownStartRef.current = true;
      }, 500);
    }
    
    if (raceState === 'betting' || raceState === 'pre_countdown') {
      hasShownStartRef.current = false;
      hasShownFinalLapRef.current = false;
      lastLeaderRef.current = null;
      lastLapRef.current = 1;
    }
  }, [raceState]);

  useEffect(() => {
    if (raceState !== 'racing' || positions.length === 0) return;

    const leader = positions.find(p => p.position === 1);
    if (!leader) return;

    if (lastLeaderRef.current !== null && lastLeaderRef.current !== leader.id) {
      showMessage(getRandomComment('leadChange', leader.name), 2500);
    }
    lastLeaderRef.current = leader.id;

    if (leader.lap === totalLaps && !hasShownFinalLapRef.current) {
      setTimeout(() => {
        showMessage(getRandomComment('finalLap'), 2500);
        hasShownFinalLapRef.current = true;
      }, 300);
    }
  }, [raceState, positions, totalLaps]);

  useEffect(() => {
    if (raceState === 'finished' && winner) {
      setTimeout(() => {
        showMessage(getRandomComment('winner', winner.name), 4000);
      }, 300);
    }
  }, [raceState, winner]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  if (!message) return null;

  return (
    <div 
      className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
    >
      <p 
        className="text-3xl md:text-5xl font-black text-white tracking-wider text-center uppercase px-4"
        style={{
          fontFamily: "'Impact', 'Haettenschweiler', sans-serif",
          letterSpacing: '0.1em',
          textShadow: `
            -1px -1px 0 #0d3320,
            1px -1px 0 #0d3320,
            -1px 1px 0 #0d3320,
            1px 1px 0 #0d3320,
            -2px 0 0 #0d3320,
            2px 0 0 #0d3320,
            0 -2px 0 #0d3320,
            0 2px 0 #0d3320,
            0 0 20px rgba(212, 165, 23, 0.8),
            0 0 40px rgba(212, 165, 23, 0.5)
          `,
        }}
      >
        {message}
      </p>
    </div>
  );
}
