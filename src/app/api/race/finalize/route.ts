import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { calculateRaceWinner } from '@/lib/raceSimulation';

// ABI simplificado para finalizar carrera
const FLAPRACE_ABI = [
  "function finalizeRace(uint256 raceId, uint8 winner)",
  "function getCurrentRaceId() view returns (uint256)",
  "function getRaceInfo(uint256 raceId) view returns (uint256 startTime, uint256 bettingEndTime, uint256 raceEndTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool, uint256 raceSeed, bool seedGenerated)",
  "function generateRaceSeed(uint256 raceId)",
];

// Circuit length - must match RaceTrack.tsx
const CIRCUIT_LENGTH = 1966.32;

// Esta clave privada debe estar en variables de entorno y ser del owner del contrato
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLAPRACE_ADDRESS || '';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.public.blastapi.io';

// API Key para autenticación (debe estar en variables de entorno)
const API_KEY = process.env.API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raceId, winner } = body;

    // Verificar API key (opcional si viene, pero también permitimos sin ella si la carrera realmente terminó)
    const apiKey = request.headers.get('x-api-key');
    const hasValidApiKey = apiKey && apiKey === API_KEY;

    // Validar parámetros
    if (!raceId || !winner) {
      return NextResponse.json(
        { success: false, error: 'Missing raceId or winner' },
        { status: 400 }
      );
    }

    if (winner < 1 || winner > 4) {
      return NextResponse.json(
        { success: false, error: 'Winner must be between 1 and 4' },
        { status: 400 }
      );
    }

    if (!OWNER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Conectar a BSC
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, FLAPRACE_ABI, wallet);

    // Verificar que la carrera existe y no está finalizada
    let raceInfo = await contract.getRaceInfo(raceId);
    if (raceInfo.finalized) {
      return NextResponse.json(
        { success: false, error: 'Race already finalized' },
        { status: 400 }
      );
    }

    // Verificar que la carrera ha terminado
    const raceEndTime = Number(raceInfo.raceEndTime);
    const now = Math.floor(Date.now() / 1000);
    // Dar un margen de 2 segundos para sincronización (la carrera visual puede terminar un poco antes)
    const raceHasEnded = now >= (raceEndTime - 2);
    
    // Si tiene API key válida (owner), puede finalizar cualquier carrera pasada
    // Si no tiene API key, solo permitir si la carrera realmente terminó (o está muy cerca)
    if (!hasValidApiKey && !raceHasEnded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or race not finished yet' },
        { status: 401 }
      );
    }

    // Si no tiene API key y la carrera aún no ha terminado (con margen), rechazar
    // Si tiene API key, puede finalizar incluso si el tiempo exacto no ha pasado (para carreras pasadas)
    if (!hasValidApiKey && now < (raceEndTime - 2)) {
      return NextResponse.json(
        { success: false, error: `Race not finished yet. Ends at ${raceEndTime}, current time: ${now}` },
        { status: 400 }
      );
    }
    
    // Si tiene API key pero la carrera aún no ha terminado (futuro), rechazar por seguridad
    if (hasValidApiKey && now < raceEndTime) {
      return NextResponse.json(
        { success: false, error: `Cannot finalize future race. Race ends at ${raceEndTime}, current time: ${now}` },
        { status: 400 }
      );
    }

    // CRITICAL: Generar seed ANTES de finalizar (si no está generado todavía)
    // Esto asegura que el seed esté disponible para los clientes
    if (!raceInfo.seedGenerated) {
      console.log(`[Finalize API] Generating seed for race ${raceId} before finalizing...`);
      try {
        const seedTx = await contract.generateRaceSeed(raceId);
        await seedTx.wait();
        console.log(`[Finalize API] Seed generated for race ${raceId}`);
        // Refresh race info to get the generated seed
        raceInfo = await contract.getRaceInfo(raceId);
      } catch (seedError: any) {
        console.error(`[Finalize API] Error generating seed (will continue with finalization):`, seedError.message);
        // Continuar con la finalización aunque falle el seed
        // El contrato lo generará automáticamente en finalizeRace de todos modos
      }
    }

    // CRITICAL: Calculate the winner deterministically from the seed
    // This ensures the backend and frontend always agree on the winner
    let calculatedWinner = winner;
    if (raceInfo.seedGenerated && raceInfo.raceSeed > 0) {
      try {
        calculatedWinner = calculateRaceWinner(Number(raceInfo.raceSeed), CIRCUIT_LENGTH);
        console.log(`[Finalize API] Calculated winner from seed: Car ${calculatedWinner} (requested: Car ${winner})`);
        
        // If the requested winner doesn't match the calculated winner, use the calculated one
        // This ensures the contract always has the correct winner
        if (calculatedWinner !== winner) {
          console.warn(`[Finalize API] ⚠️ Winner mismatch! Requested: Car ${winner}, Calculated: Car ${calculatedWinner}. Using calculated winner.`);
          calculatedWinner = calculatedWinner; // Use calculated winner
        } else {
          console.log(`[Finalize API] ✅ Requested winner matches calculated winner: Car ${calculatedWinner}`);
        }
      } catch (calcError: any) {
        console.error(`[Finalize API] Error calculating winner from seed:`, calcError);
        // Fall back to requested winner if calculation fails
        console.log(`[Finalize API] Using requested winner: Car ${winner}`);
      }
    } else {
      console.warn(`[Finalize API] ⚠️ Seed not available, using requested winner: Car ${winner}`);
    }

    // Finalizar la carrera con el ganador calculado (o el solicitado si no se pudo calcular)
    const tx = await contract.finalizeRace(raceId, calculatedWinner);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      raceId,
      winner: calculatedWinner,
      requestedWinner: winner,
      calculatedFromSeed: raceInfo.seedGenerated && raceInfo.raceSeed > 0,
    });
  } catch (error: any) {
    console.error('Error finalizing race:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.reason || error.message || 'Failed to finalize race' 
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información de una carrera (sin autenticación)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get('raceId');

    if (!raceId) {
      return NextResponse.json(
        { success: false, error: 'Missing raceId' },
        { status: 400 }
      );
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Contract not configured' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, FLAPRACE_ABI, provider);

    const raceInfo = await contract.getRaceInfo(raceId);

    return NextResponse.json({
      success: true,
      raceInfo: {
        startTime: raceInfo.startTime.toString(),
        bettingEndTime: raceInfo.bettingEndTime.toString(),
        raceEndTime: raceInfo.raceEndTime.toString(),
        winner: Number(raceInfo.winner),
        finalized: raceInfo.finalized,
        totalPool: raceInfo.totalPool.toString(),
        nextRacePool: raceInfo.nextRacePool.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error getting race info:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get race info' 
      },
      { status: 500 }
    );
  }
}
