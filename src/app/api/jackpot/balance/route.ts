import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

// Para BNB, el jackpot se maneja en el contrato
// Esta es una versión simplificada que retorna datos básicos
export async function GET() {
  try {
    // En el futuro, esto puede leer del contrato de BNB
    // Por ahora retornamos valores por defecto
    
    return NextResponse.json({ 
      success: true,
      jackpotBalance: 0,
      pendingFees: 0,
      totalJackpot: 0,
      jackpotWallet: '',
      tokenConfigured: false,
      solscanUrl: ''
    });

  } catch (error) {
    console.error('Jackpot balance error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
