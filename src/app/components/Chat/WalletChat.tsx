'use client';

import { useState, useEffect, useRef } from 'react';
import { useWeb3Context } from '../../contexts/Web3Provider';
import { FaPaperPlane, FaWallet } from 'react-icons/fa';
import { subscribeToChatMessages, sendChatMessage, ChatMessage } from '../../firebase';

export default function WalletChat() {
  const { account, isConnected, userProfile, isProfileComplete } = useWeb3Context();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages((newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isProfileComplete || !account || sending) return;

    setSending(true);
    const senderAddress = account.slice(0, 4) + '...' + account.slice(-4);
    
    try {
      await sendChatMessage(
        userProfile?.displayName || 'Anonymous',
        senderAddress,
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#1a4a2e] rounded-lg overflow-hidden border-2 border-[#2d6b4a]">
      <div className="bg-[#0d3320] p-3 text-center">
        <h3 className="text-white font-bold">Race Chat</h3>
        <p className="text-[#7cb894] text-xs">
          {isConnected ? (isProfileComplete ? `Chatting as ${userProfile?.displayName}` : 'Set up profile to chat') : 'Connect wallet to chat'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-[#7cb894] text-sm py-4">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-[#0d3320] rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#d4a517] font-bold text-sm">{msg.sender}</span>
                <span className="text-white/60 text-xs">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
              <p className="text-[#7cb894] text-xs mt-1">{msg.senderAddress}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-[#0d3320]">
        {!isConnected ? (
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm py-2">
            <FaWallet />
            <span>Connect wallet to chat</span>
          </div>
        ) : !isProfileComplete ? (
          <div className="text-center text-white/80 text-sm py-2">
            Set up your profile to start chatting
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-[#0a2818] text-white rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2d6b4a] border border-[#2d6b4a]"
              maxLength={200}
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="bg-[#2d6b4a] hover:bg-[#3d8b5a] disabled:bg-[#1a4a2e] text-white p-2 rounded-full transition-colors"
            >
              <FaPaperPlane />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
