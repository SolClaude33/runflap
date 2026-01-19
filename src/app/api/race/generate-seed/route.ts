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
 * Debe ser llamado cada 10-30 segundos por Vercel Cron o similar
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[CRON] Checking if seed generation is needed...');

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

    // Obtener la carrera actual
    const currentRaceId = await contract.getCurrentRaceId();
    console.log(`[CRON] Current race: ${currentRaceId}`);

    // Verificar si necesitamos generar seed para esta carrera
    const raceInfo = await contract.getRaceInfo(currentRaceId);
    const [startTime, bettingEndTime, raceEndTime, winner, finalized, totalPool, nextRacePool, raceSeed, seedGenerated] = raceInfo;

    const now = Math.floor(Date.now() / 1000);
    const bettingEndTimeNum = Number(bettingEndTime);

    console.log(`[CRON] Race ${currentRaceId}: betting ended? ${now >= bettingEndTimeNum}, seed generated? ${seedGenerated}`);

    // Si el betting period terminó y el seed no se ha generado, generarlo
    if (now >= bettingEndTimeNum && !seedGenerated && Number(startTime) > 0) {
      console.log(`[CRON] Generating seed for race ${currentRaceId}...`);
      
      try {
        const tx = await contract.generateRaceSeed(currentRaceId);
        const receipt = await tx.wait();
        
        console.log(`[CRON] ✅ Seed generated for race ${currentRaceId}. TX: ${receipt.hash}`);
        
        return NextResponse.json({
          success: true,
          raceId: currentRaceId.toString(),
          txHash: receipt.hash,
          message: `Seed generated for race ${currentRaceId}`,
        });
      } catch (error: any) {
        console.error(`[CRON] Error generating seed:`, error);
        
        // Si el error es que ya se generó, no es un error crítico
        if (error.message && error.message.includes('already generated')) {
          return NextResponse.json({
            success: true,
            raceId: currentRaceId.toString(),
            message: `Seed already generated for race ${currentRaceId}`,
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
      
      console.log(`[CRON] No seed generation needed: ${reason}`);
      
      return NextResponse.json({
        success: true,
        raceId: currentRaceId.toString(),
        message: `No seed generation needed: ${reason}`,
      });
    }
  } catch (error: any) {
    console.error('[CRON] Error in seed generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error generating seed',
      },
      { status: 500 }
    );
  }
}
