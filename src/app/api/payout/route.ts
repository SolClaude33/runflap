import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
  try {
    const { winnerWallet, totalPool, raceId } = await request.json();

    if (!winnerWallet || !totalPool || totalPool <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const privateKey = process.env.SOLANA_HOUSE_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ success: false, error: 'House wallet not configured' }, { status: 500 });
    }

    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const houseKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    const winnerPubKey = new PublicKey(winnerWallet);
    
    const winnerAmount = Math.floor(totalPool * 0.95 * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: houseKeypair.publicKey,
        toPubkey: winnerPubKey,
        lamports: winnerAmount,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = houseKeypair.publicKey;

    transaction.sign(houseKeypair);
    
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`Race ${raceId}: Paid ${totalPool * 0.95} SOL to ${winnerWallet} - Signature: ${signature}`);

    return NextResponse.json({ 
      success: true, 
      signature,
      amount: totalPool * 0.95,
      houseRake: totalPool * 0.05
    });
  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
