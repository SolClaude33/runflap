import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint simplificado para BNB
// El sistema de recompensas ahora se maneja en el contrato
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

    // Para BNB, las recompensas se manejan en el contrato
    return NextResponse.json({ 
      success: true,
      message: 'Auto-claim is now handled by the smart contract',
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
