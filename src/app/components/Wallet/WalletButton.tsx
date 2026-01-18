'use client';

import { useWeb3Context } from '../../contexts/Web3Provider';
import { FaWallet } from 'react-icons/fa';

export const WalletButton = () => {
  const { isConnected, account, connectWallet, disconnectWallet, balance } = useWeb3Context();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-[#0a2818] rounded-lg px-3 py-1 text-xs border border-[#2d6b4a]">
          <span className="text-[#7cb894]">{balance.toFixed(4)} BNB</span>
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-green-600 hover:bg-green-500 rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2 text-white border border-green-400"
        >
          <FaWallet />
          {formatAddress(account)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="bg-green-600 hover:bg-green-500 rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2 text-white border border-green-400"
    >
      <FaWallet />
      Connect Wallet
    </button>
  );
};
