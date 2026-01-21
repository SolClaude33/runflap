import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ABI simplificado - NOTA: El contrato ahora finaliza automáticamente cuando se determina el ganador
// Esta API route ya no es necesaria pero se mantiene por compatibilidad
const FLAPRACE_ABI = [
  "function getCurrentRaceId() view returns (uint256)",
  "function getRaceInfo(uint256 raceId) view returns (uint256 startTime, uint256 bettingEndTime, uint256 winnerDeterminedTime, uint256 claimingStartTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool)",
  "function determineWinner(uint256 raceId) external",
];

// NOTA: El contrato ahora finaliza automáticamente cuando se determina el ganador
// Esta API route ya no es necesaria pero se mantiene por compatibilidad

// Esta clave privada debe estar en variables de entorno y ser del owner del contrato
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLAPRACE_ADDRESS || '';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.public.blastapi.io';

// API Key para autenticación (debe estar en variables de entorno)
const API_KEY = process.env.API_KEY || '';

export async function POST(request: NextRequest) {
  // NOTA: El contrato ahora finaliza automáticamente cuando se determina el ganador
  // Esta API route ya no es necesaria
  return NextResponse.json(
    { 
      success: false, 
      error: 'This endpoint is deprecated. The contract now finalizes automatically when the winner is determined. Use /api/race/determine-winner instead.' 
    },
    { status: 410 } // 410 Gone
  );
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
        winnerDeterminedTime: raceInfo.winnerDeterminedTime.toString(),
        claimingStartTime: raceInfo.claimingStartTime.toString(),
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
