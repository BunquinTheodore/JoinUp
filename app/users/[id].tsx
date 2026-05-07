import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import type { User, Activity } from '../../types';

const { width } = Dimensions.get('window');

interface UserWithActivities extends User {
  hostedActivities?: Activity[];
  joinedActivities?: Activity[];
}

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<UserWithActivities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('User not found');

      // Fetch user's hosted activities
      const { data: hostedData, error: hostedError } = await supabase
        .from('activities_full')
        .select('*')
        .eq('host_id', id);

      if (hostedError) console.warn('Failed to fetch hosted activities:', hostedError);

      // Fetch user's joined activities
      const { data: participantData, error: participantError } = await supabase
        .from('join_requests')
        .select('activity_id')
        .eq('user_id', id)
        .eq('status', 'approved');

      if (participantError) console.warn('Failed to fetch joined activities:', participantError);

      let joinedData: Activity[] = [];
      if (participantData && participantData.length > 0) {
        const activityIds = participantData.map((p) => p.activity_id);
        const { data: activities } = await supabase
          .from('activities_full')
          .select('*')
          .in('id', activityIds);
        joinedData = (activities ?? []).map(mapActivity);
      }

      const mappedUser: UserWithActivities = mapUser(profileData);
      mappedUser.hostedActivities = (hostedData ?? []).map(mapActivity);
      mappedUser.joinedActivities = joinedData;

      setUser(mappedUser);
    } catch (err: any) {
      const message = err?.message ?? 'Failed to fetch user profile';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'User not found'}</Text>
        </View>
      </View>
    );
  }

  const hostedCount = user.hostedActivities?.length ?? 0;
  const joinedCount = user.joinedActivities?.length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile section */}
        <Animated.View entering={FadeInDown.springify()} style={styles.profileCard}>
          {/* Cover area */}
          <View style={styles.coverArea} />

          {/* Profile photo and info */}
          <View style={styles.profileHeader}>
            <View style={styles.photoContainer}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profilePhoto} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person-outline" size={50} color={Colors.slate} />
                </View>
              )}
              {user.isVerified && (
                <View style={styles.verifiedBadgeProfile}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
                </View>
              )}
            </View>

            <Text style={styles.displayName}>{user.displayName || 'Anonymous'}</Text>

            {user.ratingCount > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={Colors.accent} />
                <Text style={styles.ratingScore}>{user.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({user.ratingCount} ratings)</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {user.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          )}

          {/* Location and Age Range */}
          <View style={styles.detailsRow}>
            {user.location && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={14} color={Colors.slate} />
                <Text style={styles.detailText}>{user.location}</Text>
              </View>
            )}
            {user.ageRange && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.slate} />
                <Text style={styles.detailText}>{user.ageRange}</Text>
              </View>
            )}
          </View>

          {/* Interests */}
          {user.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionLabel}>Interests</Text>
              <View style={styles.interestsList}>
                {user.interests.map((interest, index) => (
                  <View key={index} style={styles.interestBadge}>
                    <Text style={styles.interestBadgeText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{hostedCount}</Text>
              <Text style={styles.statLabel}>Hosted</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{joinedCount}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        </Animated.View>

        {/* Hosted activities */}
        {hostedCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hosted Activities ({hostedCount})</Text>
            {user.hostedActivities?.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <TouchableOpacity
                  style={[styles.activityCard, Shadows.card]}
                  onPress={() => router.push(`/activity/${activity.id}`)}
                  activeOpacity={0.92}
                >
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                      {activity.title}
                    </Text>
                    <View style={styles.activityMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={Colors.slate} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {activity.location.name}
                        </Text>
                      </View>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {new Date(activity.dateTime).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Joined activities */}
        {joinedCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Joined Activities ({joinedCount})</Text>
            {user.joinedActivities?.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <TouchableOpacity
                  style={[styles.activityCard, Shadows.card]}
                  onPress={() => router.push(`/activity/${activity.id}`)}
                  activeOpacity={0.92}
                >
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                      {activity.title}
                    </Text>
                    <View style={styles.activityMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={Colors.slate} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {activity.location.name}
                        </Text>
                      </View>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {new Date(activity.dateTime).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function mapUser(row: any): User {
  return {
    uid: row.id,
    email: row.email ?? '',
    emailVerified: false,
    taskVerified: false,
    isVerified: row.is_verified ?? false,
    verificationMethod: 'none',
    displayName: row.display_name ?? '',
    photoURL: row.photo_url ?? '',
    bio: row.bio ?? '',
    location: row.location ?? '',
    ageRange: row.age_range ?? '18-24',
    interests: Array.isArray(row.interests) ? row.interests : [],
    activitiesJoined: Array.isArray(row.activities_joined) ? row.activities_joined : [],
    activitiesHosted: [],
    rating: row.rating ?? 0,
    ratingCount: row.rating_count ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'Other',
    location: {
      name: row.location_name ?? '',
      lat: row.location_lat ?? 0,
      lng: row.location_lng ?? 0,
    },
    dateTime: row.date_time ?? '',
    maxSlots: row.max_slots ?? 0,
    currentSlots: row.current_slots ?? 0,
    participants: Array.isArray(row.participants) ? row.participants : [],
    hostId: row.host_id ?? '',
    hostName: row.host_name ?? '',
    hostPhoto: row.host_photo ?? '',
    coverImage: row.cover_image ?? undefined,
    images: Array.isArray(row.images) ? row.images : undefined,
    requiresApproval: row.requires_approval ?? false,
    reactions: row.reactions ?? { fire: 0, heart: 0, like: 0 },
    status: row.status ?? 'active',
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 18,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingBottom: Spacing.xl * 2,
  },
  loader: {
    marginTop: Spacing.xl * 3,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.slate,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  coverArea: {
    height: 80,
    backgroundColor: Colors.accent + '20',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  photoContainer: {
    position: 'relative',
    marginTop: -40,
    marginBottom: Spacing.md,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.card,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  verifiedBadgeProfile: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    ...Shadows.card,
  },
  displayName: {
    fontFamily: Typography.display,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.accent,
  },
  ratingCount: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
  bioSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  bioText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
  interestsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
    color: Colors.slate,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  interestBadge: {
    backgroundColor: Colors.accent + '18',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  interestBadgeText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.accent,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingVertical: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  activityCardContent: {
    gap: Spacing.xs,
  },
  activityTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 19,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    flex: 1,
  },
});
