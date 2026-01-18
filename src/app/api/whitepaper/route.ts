import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'whitepaper.pdf');
    const fileBuffer = readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="XMAS_Pumpfun_Race_Whitepaper.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving whitepaper:', error);
    return NextResponse.json({ error: 'Whitepaper not found' }, { status: 404 });
  }
}
