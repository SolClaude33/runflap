import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ABI simplificado solo para las funciones que necesitamos
const FLAPRACE_ABI = [
  'function getCurrentRaceId() external view returns (uint256)',
  'function getRaceInfo(uint256 raceId) external view returns (uint256 startTime, uint256 bettingEndTime, uint256 winnerDeterminedTime, uint256 claimingStartTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool)',
  'function determineWinner(uint256 raceId) external',
];

const FLAPRACE_ADDRESS = process.env.NEXT_PUBLIC_FLAPRACE_ADDRESS!;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.public.blastapi.io';

/**
 * GET /api/race/determine-winner
 * Cron job que determina el ganador automáticamente cuando termina el countdown
 * Debe ser llamado cada minuto por Vercel Cron
 * 
 * POST /api/race/determine-winner
 * Determina el ganador para una carrera específica (llamado desde el frontend)
 */
export async function GET(req: NextRequest) {
  return handleWinnerDetermination(null);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raceId } = body;
    
    if (raceId !== undefined && raceId !== null) {
      return handleWinnerDetermination(Number(raceId));
    } else {
      return handleWinnerDetermination(null);
    }
  } catch (error: any) {
    console.error('[API] Error parsing request body:', error);
    return handleWinnerDetermination(null);
  }
}

async function handleWinnerDetermination(requestedRaceId: number | null) {
  try {
    console.log(`[Winner Determination] Checking if winner determination is needed${requestedRaceId !== null ? ` for race ${requestedRaceId}` : ''}...`);

    if (!OWNER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Owner private key not configured' },
        { status: 500 }
      );
    }

    if (!FLAPRACE_ADDRESS) {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // Conectar al contrato con el owner wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(FLAPRACE_ADDRESS, FLAPRACE_ABI, wallet);

    // Determinar qué carrera procesar
    let targetRaceId: number;
    if (requestedRaceId !== null) {
      targetRaceId = requestedRaceId;
    } else {
      // Si no se especifica, usar la carrera actual
      targetRaceId = await contract.getCurrentRaceId();
    }
    console.log(`[Winner Determination] Target race: ${targetRaceId}`);

    // Verificar si necesitamos determinar ganador para esta carrera
    const raceInfo = await contract.getRaceInfo(targetRaceId);
    const [startTime, bettingEndTime, winnerDeterminedTime, claimingStartTime, winner, finalized, totalPool, nextRacePool] = raceInfo;

    const now = Math.floor(Date.now() / 1000);
    const bettingEndTimeNum = Number(bettingEndTime);
    const winnerDeterminedTimeNum = Number(winnerDeterminedTime);

    console.log(`[Winner Determination] Race ${targetRaceId}: betting ended? ${now >= bettingEndTimeNum}, countdown finished? ${now >= winnerDeterminedTimeNum}, winner determined? ${Number(winner) > 0}`);

    // Determinar ganador durante el countdown (después de que termine el betting)
    // Esto le da tiempo al frontend para preparar la carrera visual
    if (now >= bettingEndTimeNum && Number(winner) === 0 && Number(startTime) > 0) {
      console.log(`[Winner Determination] Determining winner for race ${targetRaceId}...`);
      
      try {
        const tx = await contract.determineWinner(targetRaceId);
        const receipt = await tx.wait();
        
        console.log(`[Winner Determination] ✅ Winner determined for race ${targetRaceId}. TX: ${receipt.hash}`);
        
        return NextResponse.json({
          success: true,
          raceId: targetRaceId.toString(),
          txHash: receipt.hash,
          message: `Winner determined for race ${targetRaceId}`,
        });
      } catch (error: any) {
        console.error(`[Winner Determination] Error determining winner:`, error);
        
        // Si el error es que ya se determinó, no es un error crítico
        if (error.message && (error.message.includes('already determined') || error.message.includes('Winner already'))) {
          return NextResponse.json({
            success: true,
            raceId: targetRaceId.toString(),
            message: `Winner already determined for race ${targetRaceId}`,
          });
        }
        
        throw error;
      }
    } else {
      const reason = 
        Number(startTime) === 0 ? 'race not started' :
        now < bettingEndTimeNum ? 'betting period not ended yet' :
        Number(winner) > 0 ? 'winner already determined' :
        'unknown reason';
      
      console.log(`[Winner Determination] No winner determination needed: ${reason}`);
      
      return NextResponse.json({
        success: true,
        raceId: targetRaceId.toString(),
        message: `No winner determination needed: ${reason}`,
      });
    }
  } catch (error: any) {
    console.error('[Winner Determination] Error in winner determination:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error determining winner',
      },
      { status: 500 }
    );
  }
}
