import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Activity } from '../types';
import { MOCK_ACTIVITIES } from '../lib/mockActivities';
import { useActivityStore } from '../store/activityStore';
import { useAuthStore } from '../store/authStore';

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
  const activities = useActivityStore((state) => state.activities);
  const setActivities = useActivityStore((state) => state.setActivities);
  const updateActivity = useActivityStore((state) => state.updateActivity);
  const removeActivity = useActivityStore((state) => state.removeActivity);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMockActivity = useCallback(
    (activityId: string) => activityId.startsWith('mock-'),
    []
  );

  const mergeActivities = useCallback((incoming: Activity[]) => {
    const merged = new Map<string, Activity>();

    MOCK_ACTIVITIES.forEach((activity) => {
      merged.set(activity.id, activity);
    });

    incoming.forEach((activity) => {
      merged.set(activity.id, activity);
    });

    return Array.from(merged.values()).sort(
      (left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime()
    );
  }, []);

  const syncJoinedActivities = useCallback(
    async (activityId: string, joined: boolean) => {
      if (!user) return;

      const currentJoined = user.activitiesJoined ?? [];
      const nextJoined = joined
        ? Array.from(new Set([...currentJoined, activityId]))
        : currentJoined.filter((joinedActivityId) => joinedActivityId !== activityId);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ activities_joined: nextJoined })
        .eq('id', user.uid);

      if (profileError) {
        throw profileError;
      }

      updateUser({ activitiesJoined: nextJoined });
      return nextJoined;
    },
    [updateUser, user]
  );

  const enrichActivitiesForUser = useCallback(
    (incoming: Activity[]) => {
      if (!user?.uid || !user.activitiesJoined?.length) {
        return incoming;
      }

      const joinedActivityIds = new Set(user.activitiesJoined);

      return incoming.map((activity) => {
        if (!joinedActivityIds.has(activity.id) || activity.participants.includes(user.uid)) {
          return activity;
        }

        return {
          ...activity,
          currentSlots: Math.max(0, activity.currentSlots - 1),
          participants: [...activity.participants, user.uid],
        };
      });
    },
    [user]
  );

  const fetchActivities = useCallback(async () => {
    try {
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
        let parts: Array<{ activity_id: string; user_id: string }> = [];

        if (activityIds.length > 0) {
          const { data: participantsData, error: participantsError } = await supabase
            .from('participants')
            .select('activity_id, user_id')
            .in('activity_id', activityIds)
            .eq('status', 'joined');

          if (participantsError) throw participantsError;
          parts = participantsData ?? [];
        }

        const participantMap: Record<string, string[]> = {};
        (parts ?? []).forEach((p: any) => {
          if (!participantMap[p.activity_id]) participantMap[p.activity_id] = [];
          participantMap[p.activity_id].push(p.user_id);
        });

        const remoteActivities = data.map((row: any) =>
          mapActivity({ ...row, participant_ids: participantMap[row.id] ?? [] })
        );

        setActivities(mergeActivities(enrichActivitiesForUser(remoteActivities)));
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load activities');
    }
  }, [enrichActivitiesForUser, mergeActivities, setActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const joinActivity = useCallback(async (activityId: string, userId: string): Promise<boolean> => {
    try {
      const currentActivity = activities.find((activity) => activity.id === activityId);

      if (!currentActivity) return false;

      if (!isMockActivity(activityId)) {
        const { error: joinError } = await supabase
          .from('participants')
          .insert({ activity_id: activityId, user_id: userId, status: 'joined' });

        if (joinError) throw joinError;
      }

      await syncJoinedActivities(activityId, true);

      updateActivity({
        ...currentActivity,
        currentSlots: Math.max(0, currentActivity.currentSlots - 1),
        participants: currentActivity.participants.includes(userId)
          ? currentActivity.participants
          : [...currentActivity.participants, userId],
      });

      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to join activity');
      return false;
    }
  }, [activities, isMockActivity, syncJoinedActivities, updateActivity]);

  const leaveActivity = useCallback(async (activityId: string, userId: string): Promise<boolean> => {
    try {
      const currentActivity = activities.find((activity) => activity.id === activityId);

      if (!currentActivity) return false;

      if (!isMockActivity(activityId)) {
        const { error: leaveError } = await supabase
          .from('participants')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', userId);

        if (leaveError) throw leaveError;
      }

      await syncJoinedActivities(activityId, false);

      updateActivity({
        ...currentActivity,
        currentSlots: currentActivity.currentSlots + 1,
        participants: currentActivity.participants.filter((participant) => participant !== userId),
      });

      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to leave activity');
      return false;
    }
  }, [activities, isMockActivity, syncJoinedActivities, updateActivity]);

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
