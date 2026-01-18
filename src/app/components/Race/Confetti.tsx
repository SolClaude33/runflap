'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  velocityX: number;
  velocityY: number;
  opacity: number;
}

interface ConfettiProps {
  isActive: boolean;
  winnerColor?: string;
  duration?: number;
}

const COLORS = ['#d4a517', '#FFD700', '#FFA500', '#FF6B35', '#22c55e', '#3B82F6', '#8B5CF6', '#ffffff'];

export default function Confetti({ isActive, winnerColor = '#d4a517', duration = 4000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const colors = [winnerColor, ...COLORS];
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < 150; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 2 + Math.random() * 4,
        opacity: 0.8 + Math.random() * 0.2,
      });
    }
    
    setParticles(newParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.velocityX,
        y: p.y + p.velocityY,
        rotation: p.rotation + p.rotationSpeed,
        velocityY: p.velocityY + 0.1,
        opacity: p.y > 80 ? Math.max(0, p.opacity - 0.05) : p.opacity,
      })).filter(p => p.y < 120 && p.opacity > 0));
    }, 30);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setParticles([]);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, winnerColor, duration]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            borderRadius: '2px',
            boxShadow: `0 0 ${p.size / 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
