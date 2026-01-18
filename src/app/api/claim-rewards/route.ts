import { NextRequest, NextResponse } from 'next/server';
import { claimCreatorFees, getVaultStatus } from '@/lib/claim-rewards';

export const dynamic = 'force-dynamic';

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

    const { tokenMint } = await request.json();

    if (!tokenMint) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token mint address required' 
      }, { status: 400 });
    }

    const result = await claimCreatorFees(tokenMint);
    
    if (!result.success) {
      return NextResponse.json(result, { status: result.error?.includes('not found') ? 404 : 400 });
    }

    return NextResponse.json(result);

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
    const status = await getVaultStatus();
    
    if (!status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Creator wallet not configured' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Get rewards status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
