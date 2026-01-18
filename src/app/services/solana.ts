import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const HOUSE_WALLET = process.env.NEXT_PUBLIC_SOLANA_HOUSE_WALLET || '';

export const connection = new Connection(SOLANA_RPC, 'confirmed');

export const getHouseWalletBalance = async (): Promise<number> => {
  try {
    if (!HOUSE_WALLET) return 0;
    const pubKey = new PublicKey(HOUSE_WALLET);
    const balance = await connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting house wallet balance:', error);
    return 0;
  }
};

export const createBetTransaction = async (
  fromWallet: PublicKey,
  amount: number
): Promise<Transaction> => {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet,
      toPubkey: new PublicKey(HOUSE_WALLET),
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet;

  return transaction;
};

export const distributeWinnings = async (
  winnerWallet: string,
  totalPool: number,
  raceId: number
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    const response = await fetch('/api/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerWallet, totalPool, raceId })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error distributing winnings:', error);
    return { success: false, error: String(error) };
  }
};

export const verifyTransaction = async (signature: string): Promise<boolean> => {
  try {
    const result = await connection.getSignatureStatus(signature);
    return result?.value?.confirmationStatus === 'confirmed' || result?.value?.confirmationStatus === 'finalized';
  } catch {
    return false;
  }
};
