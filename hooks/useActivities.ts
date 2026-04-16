import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { Activity, JoinRequestStatus } from '../types';
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
  const joinStatuses = useActivityStore((state) => state.joinStatuses);
  const setActivities = useActivityStore((state) => state.setActivities);
  const setJoinStatuses = useActivityStore((state) => state.setJoinStatuses);
  const updateActivity = useActivityStore((state) => state.updateActivity);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localJoinedIds, setLocalJoinedIds] = useState<string[]>([]);
  const joinStatusesRef = useRef<Record<string, JoinRequestStatus>>({});
  const mockDecisionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const resolverUnavailableRef = useRef(false);

  const persistLocalJoinedIds = useCallback(async (ids: string[]) => {
    if (!user?.uid) return;

    try {
      await AsyncStorage.setItem(`joinedActivities:${user.uid}`, JSON.stringify(ids));
    } catch {
      // Best-effort persistence for chat visibility fallback.
    }
  }, [user?.uid]);

  useEffect(() => {
    let isActive = true;

    const hydrateLocalJoinedIds = async () => {
      if (!user?.uid) {
        if (isActive) {
          setLocalJoinedIds([]);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(`joinedActivities:${user.uid}`);
        if (!isActive) return;

        const parsed = raw ? JSON.parse(raw) : [];
        const normalized = Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === 'string')
          : [];
        setLocalJoinedIds(normalized);
      } catch {
        if (isActive) {
          setLocalJoinedIds([]);
        }
      }
    };

    void hydrateLocalJoinedIds();

    return () => {
      isActive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    joinStatusesRef.current = joinStatuses;
  }, [joinStatuses]);

  const isMockActivity = useCallback(
    (activityId: string) => activityId.startsWith('mock-'),
    []
  );

  const normalizeStatus = useCallback((status: string): JoinRequestStatus => {
    if (status === 'joined') return 'approved';
    if (status === 'pending' || status === 'approved' || status === 'rejected' || status === 'cancelled') {
      return status;
    }

    return 'pending';
  }, []);

  const delayRangeMs = useCallback(() => 3000 + Math.floor(Math.random() * 5000), []);

  const pickApprovalResult = useCallback((): JoinRequestStatus => {
    return Math.random() < 0.7 ? 'approved' : 'rejected';
  }, []);

  const isLegacyParticipantSchemaError = useCallback((error: any) => {
    const joinedText = [error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      joinedText.includes('decision_due_at') ||
      joinedText.includes('resolved_at') ||
      joinedText.includes('column') && joinedText.includes('does not exist')
    );
  }, []);

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
        if (!joined) {
          throw profileError;
        }

        // Preserve chat visibility locally even when profile persistence is temporarily unavailable.
        updateUser({ activitiesJoined: nextJoined });
        setLocalJoinedIds(nextJoined);
        void persistLocalJoinedIds(nextJoined);
        setError(profileError.message ?? 'Failed to persist joined activity');
        return nextJoined;
      }

      updateUser({ activitiesJoined: nextJoined });
      setLocalJoinedIds(nextJoined);
      void persistLocalJoinedIds(nextJoined);
      return nextJoined;
    },
    [persistLocalJoinedIds, updateUser, user]
  );

  const fetchJoinStatuses = useCallback(async () => {
    if (!user?.uid) {
      setJoinStatuses({});
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('participants')
      .select('activity_id, status')
      .eq('user_id', user.uid)
      .neq('status', 'cancelled');

    const joinedIds = Array.from(new Set([...(user.activitiesJoined ?? []), ...localJoinedIds]));

    if (fetchError) {
      // Preserve known statuses on transient failures so chat access does not flicker.
      const fallbackStatuses = { ...joinStatusesRef.current };

      joinedIds.forEach((activityId) => {
        if (!fallbackStatuses[activityId]) {
          fallbackStatuses[activityId] = isMockActivity(activityId) ? 'approved' : 'pending';
        }
      });

      setError(fetchError.message ?? 'Failed to refresh join status');
      setJoinStatuses(fallbackStatuses);
      return;
    }

    const nextStatuses: Record<string, JoinRequestStatus> = {};
    (data ?? []).forEach((row: any) => {
      nextStatuses[row.activity_id] = normalizeStatus(row.status);
    });

    // Critical: For each activity in profile's activitiesJoined, ensure it has a join status.
    // This is especially important on page reload to restore previous joins.
    joinedIds.forEach((activityId) => {
      if (!nextStatuses[activityId]) {
        const previous = joinStatusesRef.current[activityId];
        if (previous) {
          nextStatuses[activityId] = previous;
          return;
        }

        // For mock activities, default to 'approved' since they're persisted only in activitiesJoined
        // For real activities, if in profile but not in participants table, they're likely rejected
        // or the join request is still pending on the server. Default to 'pending' to be safe.
        nextStatuses[activityId] = isMockActivity(activityId) ? 'approved' : 'pending';
      }
    });

    setJoinStatuses(nextStatuses);
  }, [isMockActivity, localJoinedIds, normalizeStatus, user?.activitiesJoined, user?.uid]);

  const resolveDueJoinRequests = useCallback(async () => {
    if (!user?.uid) return;
    if (resolverUnavailableRef.current) return;

    const { error: rpcError } = await supabase.rpc('resolve_due_join_requests', {
      p_user_id: user.uid,
      p_limit: 25,
    });

    if (rpcError) {
      const message = [rpcError.message, rpcError.details, rpcError.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (
        message.includes('resolve_due_join_requests') ||
        message.includes('function') ||
        message.includes('404') ||
        message.includes('pgrst')
      ) {
        resolverUnavailableRef.current = true;
      }

      throw rpcError;
    }
  }, [user?.uid]);

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
        let parts: Array<{ activity_id: string; user_id: string }> = [];

        if (activityIds.length > 0) {
          const { data: participantsData, error: participantsError } = await supabase
            .from('participants')
            .select('activity_id, user_id')
            .in('activity_id', activityIds)
            .eq('status', 'approved');

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

        setActivities(mergeActivities(remoteActivities));
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [mergeActivities, setActivities]);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchActivities(), fetchJoinStatuses()]);
    };

    bootstrap();
  }, [fetchActivities, fetchJoinStatuses]);

  useEffect(() => {
    if (!user?.uid) return;

    const participantChannel = supabase
      .channel(`participants:user:${user.uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `user_id=eq.${user.uid}`,
        },
        () => {
          void fetchJoinStatuses();
          void fetchActivities();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(participantChannel);
    };
  }, [fetchActivities, fetchJoinStatuses, user?.uid]);

  // Listen to activity status changes to preserve chats even when activities become inactive
  useEffect(() => {
    if (!user?.uid) return;

    const activityChannel = supabase
      .channel('activities:status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities',
        },
        () => {
          // On activity status change, refetch join statuses to preserve chat visibility
          // for approved activities even if they're no longer 'active'
          void fetchJoinStatuses();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(activityChannel);
    };
  }, [fetchJoinStatuses, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;
    const resolveNow = async () => {
      try {
        await resolveDueJoinRequests();
      } catch {
        if (isMounted) {
          // Silent fail: resolver polling should not block app usage.
        }
      }
    };

    void resolveNow();
    const interval = setInterval(resolveNow, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [resolveDueJoinRequests, user?.uid]);

  useEffect(() => {
    return () => {
      Object.values(mockDecisionTimers.current).forEach((timer) => clearTimeout(timer));
      mockDecisionTimers.current = {};
    };
  }, []);

  const scheduleMockDecision = useCallback(
    async (activityId: string, userId: string, activityTitle: string) => {
      const delayMs = delayRangeMs();

      if (mockDecisionTimers.current[activityId]) {
        clearTimeout(mockDecisionTimers.current[activityId]);
      }

      // Capture activity at decision time for closure
      const currentActivity = activities.find((candidate) => candidate.id === activityId);

      mockDecisionTimers.current[activityId] = setTimeout(async () => {
        const resolvedStatus = pickApprovalResult();

        // Use captured activity or fallback to lookup (in case store was updated)
        const activity = currentActivity || activities.find((candidate) => candidate.id === activityId);

        if (activity && resolvedStatus === 'approved') {
          updateActivity({
            ...activity,
            currentSlots: Math.max(0, activity.currentSlots - 1),
            participants: activity.participants.includes(userId)
              ? activity.participants
              : [...activity.participants, userId],
          });
        }

        setJoinStatuses((prev) => {
          if (prev[activityId] !== 'pending') return prev;
          return { ...prev, [activityId]: resolvedStatus };
        });

        delete mockDecisionTimers.current[activityId];

        try {
          // Note: For mock activities, syncJoinedActivities was already called on join.
          // The approval/rejection only affects the local joinStatuses state. On page reload,
          // the activity will be found in profile.activitiesJoined and its status will be
          // restored from joinStatuses (which uses mock approval = 'approved' logic).
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'approval',
            title: resolvedStatus === 'approved' ? 'Join request approved' : 'Join request not approved',
            body:
              resolvedStatus === 'approved'
                ? `You can now access ${activityTitle} chat.`
                : `${activityTitle} join request was not approved.`,
            activity_id: null,
            read: false,
          });
        } catch {
          // Best-effort local mock notification.
        }
      }, delayMs);
    },
    [activities, delayRangeMs, pickApprovalResult, updateActivity]
  );

  const joinActivity = useCallback(async (activityId: string, userId: string): Promise<boolean> => {
    try {
      const existingStatus = joinStatuses[activityId];
      if (existingStatus && existingStatus !== 'cancelled') {
        return false;
      }

      const currentActivity = activities.find((activity) => activity.id === activityId);

      if (!currentActivity) return false;

      setJoinStatuses((prev) => ({ ...prev, [activityId]: 'pending' }));

      // For real activities, insert into participants table
      if (!isMockActivity(activityId)) {
        const decisionDueAt = new Date(Date.now() + delayRangeMs()).toISOString();
        const { error: joinError } = await supabase
          .from('participants')
          .insert({
            activity_id: activityId,
            user_id: userId,
            status: 'pending',
            decision_due_at: decisionDueAt,
            resolved_at: null,
          });

        if (joinError) {
          if (!isLegacyParticipantSchemaError(joinError)) {
            throw joinError;
          }

          // Legacy schema fallback
          const { error: fallbackError } = await supabase
            .from('participants')
            .insert({
              activity_id: activityId,
              user_id: userId,
              status: 'joined',
            });

          if (fallbackError) throw fallbackError;

          // Legacy schema does not support pending lifecycle; treat as immediately approved.
          setJoinStatuses((prev) => ({ ...prev, [activityId]: 'approved' }));
        }
      } else {
        // For mock activities, schedule auto-approval immediately (no DB insert needed)
        void scheduleMockDecision(activityId, userId, currentActivity.title);
      }

      // Persist joined activity IDs so chat visibility survives hook remounts and refreshes.
      await syncJoinedActivities(activityId, true);

      return true;
    } catch (err: any) {
      setJoinStatuses((prev) => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });
      setError(err.message ?? 'Failed to join activity');
      return false;
    }
  }, [activities, delayRangeMs, isLegacyParticipantSchemaError, isMockActivity, joinStatuses, scheduleMockDecision, syncJoinedActivities]);

  const leaveActivity = useCallback(async (activityId: string, userId: string): Promise<boolean> => {
    try {
      const currentActivity = activities.find((activity) => activity.id === activityId);
      const currentStatus = joinStatuses[activityId];

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
      setJoinStatuses((prev) => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });

      if (mockDecisionTimers.current[activityId]) {
        clearTimeout(mockDecisionTimers.current[activityId]);
        delete mockDecisionTimers.current[activityId];
      }

      if (currentStatus === 'approved') {
        updateActivity({
          ...currentActivity,
          currentSlots: currentActivity.currentSlots + 1,
          participants: currentActivity.participants.filter((participant) => participant !== userId),
        });
      }

      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to leave activity');
      return false;
    }
  }, [activities, isMockActivity, joinStatuses, syncJoinedActivities, updateActivity]);

  const deleteRejectedJoin = useCallback(async (activityId: string): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      if (joinStatuses[activityId] !== 'rejected') return false;

      if (!isMockActivity(activityId)) {
        const { data, error: rpcError } = await supabase.rpc('delete_rejected_join_request', {
          p_activity_id: activityId,
        });

        if (rpcError) throw rpcError;
        if (!data) return false;
      }

      await syncJoinedActivities(activityId, false);
      setJoinStatuses((prev) => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });

      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete rejected request');
      return false;
    }
  }, [isMockActivity, joinStatuses, syncJoinedActivities, user?.uid]);

  const getJoinStatus = useCallback(
    (activityId: string): JoinRequestStatus | null => joinStatuses[activityId] ?? null,
    [joinStatuses]
  );

  const canAccessChat = useCallback(
    (activityId: string, hostId?: string) => {
      if (hostId && user?.uid && hostId === user.uid) return true;
      return joinStatuses[activityId] === 'approved';
    },
    [joinStatuses, user?.uid]
  );

  const joinedActivityIds = Object.entries(joinStatuses)
    .filter(([, status]) => status !== 'cancelled')
    .map(([activityId]) => activityId);

  const getActivity = useCallback(
    (id: string) => activities.find((a) => a.id === id) ?? null,
    [activities]
  );

  return {
    activities,
    joinStatuses,
    joinedActivityIds,
    isLoading,
    error,
    joinActivity,
    leaveActivity,
    deleteRejectedJoin,
    getJoinStatus,
    canAccessChat,
    getActivity,
    refetch: async () => {
      await Promise.all([fetchActivities(), fetchJoinStatuses()]);
    },
  };
}
