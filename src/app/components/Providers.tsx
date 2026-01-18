'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from '../contexts/Web3Provider';

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <Web3Provider>
      <Toaster />
      {children}
    </Web3Provider>
  );
};
