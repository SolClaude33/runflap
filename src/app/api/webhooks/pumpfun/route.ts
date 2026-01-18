import { NextRequest, NextResponse } from 'next/server';
import { claimCreatorFees, getVaultStatus, MIN_CLAIM_THRESHOLD } from '@/lib/claim-rewards';

export const dynamic = 'force-dynamic';

const processedSignatures = new Set<string>();
const MAX_PROCESSED_CACHE = 1000;

function validateWebhookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('HELIUS_WEBHOOK_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${webhookSecret}`;
}

function addToProcessed(signature: string) {
  if (processedSignatures.size >= MAX_PROCESSED_CACHE) {
    const firstKey = processedSignatures.values().next().value;
    if (firstKey) processedSignatures.delete(firstKey);
  }
  processedSignatures.add(signature);
}

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookAuth(request)) {
      console.log('Webhook auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('Helius webhook received:', JSON.stringify(payload).slice(0, 500));

    const transactions = Array.isArray(payload) ? payload : [payload];
    
    for (const tx of transactions) {
      const signature = tx.signature || tx.transaction?.signatures?.[0];
      
      if (signature && processedSignatures.has(signature)) {
        console.log(`Skipping duplicate: ${signature}`);
        continue;
      }
      
      if (signature) {
        addToProcessed(signature);
      }
    }

    const tokenMint = process.env.TOKEN_MINT_ADDRESS;
    if (!tokenMint) {
      console.log('TOKEN_MINT_ADDRESS not configured, skipping auto-claim');
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook received, token not configured yet' 
      });
    }

    const status = await getVaultStatus(tokenMint);
    if (!status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not get vault status' 
      });
    }

    console.log(`Vault status: ${status.pendingFees} SOL pending`);

    if (status.pendingFees >= MIN_CLAIM_THRESHOLD) {
      console.log(`Threshold met (${status.pendingFees} >= ${MIN_CLAIM_THRESHOLD}), claiming...`);
      
      const result = await claimCreatorFees(tokenMint);
      
      if (result.success) {
        console.log(`Auto-claim successful: ${result.amountClaimed} SOL`);
        return NextResponse.json({
          success: true,
          claimed: true,
          amount: result.amountClaimed,
          signature: result.signature,
          solscanUrl: result.solscanUrl
        });
      } else {
        console.error(`Auto-claim failed: ${result.error}`);
        return NextResponse.json({
          success: false,
          claimed: false,
          error: result.error
        });
      }
    }

    return NextResponse.json({
      success: true,
      claimed: false,
      pendingFees: status.pendingFees,
      threshold: MIN_CLAIM_THRESHOLD,
      message: 'Below threshold, waiting for more fees'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/pumpfun',
    description: 'Helius webhook for Pump.fun creator fee auto-claim',
    threshold: `${MIN_CLAIM_THRESHOLD} SOL`
  });
}
