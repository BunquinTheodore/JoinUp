import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

function mapMessage(row: any): Message {
  return {
    id: row.id,
    activityId: row.activity_id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? '',
    senderPhoto: row.sender_photo ?? '',
    text: row.text ?? undefined,
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

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages_full')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data.map(mapMessage));
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages in realtime
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
        async (payload) => {
          const { data } = await supabase
            .from('messages_full')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, mapMessage(data)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId]);

  const sendMessage = useCallback(
    async (text: string, senderId: string, senderName: string) => {
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
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            mapMessage({ ...data, sender_name: senderName, sender_photo: '' }),
          ];
        });
      }
    },
    [activityId]
  );

  const sendLocation = useCallback(
    async (lat: number, lng: number, senderId: string, senderName: string) => {
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
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            mapMessage({ ...data, sender_name: senderName, sender_photo: '' }),
          ];
        });
      }
    },
    [activityId]
  );

  const pinnedMessage = messages.find((m) => m.isPinned) ?? null;

  return { messages, isLoading, sendMessage, sendLocation, pinnedMessage };
}
