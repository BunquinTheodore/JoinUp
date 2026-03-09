import { create } from 'zustand';
import type { Activity } from '../types';

interface ActivityState {
  activities: Activity[];
  selectedCategory: string;
  searchQuery: string;
  setActivities: (activities: Activity[]) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredActivities: () => Activity[];
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  selectedCategory: 'All',
  searchQuery: '',
  setActivities: (activities) => set({ activities }),
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
