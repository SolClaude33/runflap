import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Para BNB, los pagos se manejan directamente en el contrato
// Los usuarios llaman a claimWinnings() en el contrato
// Este endpoint ya no es necesario pero lo mantenemos por compatibilidad
export async function POST(request: NextRequest) {
  try {
    const { winnerWallet, totalPool, raceId } = await request.json();

    if (!winnerWallet || !totalPool || totalPool <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    // Para BNB, los pagos se manejan en el contrato
    // Los usuarios deben llamar a claimWinnings() directamente
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payouts are now handled by the smart contract. Users must call claimWinnings()',
      raceId
    });
  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
