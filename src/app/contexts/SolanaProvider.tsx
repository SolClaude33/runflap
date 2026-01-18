'use client';

import { FC, ReactNode, useMemo, useState, useEffect, createContext, useContext } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

interface UserProfile {
  walletAddress: string;
  displayName: string;
  createdAt: number;
}

interface SolanaContextType {
  balance: number;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  isProfileComplete: boolean;
}

const SolanaContext = createContext<SolanaContextType>({
  balance: 0,
  userProfile: null,
  setUserProfile: () => {},
  isProfileComplete: false,
});

export const useSolanaContext = () => useContext(SolanaContext);

const SolanaContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (e) {
          console.error('Error fetching balance:', e);
          setBalance(0);
        }
      } else {
        setBalance(0);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (!connected) {
      setUserProfile(null);
    }
  }, [connected]);

  const isProfileComplete = connected && userProfile !== null && userProfile.displayName.length > 0;

  return (
    <SolanaContext.Provider value={{ balance, userProfile, setUserProfile, isProfileComplete }}>
      {children}
    </SolanaContext.Provider>
  );
};

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <SolanaContextProvider>
            {children}
          </SolanaContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
