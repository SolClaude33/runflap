'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3Context } from '../../contexts/Web3Provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { account, setUserProfile } = useWeb3Context();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (account) {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', account));
          if (profileDoc.exists()) {
            const profile = profileDoc.data();
            setDisplayName(profile.displayName);
            setUserProfile({
              walletAddress: account,
              displayName: profile.displayName,
              createdAt: profile.createdAt,
            });
            onClose();
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      }
    };
    if (isOpen) {
      loadProfile();
    }
  }, [account, isOpen, setUserProfile, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (displayName.trim().length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    if (displayName.trim().length > 20) {
      setError('Name must be less than 20 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const profileData = {
        walletAddress: account,
        displayName: displayName.trim(),
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'profiles', account), profileData);
      setUserProfile(profileData);
      onClose();
    } catch (e) {
      console.error('Error saving profile:', e);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-green-800 rounded-xl p-6 w-full max-w-md border-2 border-green-500 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-green-300 hover:text-white transition-colors text-2xl font-bold leading-none"
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">Set Your Display Name</h2>
        <p className="text-green-200 mb-4">
          Choose a name to display in chat and on the leaderboard.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            className="w-full px-4 py-3 rounded-lg bg-green-900 text-white border border-green-600 focus:border-green-400 focus:outline-none mb-2"
            maxLength={20}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <p className="text-green-400 text-xs mb-4">
            Wallet: {account?.slice(0, 8)}...{account?.slice(-8)}
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-green-500 hover:bg-green-400 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
