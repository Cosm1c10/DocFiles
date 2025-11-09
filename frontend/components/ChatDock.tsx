'use client';

// =====================================================================
// Chat Dock - Floating chat widget for doctor-patient messaging
// =====================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  created_at: string;
  read_at?: string;
  sender_name?: string;
}

export default function ChatDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [isOpen, selectedRecipient]);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedRecipient) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .or(`sender_id.eq.${selectedRecipient},recipient_id.eq.${selectedRecipient}`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      const unreadIds = data?.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }

      updateUnreadCount();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-realtime')
      .on('broadcast', { event: 'new_message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as Message]);
        updateUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/messages_send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipient_id: selectedRecipient,
            content: newMessage,
            message_type: 'text',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300 z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6 text-white" aria-hidden="true" />
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
              <h3 className="text-white font-semibold">Messages</h3>
              <p className="text-white/80 text-xs mt-1">
                {selectedRecipient ? 'Chat with patient' : 'Select a conversation'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No messages yet
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id !== selectedRecipient;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[80%] px-4 py-2 rounded-2xl
                          ${
                            isOwn
                              ? 'bg-[#0A84FF] text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedRecipient && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end space-x-2">
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                    aria-label="Attach file"
                  >
                    <PaperClipIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                  </button>

                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0A84FF] text-sm"
                    rows={2}
                    disabled={sending}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className={`
                      p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0A84FF]
                      ${
                        newMessage.trim() && !sending
                          ? 'bg-[#0A84FF] text-white hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                    aria-label="Send message"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            )}

            {!selectedRecipient && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Start a conversation by selecting a patient from your appointments
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
