import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HOUSE_WALLET = process.env.NEXT_PUBLIC_SOLANA_HOUSE_WALLET || '';
const HOUSE_PRIVATE_KEY = process.env.SOLANA_HOUSE_PRIVATE_KEY || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

interface ActiveBettor {
  user: string;
  userAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const { raceNumber, activeBettors, adminSecret } = await request.json();

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!activeBettors || activeBettors.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active bettors for jackpot draw',
        raceNumber 
      });
    }

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
        balance: jackpotSOL 
      });
    }

    const randomIndex = Math.floor(Math.random() * activeBettors.length);
    const winner: ActiveBettor = activeBettors[randomIndex];

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

    return NextResponse.json({
      success: true,
      winner: winner.user,
      winnerAddress: winner.userAddress,
      amount: amountWon,
      raceNumber,
      signature,
      totalParticipants: activeBettors.length,
      solscanUrl: `https://solscan.io/tx/${signature}`,
    });

  } catch (error) {
    console.error('Jackpot draw error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Jackpot draw failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminSecret = searchParams.get('adminSecret');

  if (adminSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rpcUrl = HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    const connection = new Connection(rpcUrl, 'confirmed');
    const housePublicKey = new PublicKey(HOUSE_WALLET);
    const balance = await connection.getBalance(housePublicKey);

    return NextResponse.json({
      success: true,
      jackpotBalance: balance / LAMPORTS_PER_SOL,
      houseWallet: HOUSE_WALLET,
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get balance' 
    }, { status: 500 });
  }
}
