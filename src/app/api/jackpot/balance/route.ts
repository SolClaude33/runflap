import { NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

export async function GET() {
  try {
    const privateKey = process.env.CREATOR_WALLET_PRIVATE_KEY;
    const tokenMint = process.env.TOKEN_MINT_ADDRESS;

    if (!privateKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Creator wallet not configured' 
      }, { status: 500 });
    }

    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const creatorKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));

    const jackpotBalance = await connection.getBalance(creatorKeypair.publicKey);
    let pendingFees = 0;

    if (tokenMint && tokenMint.length >= 32) {
      try {
        const mintPubkey = new PublicKey(tokenMint);
        const [bondingCurve] = PublicKey.findProgramAddressSync(
          [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
          PUMP_PROGRAM_ID
        );

        const bondingCurveInfo = await connection.getAccountInfo(bondingCurve);
        if (bondingCurveInfo) {
          const creatorFromBondingCurve = new PublicKey(bondingCurveInfo.data.slice(8, 40));
          
          const [creatorVault] = PublicKey.findProgramAddressSync(
            [Buffer.from('creator-vault'), creatorFromBondingCurve.toBuffer()],
            PUMP_PROGRAM_ID
          );

          pendingFees = await connection.getBalance(creatorVault) / LAMPORTS_PER_SOL;
        }
      } catch (e) {
        console.error('Error fetching pending fees:', e);
      }
    }

    const totalJackpot = (jackpotBalance / LAMPORTS_PER_SOL) + pendingFees;

    return NextResponse.json({ 
      success: true,
      jackpotBalance: jackpotBalance / LAMPORTS_PER_SOL,
      pendingFees,
      totalJackpot,
      jackpotWallet: creatorKeypair.publicKey.toBase58(),
      tokenConfigured: !!tokenMint,
      solscanUrl: `https://solscan.io/account/${creatorKeypair.publicKey.toBase58()}`
    });

  } catch (error) {
    console.error('Jackpot balance error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
