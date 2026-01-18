import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint simplificado para BNB
// Los webhooks de Pumpfun ya no son necesarios para BNB
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Para BNB, los webhooks de Pumpfun ya no son necesarios
    return NextResponse.json({ 
      success: true,
      message: 'Pumpfun webhooks are not needed for BNB chain'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
