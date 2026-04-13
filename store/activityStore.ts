import { create } from 'zustand';
import type { Activity } from '../types';
import { MOCK_ACTIVITIES } from '../lib/mockActivities';

interface ActivityState {
  activities: Activity[];
  selectedCategory: string;
  searchQuery: string;
  setActivities: (activities: Activity[]) => void;
  updateActivity: (activity: Activity) => void;
  removeActivity: (activityId: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredActivities: () => Activity[];
}

function dedupeActivities(activities: Activity[]) {
  return Array.from(new Map(activities.map((activity) => [activity.id, activity])).values());
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: MOCK_ACTIVITIES,
  selectedCategory: 'All',
  searchQuery: '',
  setActivities: (activities) => set({ activities: dedupeActivities(activities) }),
  updateActivity: (activity) =>
    set((state) => ({
      activities: dedupeActivities([
        ...state.activities.filter((item) => item.id !== activity.id),
        activity,
      ]),
    })),
  removeActivity: (activityId) =>
    set((state) => ({
      activities: state.activities.filter((activity) => activity.id !== activityId),
    })),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  getFilteredActivities: () => {
    const { activities, selectedCategory, searchQuery } = get();
    let filtered = activities;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.location.name.toLowerCase().includes(q)
      );
    }

    return filtered;
  },
}));
