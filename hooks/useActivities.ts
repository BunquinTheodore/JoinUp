import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Activity } from '../types';

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: {
      name: row.location_name,
      lat: row.location_lat,
      lng: row.location_lng,
    },
    dateTime: row.date_time,
    maxSlots: row.max_slots,
    currentSlots: row.current_slots ?? row.max_slots,
    participants: row.participant_ids ?? [],
    hostId: row.host_id,
    hostName: row.host_name ?? '',
    hostPhoto: row.host_photo ?? '',
    coverImage: row.cover_image ?? undefined,
    requiresApproval: row.requires_approval,
    reactions: {
      fire: row.reaction_fire ?? 0,
      heart: row.reaction_heart ?? 0,
      like: row.reaction_like ?? 0,
    },
    status: row.status,
    createdAt: row.created_at,
  };
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('activities_full')
        .select('*')
        .eq('status', 'active')
        .order('date_time', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        // Fetch participant IDs for each activity
        const activityIds = data.map((a: any) => a.id);
        const { data: parts } = await supabase
          .from('participants')
          .select('activity_id, user_id')
          .in('activity_id', activityIds.length > 0 ? activityIds : ['__none__'])
          .eq('status', 'joined');

        const participantMap: Record<string, string[]> = {};
        (parts ?? []).forEach((p: any) => {
          if (!participantMap[p.activity_id]) participantMap[p.activity_id] = [];
          participantMap[p.activity_id].push(p.user_id);
        });

        setActivities(
          data.map((row: any) =>
            mapActivity({ ...row, participant_ids: participantMap[row.id] ?? [] })
          )
        );
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const joinActivity = useCallback(async (activityId: string, userId: string) => {
    try {
      const { error: joinError } = await supabase
        .from('participants')
        .insert({ activity_id: activityId, user_id: userId, status: 'joined' });

      if (joinError) throw joinError;

      // Optimistic update
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? {
                ...a,
                currentSlots: a.currentSlots - 1,
                participants: [...a.participants, userId],
              }
            : a
        )
      );
    } catch (err: any) {
      setError(err.message ?? 'Failed to join activity');
    }
  }, []);

  const leaveActivity = useCallback(async (activityId: string, userId: string) => {
    try {
      const { error: leaveError } = await supabase
        .from('participants')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId);

      if (leaveError) throw leaveError;

      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? {
                ...a,
                currentSlots: a.currentSlots + 1,
                participants: a.participants.filter((p) => p !== userId),
              }
            : a
        )
      );
    } catch (err: any) {
      setError(err.message ?? 'Failed to leave activity');
    }
  }, []);

  const getActivity = useCallback(
    (id: string) => activities.find((a) => a.id === id) ?? null,
    [activities]
  );

  return {
    activities,
    isLoading,
    error,
    joinActivity,
    leaveActivity,
    getActivity,
    refetch: fetchActivities,
  };
}
