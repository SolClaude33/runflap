import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ABI simplificado solo para las funciones que necesitamos
const FLAPRACE_ABI = [
  'function getCurrentRaceId() external view returns (uint256)',
  'function getRaceInfo(uint256 raceId) external view returns (uint256 startTime, uint256 bettingEndTime, uint256 raceEndTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool, uint256 raceSeed, bool seedGenerated)',
  'function generateRaceSeed(uint256 raceId) external',
];

const FLAPRACE_ADDRESS = process.env.NEXT_PUBLIC_FLAPRACE_ADDRESS!;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.public.blastapi.io';

/**
 * GET /api/race/generate-seed
 * Cron job que genera el seed automáticamente cuando termina el betting period
 * Debe ser llamado cada minuto por Vercel Cron
 * 
 * POST /api/race/generate-seed
 * Genera el seed para una carrera específica (llamado desde el frontend)
 */
export async function GET(req: NextRequest) {
  return handleSeedGeneration(null);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raceId } = body;
    
    if (raceId !== undefined && raceId !== null) {
      return handleSeedGeneration(Number(raceId));
    } else {
      return handleSeedGeneration(null);
    }
  } catch (error: any) {
    console.error('[API] Error parsing request body:', error);
    return handleSeedGeneration(null);
  }
}

async function handleSeedGeneration(requestedRaceId: number | null) {
  try {
    console.log(`[Seed Generation] Checking if seed generation is needed${requestedRaceId !== null ? ` for race ${requestedRaceId}` : ''}...`);

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
    console.log(`[Seed Generation] Target race: ${targetRaceId}`);

    // Verificar si necesitamos generar seed para esta carrera
    const raceInfo = await contract.getRaceInfo(targetRaceId);
    const [startTime, bettingEndTime, raceEndTime, winner, finalized, totalPool, nextRacePool, raceSeed, seedGenerated] = raceInfo;

    const now = Math.floor(Date.now() / 1000);
    const bettingEndTimeNum = Number(bettingEndTime);

    console.log(`[Seed Generation] Race ${targetRaceId}: betting ended? ${now >= bettingEndTimeNum}, seed generated? ${seedGenerated}`);

    // Si el betting period terminó y el seed no se ha generado, generarlo
    if (now >= bettingEndTimeNum && !seedGenerated && Number(startTime) > 0) {
      console.log(`[Seed Generation] Generating seed for race ${targetRaceId}...`);
      
      try {
        const tx = await contract.generateRaceSeed(targetRaceId);
        const receipt = await tx.wait();
        
        console.log(`[Seed Generation] ✅ Seed generated for race ${targetRaceId}. TX: ${receipt.hash}`);
        
        return NextResponse.json({
          success: true,
          raceId: targetRaceId.toString(),
          txHash: receipt.hash,
          message: `Seed generated for race ${targetRaceId}`,
        });
      } catch (error: any) {
        console.error(`[Seed Generation] Error generating seed:`, error);
        
        // Si el error es que ya se generó, no es un error crítico
        if (error.message && (error.message.includes('already generated') || error.message.includes('seed already'))) {
          return NextResponse.json({
            success: true,
            raceId: targetRaceId.toString(),
            message: `Seed already generated for race ${targetRaceId}`,
          });
        }
        
        throw error;
      }
    } else {
      const reason = 
        Number(startTime) === 0 ? 'race not started' :
        now < bettingEndTimeNum ? 'betting period not ended yet' :
        seedGenerated ? 'seed already generated' :
        'unknown reason';
      
      console.log(`[Seed Generation] No seed generation needed: ${reason}`);
      
      return NextResponse.json({
        success: true,
        raceId: targetRaceId.toString(),
        message: `No seed generation needed: ${reason}`,
      });
    }
  } catch (error: any) {
    console.error('[Seed Generation] Error in seed generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error generating seed',
      },
      { status: 500 }
    );
  }
}
