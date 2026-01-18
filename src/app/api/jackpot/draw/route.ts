import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

interface ActiveBettor {
  user: string;
  userAddress: string;
}

// Endpoint simplificado para BNB
// El sistema de jackpot ahora se maneja en el contrato
export async function POST(request: NextRequest) {
  try {
    const { raceNumber, activeBettors, adminSecret } = await request.json();

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Para BNB, el jackpot se maneja directamente en el contrato
    // Este endpoint puede ser usado para lógica adicional si es necesario
    
    return NextResponse.json({ 
      success: true,
      message: 'Jackpot system now handled by smart contract',
      raceNumber
    });

  } catch (error) {
    console.error('Jackpot draw error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
