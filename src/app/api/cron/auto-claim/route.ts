import { NextRequest, NextResponse } from 'next/server';
import { claimCreatorFees, getVaultStatus, MIN_CLAIM_THRESHOLD } from '@/lib/claim-rewards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const tokenMint = process.env.TOKEN_MINT_ADDRESS;

    if (!tokenMint) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token mint address not configured - waiting for token launch',
        message: 'Set TOKEN_MINT_ADDRESS environment variable after token is live'
      });
    }

    const status = await getVaultStatus(tokenMint);
    if (!status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Creator wallet not configured' 
      }, { status: 500 });
    }

    if (status.pendingFees < MIN_CLAIM_THRESHOLD) {
      return NextResponse.json({ 
        success: true,
        message: `Balance ${status.pendingFees.toFixed(4)} SOL below threshold ${MIN_CLAIM_THRESHOLD} SOL`,
        pendingFees: status.pendingFees,
        claimed: false
      });
    }

    const result = await claimCreatorFees(tokenMint);

    if (result.success) {
      console.log(`[AUTO-CLAIM] Claimed ${result.amountClaimed?.toFixed(4)} SOL - Signature: ${result.signature}`);
    }

    return NextResponse.json({ 
      ...result,
      claimed: result.success,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-claim error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
