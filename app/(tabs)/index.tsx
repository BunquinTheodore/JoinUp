import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideOutLeft } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Categories } from '../../constants/theme';
import { ActivityCard } from '../../components/ui/ActivityCard';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { useActivities } from '../../hooks/useActivities';
import { useAuthStore } from '../../store/authStore';

export default function HomeFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading, joinActivity } = useActivities();
  const user = useAuthStore((s) => s.user);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [fadingActivityIds, setFadingActivityIds] = useState<string[]>([]);

  const filteredActivities = useMemo(() => {
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

    if (user?.activitiesJoined?.length) {
      const joinedIds = new Set(user.activitiesJoined);
      filtered = filtered.filter(
        (activity) => !joinedIds.has(activity.id) || fadingActivityIds.includes(activity.id)
      );
    }

    return filtered;
  }, [activities, fadingActivityIds, searchQuery, selectedCategory, user?.activitiesJoined]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>
            <Text style={styles.logoJoin}>Join</Text>
            <Text style={styles.logoUp}>Up</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar}>
            <Ionicons name="person" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
        </Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        style={styles.chipsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {Categories.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            size="sm"
          />
        ))}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.slate} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          placeholderTextColor={Colors.slate}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Activity Feed */}
      <View style={styles.feedContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No activities found"
            message="Try changing your filters or check back later for new activities."
          />
        ) : (
          <FlatList
            style={styles.feedList}
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <Animated.View exiting={SlideOutLeft.duration(220)}>
                <ActivityCard
                  activity={item}
                  index={index}
                  isLeaving={fadingActivityIds.includes(item.id)}
                  onPress={() => router.push(`/activity/${item.id}`)}
                  onJoin={async () => {
                    if (!user?.uid || fadingActivityIds.includes(item.id)) return;

                    setFadingActivityIds((prev) => [...prev, item.id]);
                    const joined = await joinActivity(item.id, user.uid);

                    if (!joined) {
                      setFadingActivityIds((prev) => prev.filter((activityId) => activityId !== item.id));
                      return;
                    }

                    setTimeout(() => {
                      setFadingActivityIds((prev) => prev.filter((activityId) => activityId !== item.id));
                    }, 220);
                  }}
                />
              </Animated.View>
            )}
            contentContainerStyle={[
              styles.feedContent,
              { paddingBottom: insets.bottom + Spacing.xl * 2 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.accent}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontFamily: Typography.display,
  },
  logoJoin: {
    color: Colors.primary,
  },
  logoUp: {
    color: Colors.accent,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: 2,
    paddingBottom: 0,
  },
  greeting: {
    fontFamily: Typography.bodyBold,
    fontSize: 20,
    color: Colors.text,
  },
  chipsScroll: {
    maxHeight: 40,
  },
  chipsContainer: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    marginLeft: Spacing.sm,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  feedList: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: Spacing.xl,
  },
});
