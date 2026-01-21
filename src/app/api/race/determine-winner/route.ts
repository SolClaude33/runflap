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
      console.error('[Winner Determination] ❌ OWNER_PRIVATE_KEY not configured in environment variables');
      return NextResponse.json(
        { 
          success: false,
          error: 'Owner private key not configured. Please set OWNER_PRIVATE_KEY in Vercel environment variables.' 
        },
        { status: 500 }
      );
    }

    if (!FLAPRACE_ADDRESS) {
      console.error('[Winner Determination] ❌ NEXT_PUBLIC_FLAPRACE_ADDRESS not configured in environment variables');
      return NextResponse.json(
        { 
          success: false,
          error: 'Contract address not configured. Please set NEXT_PUBLIC_FLAPRACE_ADDRESS in Vercel environment variables.' 
        },
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
    const winnerNum = Number(winner);

    console.log(`[Winner Determination] Race ${targetRaceId}: betting ended? ${now >= bettingEndTimeNum}, countdown finished? ${now >= winnerDeterminedTimeNum}, winner: ${winnerNum}, finalized: ${finalized}`);

    // Determinar ganador durante el countdown (después de que termine el betting)
    // Esto le da tiempo al frontend para preparar la carrera visual
    // CRITICAL: Verificar que winner sea realmente 0, no solo truthy/falsy
    if (now >= bettingEndTimeNum && winnerNum === 0 && Number(startTime) > 0) {
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
      // CRITICAL: Only say "winner already determined" if winner is actually > 0
      // If winner is 0, we should try to determine it
      const reason = 
        Number(startTime) === 0 ? 'race not started' :
        now < bettingEndTimeNum ? 'betting period not ended yet' :
        winnerNum > 0 ? `winner already determined (winner: ${winnerNum})` :
        'unknown reason (winner is 0, but conditions not met)';
      
      console.log(`[Winner Determination] Race ${targetRaceId} - No action needed: ${reason}`);
      console.log(`[Winner Determination] Details: startTime=${startTime}, bettingEndTime=${bettingEndTimeNum}, now=${now}, winner=${winnerNum}, finalized=${finalized}`);
      
      // If winner is 0 but betting ended, this is an error state - return error, not success
      if (now >= bettingEndTimeNum && winnerNum === 0 && Number(startTime) > 0) {
        console.error(`[Winner Determination] ERROR: Race ${targetRaceId} betting ended but winner is 0. This should not happen.`);
        return NextResponse.json({
          success: false,
          raceId: targetRaceId.toString(),
          error: `Race ${targetRaceId} betting ended but winner determination failed. Please retry.`,
        }, { status: 500 });
      }
      
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
