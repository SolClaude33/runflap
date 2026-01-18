import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HOUSE_WALLET = process.env.NEXT_PUBLIC_SOLANA_HOUSE_WALLET || '';
const HOUSE_PRIVATE_KEY = process.env.SOLANA_HOUSE_PRIVATE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${request.nextUrl.origin}/api/jackpot/state`);
    const stateData = await response.json();
    
    if (!stateData.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not fetch jackpot state',
        checked: true 
      });
    }

    const { currentRace, nextJackpotRace, pendingDraw } = stateData;

    if (!pendingDraw) {
      return NextResponse.json({
        success: true,
        message: 'No jackpot draw pending',
        currentRace,
        nextJackpotRace,
        checked: true,
      });
    }

    const activeBettorsResponse = await fetch(
      `${request.nextUrl.origin}/api/jackpot/bettors?fromRace=${Math.max(0, currentRace - 50)}`
    );
    const bettorsData = await activeBettorsResponse.json();

    if (!bettorsData.success || !bettorsData.bettors || bettorsData.bettors.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active bettors for jackpot draw',
        currentRace,
        checked: true,
      });
    }

    const activeBettors = bettorsData.bettors;

    if (!HOUSE_PRIVATE_KEY || !HOUSE_WALLET) {
      return NextResponse.json({ 
        success: false, 
        error: 'House wallet not configured' 
      }, { status: 500 });
    }

    const rpcUrl = HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    const connection = new Connection(rpcUrl, 'confirmed');

    const housePublicKey = new PublicKey(HOUSE_WALLET);
    const jackpotBalance = await connection.getBalance(housePublicKey);
    const jackpotSOL = jackpotBalance / LAMPORTS_PER_SOL;

    if (jackpotSOL < 0.001) {
      return NextResponse.json({ 
        success: false, 
        error: 'Jackpot balance too low',
        balance: jackpotSOL,
        checked: true,
      });
    }

    const randomIndex = Math.floor(Math.random() * activeBettors.length);
    const winner = activeBettors[randomIndex];

    const reserveForFees = 0.002;
    const amountToSend = jackpotBalance - (reserveForFees * LAMPORTS_PER_SOL);

    if (amountToSend <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient balance after fees',
        balance: jackpotSOL 
      });
    }

    const houseKeypair = Keypair.fromSecretKey(bs58.decode(HOUSE_PRIVATE_KEY));
    const winnerPublicKey = new PublicKey(winner.userAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: housePublicKey,
        toPubkey: winnerPublicKey,
        lamports: Math.floor(amountToSend),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = housePublicKey;

    transaction.sign(houseKeypair);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    const amountWon = amountToSend / LAMPORTS_PER_SOL;

    await fetch(`${request.nextUrl.origin}/api/jackpot/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner: winner.user,
        winnerAddress: winner.userAddress,
        amount: amountWon,
        raceNumber: currentRace,
        secret: CRON_SECRET,
      }),
    });

    return NextResponse.json({
      success: true,
      winner: winner.user,
      winnerAddress: winner.userAddress,
      amount: amountWon,
      raceNumber: currentRace,
      signature,
      totalParticipants: activeBettors.length,
      solscanUrl: `https://solscan.io/tx/${signature}`,
    });

  } catch (error) {
    console.error('Jackpot cron error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Jackpot cron failed' 
    }, { status: 500 });
  }
}
