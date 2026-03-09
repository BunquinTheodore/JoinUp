import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types';

const makeTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

const MOCK_MESSAGES: Record<string, Message[]> = {
  'act-1': [
    {
      id: 'msg-0',
      activityId: 'act-1',
      senderId: 'system',
      senderName: 'System',
      senderPhoto: '',
      text: 'Sarah created the activity',
      type: 'system',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 30)),
    },
    {
      id: 'msg-1',
      activityId: 'act-1',
      senderId: 'user-2',
      senderName: 'Sarah',
      senderPhoto: '',
      text: 'Hey everyone! Looking forward to our yoga session tomorrow!',
      type: 'text',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 32)),
    },
    {
      id: 'msg-2',
      activityId: 'act-1',
      senderId: 'user-3',
      senderName: 'Mike',
      senderPhoto: '',
      text: 'Same here! What should we bring?',
      type: 'text',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 35)),
    },
    {
      id: 'msg-3',
      activityId: 'act-1',
      senderId: 'user-1',
      senderName: 'Marco Silva',
      senderPhoto: '',
      text: 'Just a yoga mat and water bottle!',
      type: 'text',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 36)),
    },
    {
      id: 'msg-4',
      activityId: 'act-1',
      senderId: 'user-2',
      senderName: 'Sarah',
      senderPhoto: '',
      text: "Perfect! I'll bring some extra mats just in case anyone forgets 😊",
      type: 'text',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 37)),
    },
    {
      id: 'msg-5',
      activityId: 'act-1',
      senderId: 'user-1',
      senderName: 'Marco Silva',
      senderPhoto: '',
      text: "That's really thoughtful, thanks!",
      type: 'text',
      isPinned: false,
      createdAt: makeTimestamp(new Date(2026, 2, 4, 10, 38)),
    },
  ],
};

export function useChat(activityId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate realtime listener
    const timer = setTimeout(() => {
      setMessages(MOCK_MESSAGES[activityId] ?? []);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [activityId]);

  const sendMessage = useCallback(
    async (text: string, senderId: string, senderName: string) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        activityId,
        senderId,
        senderName,
        senderPhoto: '',
        text,
        type: 'text',
        isPinned: false,
        createdAt: makeTimestamp(new Date()),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    [activityId]
  );

  const sendLocation = useCallback(
    async (lat: number, lng: number, senderId: string, senderName: string) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        activityId,
        senderId,
        senderName,
        senderPhoto: '',
        location: { lat, lng },
        type: 'location',
        isPinned: false,
        createdAt: makeTimestamp(new Date()),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    [activityId]
  );

  const pinnedMessage = messages.find((m) => m.isPinned) ?? null;

  return { messages, isLoading, sendMessage, sendLocation, pinnedMessage };
}
