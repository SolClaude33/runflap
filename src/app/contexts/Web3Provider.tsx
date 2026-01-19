'use client';

import { FC, ReactNode, useMemo, useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';

interface UserProfile {
  walletAddress: string;
  displayName: string;
  createdAt: number;
}

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  balance: number;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  isProfileComplete: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  account: null,
  balance: 0,
  userProfile: null,
  setUserProfile: () => {},
  isProfileComplete: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnected: false,
});

export const useWeb3Context = () => useContext(Web3Context);

// Additional WebSocket RPCs (for direct ethers.js connections if needed)
// wss://bsc-rpc.publicnode.com
// wss://bsc.drpc.org

// BNB Smart Chain Mainnet
const BSC_MAINNET = {
  chainId: '0x38', // 56 in decimal
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc-dataseed3.binance.org/',
    'https://bsc-dataseed4.binance.org/',
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed1.nodereal.io',
    'https://bsc.blockrazor.xyz',
    'https://public-bsc-mainnet.fastnode.io',
  ],
  blockExplorerUrls: ['https://bscscan.com/'],
};

// BNB Smart Chain Testnet (para desarrollo)
const BSC_TESTNET = {
  chainId: '0x61', // 97 in decimal
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://data-seed-prebsc-1-s2.binance.org:8545/',
    'https://data-seed-prebsc-2-s1.binance.org:8545/',
    'https://data-seed-prebsc-2-s2.binance.org:8545/',
    'https://data-seed-prebsc-1-s3.binance.org:8545/',
  ],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

// Usar testnet por defecto (cambiar a mainnet en producción)
const CHAIN_CONFIG = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? BSC_MAINNET : BSC_TESTNET;

export const Web3Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Verificar si MetaMask está instalado
  const checkMetaMask = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return true;
    }
    return false;
  };

  // Conectar wallet
  const connectWallet = async () => {
    if (!checkMetaMask()) {
      alert('Por favor instala MetaMask para continuar');
      return;
    }

    try {
      // Verificar que window.ethereum esté disponible
      if (!window.ethereum) {
        throw new Error('MetaMask no está disponible');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Solicitar conexión con timeout
      try {
        await Promise.race([
          provider.send('eth_requestAccounts', []),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout al conectar')), 10000)
          )
        ]);
      } catch (error: any) {
        if (error.message === 'Timeout al conectar') {
          throw new Error('Tiempo de espera agotado. Por favor intenta de nuevo.');
        }
        throw error;
      }
      
      // Esperar un momento para que MetaMask se sincronice
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar/cambiar a BSC
      let network;
      try {
        network = await provider.getNetwork();
      } catch (error) {
        console.error('Error getting network:', error);
        // Intentar de nuevo después de un momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        network = await provider.getNetwork();
      }
      
      const chainId = `0x${network.chainId.toString(16)}`;
      
      if (chainId !== CHAIN_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainId }],
          });
          // Esperar a que la red cambie
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          // Si la red no existe, agregarla
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [CHAIN_CONFIG],
            });
            // Esperar a que la red se agregue
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw switchError;
          }
        }
      }

      // Obtener signer y datos con manejo de errores
      let signer, address, bal;
      try {
        signer = await provider.getSigner();
        address = await signer.getAddress();
        
        // Intentar obtener balance con retry
        let retries = 3;
        while (retries > 0) {
          try {
            bal = await provider.getBalance(address);
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error('Error getting signer/balance:', error);
        throw new Error('Error al obtener información de la wallet. Por favor intenta de nuevo.');
      }
      
      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setBalance(parseFloat(ethers.formatEther(bal)));
      setIsConnected(true);

      // Escuchar cambios de cuenta (solo si no están ya registrados)
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      const errorMessage = error.message || 'Error al conectar la wallet. Por favor intenta de nuevo.';
      alert(errorMessage);
    }
  };

  // Desconectar wallet
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setBalance(0);
    setIsConnected(false);
    setUserProfile(null);
    
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };

  // Manejar cambio de cuentas
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (account && accounts[0] !== account) {
      connectWallet();
    }
  };

  // Manejar cambio de red
  const handleChainChanged = () => {
    window.location.reload();
  };

  // Auto-conectar si ya estaba conectado
  useEffect(() => {
    if (checkMetaMask() && window.ethereum.selectedAddress) {
      connectWallet();
    }
  }, []);

  // Actualizar balance periódicamente
  useEffect(() => {
    if (!provider || !account) return;

    const updateBalance = async () => {
      try {
        // Agregar timeout para evitar que se quede colgado
        const bal = await Promise.race([
          provider.getBalance(account),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        setBalance(parseFloat(ethers.formatEther(bal)));
      } catch (error) {
        // Silenciar errores de timeout o RPC para no spamear la consola
        if (error instanceof Error && error.message !== 'Timeout') {
          console.error('Error fetching balance:', error);
        }
      }
    };

    updateBalance();
    const interval = setInterval(updateBalance, 30000); // Aumentar intervalo a 30s para reducir carga
    return () => clearInterval(interval);
  }, [provider, account]);

  const isProfileComplete = isConnected && userProfile !== null && userProfile.displayName.length > 0;

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        balance,
        userProfile,
        setUserProfile,
        isProfileComplete,
        connectWallet,
        disconnectWallet,
        isConnected,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// Extender Window interface para TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
