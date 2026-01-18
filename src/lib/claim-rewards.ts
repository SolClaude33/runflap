import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Keypair,
  TransactionInstruction
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';

const SOLANA_RPC = process.env.HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const GLOBAL_ACCOUNT = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
const COLLECT_CREATOR_FEE_DISCRIMINATOR = Buffer.from([155, 148, 92, 48, 40, 78, 233, 156]);
const MIN_CLAIM_THRESHOLD = 0.01;

export interface ClaimResult {
  success: boolean;
  signature?: string;
  amountClaimed?: number;
  creatorVault?: string;
  solscanUrl?: string;
  error?: string;
}

export interface VaultStatus {
  creatorWallet: string;
  creatorBalance: number;
  creatorVault: string | null;
  pendingFees: number;
  tokenMintConfigured: boolean;
  solscanUrl: string;
}

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed');
}

export function getCreatorKeypair(): Keypair | null {
  const privateKey = process.env.CREATOR_WALLET_PRIVATE_KEY;
  if (!privateKey) return null;
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

export async function getVaultStatus(tokenMint?: string): Promise<VaultStatus | null> {
  const creatorKeypair = getCreatorKeypair();
  if (!creatorKeypair) return null;

  const connection = getConnection();
  const creatorBalance = await connection.getBalance(creatorKeypair.publicKey);
  
  let pendingFees = 0;
  let creatorVaultAddress: string | null = null;
  const mint = tokenMint || process.env.TOKEN_MINT_ADDRESS;

  if (mint && mint.length >= 32) {
    try {
      const mintPubkey = new PublicKey(mint);
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

        creatorVaultAddress = creatorVault.toBase58();
        pendingFees = await connection.getBalance(creatorVault) / LAMPORTS_PER_SOL;
      }
    } catch (e) {
      console.error('Error fetching creator vault:', e);
    }
  }

  return {
    creatorWallet: creatorKeypair.publicKey.toBase58(),
    creatorBalance: creatorBalance / LAMPORTS_PER_SOL,
    creatorVault: creatorVaultAddress,
    pendingFees,
    tokenMintConfigured: !!mint,
    solscanUrl: `https://solscan.io/account/${creatorKeypair.publicKey.toBase58()}`
  };
}

export async function claimCreatorFees(tokenMint: string): Promise<ClaimResult> {
  try {
    const creatorKeypair = getCreatorKeypair();
    if (!creatorKeypair) {
      return { success: false, error: 'Creator wallet not configured' };
    }

    if (!tokenMint) {
      return { success: false, error: 'Token mint address required' };
    }

    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
      PUMP_PROGRAM_ID
    );

    const bondingCurveInfo = await connection.getAccountInfo(bondingCurve);
    if (!bondingCurveInfo) {
      return { 
        success: false, 
        error: 'Bonding curve not found for this token',
        creatorVault: bondingCurve.toBase58()
      };
    }

    const creatorFromBondingCurve = new PublicKey(bondingCurveInfo.data.slice(8, 40));

    const [creatorVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('creator-vault'), creatorFromBondingCurve.toBuffer()],
      PUMP_PROGRAM_ID
    );

    const vaultBalance = await connection.getBalance(creatorVault);
    const vaultBalanceSOL = vaultBalance / LAMPORTS_PER_SOL;

    if (vaultBalanceSOL < MIN_CLAIM_THRESHOLD) {
      return { 
        success: false, 
        error: `Balance below threshold (${MIN_CLAIM_THRESHOLD} SOL)`,
        amountClaimed: vaultBalanceSOL,
        creatorVault: creatorVault.toBase58()
      };
    }

    const creatorTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      creatorKeypair.publicKey,
      false
    );

    const keys = [
      { pubkey: GLOBAL_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: creatorKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const collectFeeInstruction = new TransactionInstruction({
      programId: PUMP_PROGRAM_ID,
      keys,
      data: COLLECT_CREATOR_FEE_DISCRIMINATOR,
    });

    const transaction = new Transaction().add(collectFeeInstruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorKeypair.publicKey;
    transaction.sign(creatorKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`Creator fees claimed: ${vaultBalanceSOL} SOL - Signature: ${signature}`);

    return { 
      success: true, 
      signature,
      amountClaimed: vaultBalanceSOL,
      creatorVault: creatorVault.toBase58(),
      solscanUrl: `https://solscan.io/tx/${signature}`
    };

  } catch (error) {
    console.error('Claim rewards error:', error);
    return { success: false, error: String(error) };
  }
}

export { PUMP_PROGRAM_ID, MIN_CLAIM_THRESHOLD };
