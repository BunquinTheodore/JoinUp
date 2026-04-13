import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';
import { getMockChatMessages } from '../lib/mockChats';

function mapMessage(row: any): Message {
  return {
    id: row.id,
    activityId: row.activity_id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? '',
    senderPhoto: row.sender_photo ?? '',
    text: row.text ?? undefined,
    imageUrl: row.image_url ?? undefined,
    location:
      row.location_lat != null && row.location_lng != null
        ? { lat: row.location_lat, lng: row.location_lng }
        : undefined,
    type: row.type,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
  };
}

export function useChat(activityId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMockThread = activityId.startsWith('mock-');

  useEffect(() => {
    let isActive = true;

    const fetchMessages = async () => {
      try {
        if (isMockThread) {
          if (isActive) {
            setMessages(getMockChatMessages(activityId));
          }
          return;
        }

        const { data, error } = await supabase
          .from('messages_full')
          .select('*')
          .eq('activity_id', activityId)
          .order('created_at', { ascending: true });

        if (!error && data && isActive) {
          setMessages(data.map(mapMessage));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchMessages();

    if (isMockThread) {
      return () => {
        isActive = false;
      };
    }

    const channel = supabase
      .channel(`chat:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `activity_id=eq.${activityId}`,
        },
        async (payload: any) => {
          const { data } = await supabase
            .from('messages_full')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((message) => message.id === data.id)) return prev;
              return [...prev, mapMessage(data)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [activityId, isMockThread]);

  const sendMessage = useCallback(
    async (text: string, senderId: string, senderName: string) => {
      if (isMockThread) {
        const mockMessage: Message = {
          id: `${activityId}-local-${Date.now()}`,
          activityId,
          senderId,
          senderName,
          senderPhoto: '',
          text,
          type: 'text',
          isPinned: false,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, mockMessage]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          activity_id: activityId,
          sender_id: senderId,
          text,
          type: 'text',
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.id)) return prev;
          return [
            ...prev,
            mapMessage({ ...data, sender_name: senderName, sender_photo: '' }),
          ];
        });
      }
    },
    [activityId, isMockThread]
  );

  const sendImage = useCallback(
    async (imageUrl: string, senderId: string, senderName: string) => {
      if (isMockThread) {
        const mockMessage: Message = {
          id: `${activityId}-local-image-${Date.now()}`,
          activityId,
          senderId,
          senderName,
          senderPhoto: '',
          imageUrl,
          type: 'image',
          isPinned: false,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, mockMessage]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          activity_id: activityId,
          sender_id: senderId,
          image_url: imageUrl,
          type: 'image',
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.id)) return prev;
          return [
            ...prev,
            mapMessage({ ...data, sender_name: senderName, sender_photo: '' }),
          ];
        });
      }
    },
    [activityId, isMockThread]
  );

  const sendLocation = useCallback(
    async (lat: number, lng: number, senderId: string, senderName: string) => {
      if (isMockThread) {
        const mockMessage: Message = {
          id: `${activityId}-local-location-${Date.now()}`,
          activityId,
          senderId,
          senderName,
          senderPhoto: '',
          location: { lat, lng },
          type: 'location',
          isPinned: false,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, mockMessage]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          activity_id: activityId,
          sender_id: senderId,
          location_lat: lat,
          location_lng: lng,
          type: 'location',
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.id)) return prev;
          return [
            ...prev,
            mapMessage({ ...data, sender_name: senderName, sender_photo: '' }),
          ];
        });
      }
    },
    [activityId, isMockThread]
  );

  const pinnedMessage = messages.find((message) => message.isPinned) ?? null;

  return { messages, isLoading, sendMessage, sendImage, sendLocation, pinnedMessage };
}
