import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ABI simplificado para finalizar carrera
const FLAPRACE_ABI = [
  "function finalizeRace(uint256 raceId, uint8 winner)",
  "function getCurrentRaceId() view returns (uint256)",
  "function getRaceInfo(uint256 raceId) view returns (uint256 startTime, uint256 bettingEndTime, uint256 raceEndTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool, uint256 raceSeed, bool seedGenerated)",
  "function generateRaceSeed(uint256 raceId)",
];

// Esta clave privada debe estar en variables de entorno y ser del owner del contrato
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const RPC_URL = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
  ? 'https://bsc-dataseed1.binance.org/'
  : 'https://data-seed-prebsc-1-s1.binance.org:8545/';

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
    const raceInfo = await contract.getRaceInfo(raceId);
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

    // Finalizar la carrera
    const tx = await contract.finalizeRace(raceId, winner);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      raceId,
      winner,
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
