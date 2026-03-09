import { useState, useEffect, useCallback } from 'react';
import type { Activity } from '../types';

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

const makeTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    title: 'Morning Yoga Session',
    description: 'Join us for a refreshing morning yoga session at Central Park. All levels welcome! Bring your own mat and water bottle.',
    category: 'Fitness',
    location: { name: 'Central Park', lat: 37.7749, lng: -122.4194 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(7, 0, 0, 0))),
    maxSlots: 8,
    currentSlots: 2,
    participants: ['user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'],
    hostId: 'user-2',
    hostName: 'Sarah',
    hostPhoto: '',
    coverImage: '',
    requiresApproval: false,
    reactions: { fire: 12, heart: 8, like: 15 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
  {
    id: 'act-2',
    title: 'Coffee & Study',
    description: 'Looking for study buddies! Let\'s grab coffee and work on our projects together. Great wifi and cozy atmosphere.',
    category: 'Café',
    location: { name: 'Brew House Café', lat: 37.7849, lng: -122.4094 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(14, 0, 0, 0))),
    maxSlots: 6,
    currentSlots: 0,
    participants: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
    hostId: 'user-3',
    hostName: 'Alex',
    hostPhoto: '',
    requiresApproval: false,
    reactions: { fire: 5, heart: 10, like: 8 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
  {
    id: 'act-3',
    title: 'Sunset Hiking Trail',
    description: 'Beautiful sunset hike along the coastal trail. Moderate difficulty, about 5 miles round trip.',
    category: 'Outdoors',
    location: { name: 'Coastal Trail Head', lat: 37.7649, lng: -122.5094 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(17, 0, 0, 0))),
    maxSlots: 10,
    currentSlots: 5,
    participants: ['user-1', 'user-4', 'user-5', 'user-6', 'user-7'],
    hostId: 'user-4',
    hostName: 'Jamie',
    hostPhoto: '',
    coverImage: '',
    requiresApproval: false,
    reactions: { fire: 20, heart: 15, like: 25 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
  {
    id: 'act-4',
    title: 'Beach Volleyball',
    description: 'Casual beach volleyball game. No experience needed, just come have fun!',
    category: 'Outdoors',
    location: { name: 'Venice Beach', lat: 33.985, lng: -118.473 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(10, 0, 0, 0))),
    maxSlots: 12,
    currentSlots: 4,
    participants: ['user-1', 'user-2', 'user-3', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'],
    hostId: 'user-5',
    hostName: 'Lisa',
    hostPhoto: '',
    coverImage: '',
    requiresApproval: false,
    reactions: { fire: 30, heart: 20, like: 35 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
  {
    id: 'act-5',
    title: 'Dinner & Wine Tasting',
    description: 'An evening of fine dining and wine tasting at a downtown restaurant. Limited spots available!',
    category: 'Food',
    location: { name: 'Downtown SF', lat: 37.7849, lng: -122.4094 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(19, 0, 0, 0))),
    maxSlots: 6,
    currentSlots: 2,
    participants: ['user-1', 'user-3', 'user-6', 'user-7'],
    hostId: 'user-6',
    hostName: 'David',
    hostPhoto: '',
    coverImage: '',
    requiresApproval: true,
    reactions: { fire: 15, heart: 25, like: 18 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
  {
    id: 'act-6',
    title: 'Game Night',
    description: 'Board games and video games night! Bring your favorites or try something new.',
    category: 'Gaming',
    location: { name: 'Game Lounge', lat: 37.7749, lng: -122.4294 },
    dateTime: makeTimestamp(new Date(tomorrow.setHours(20, 0, 0, 0))),
    maxSlots: 8,
    currentSlots: 5,
    participants: ['user-2', 'user-4', 'user-8'],
    hostId: 'user-8',
    hostName: 'Chris',
    hostPhoto: '',
    requiresApproval: false,
    reactions: { fire: 8, heart: 12, like: 10 },
    status: 'active',
    createdAt: makeTimestamp(new Date()),
  },
];

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetch
    const timer = setTimeout(() => {
      setActivities(MOCK_ACTIVITIES);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const joinActivity = useCallback(async (activityId: string, userId: string) => {
    try {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId && a.currentSlots > 0
            ? {
                ...a,
                currentSlots: a.currentSlots - 1,
                participants: [...a.participants, userId],
              }
            : a
        )
      );
    } catch (err) {
      setError('Failed to join activity');
    }
  }, []);

  const leaveActivity = useCallback(async (activityId: string, userId: string) => {
    try {
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
    } catch (err) {
      setError('Failed to leave activity');
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
  };
}
