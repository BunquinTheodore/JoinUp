import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { NavBar } from '../../components/layout/NavBar';
import { useActivities } from '../../hooks/useActivities';
import { useLocation } from '../../hooks/useLocation';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading } = useActivities();
  const { location } = useLocation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <NavBar
        title="Explore"
        showBack
        rightAction={
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Location pill */}
      <TouchableOpacity style={styles.locationPill}>
        <Ionicons name="location" size={16} color={Colors.success} />
        <Text style={styles.locationText}>
          {location ? `${location.city}, ${location.state}` : 'Loading...'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.slate} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Section title */}
        <Text style={styles.sectionTitle}>Happening Near You</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
        ) : (
          activities.map((activity, index) => {
            const chipColor = CategoryColors[activity.category] ?? Colors.accent;
            const joined = activity.maxSlots - activity.currentSlots;
            const dateStr = activity.dateTime
              ? format(new Date(activity.dateTime), 'EEE, h:mm a')
              : '';

            return (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <TouchableOpacity
                  style={[styles.exploreCard, Shadows.card]}
                  onPress={() => router.push(`/activity/${activity.id}`)}
                  activeOpacity={0.92}
                >
                  {/* Cover image placeholder */}
                  <View style={styles.coverImage}>
                    <View style={styles.coverPlaceholder}>
                      <Ionicons name="image-outline" size={40} color={Colors.slate} />
                    </View>

                    {/* Distance badge */}
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>
                        {(Math.random() * 3 + 0.5).toFixed(1)} mi
                      </Text>
                    </View>
                  </View>

                  {/* Card info */}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardInfoTop}>
                      <View
                        style={[
                          styles.categoryChip,
                          { backgroundColor: chipColor + '18', borderColor: chipColor },
                        ]}
                      >
                        <Text style={[styles.categoryText, { color: chipColor }]}>
                          {activity.category}
                        </Text>
                      </View>
                      <Text style={styles.joinedText}>
                        {joined}/{activity.maxSlots} joined
                      </Text>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={Colors.slate} />
                        <Text style={styles.metaText}>{activity.location.name}</Text>
                      </View>
                      <Text style={styles.metaText}>{dateStr}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  filterBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 4,
  },
  locationText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.text,
  },
  content: {
    paddingBottom: Spacing.xl * 2,
  },
  sectionTitle: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.accent,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  loader: {
    marginTop: Spacing.xl * 2,
  },
  exploreCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  coverImage: {
    height: 160,
    backgroundColor: Colors.primary + '15',
    position: 'relative',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...Shadows.card,
  },
  distanceText: {
    fontFamily: Typography.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },
  cardInfo: {
    padding: Spacing.md,
  },
  cardInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Typography.bodyMed,
    fontSize: 11,
  },
  joinedText: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
    color: Colors.slate,
  },
  cardTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 17,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
});
