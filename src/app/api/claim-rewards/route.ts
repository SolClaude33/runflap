import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint simplificado para BNB
// El sistema de recompensas ahora se maneja en el contrato
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Para BNB, las recompensas se manejan en el contrato
    return NextResponse.json({ 
      success: true,
      message: 'Rewards are now handled by the smart contract'
    });

  } catch (error) {
    console.error('Claim rewards error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Para BNB, el estado se obtiene del contrato
    return NextResponse.json({ 
      success: true,
      message: 'Rewards status is now handled by the smart contract'
    });

  } catch (error) {
    console.error('Get rewards status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
