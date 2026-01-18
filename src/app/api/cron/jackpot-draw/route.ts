import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';

// Endpoint simplificado para BNB
// El sistema de jackpot ahora se maneja en el contrato
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Para BNB, el jackpot se maneja directamente en el contrato
    // Este endpoint puede ser usado para lógica adicional si es necesario
    
    return NextResponse.json({
      success: true,
      message: 'Jackpot system now handled by smart contract',
      checked: true,
    });

  } catch (error) {
    console.error('Cron jackpot draw error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
