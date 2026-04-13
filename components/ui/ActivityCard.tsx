import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, BorderRadius, Spacing, Shadows, CategoryColors } from '../../constants/theme';
import { SlotProgressBar } from './SlotProgressBar';
import type { Activity } from '../../types';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
  onJoin: () => void;
  style?: ViewStyle;
  index?: number;
  isLeaving?: boolean;
}

export function ActivityCard({ activity, onPress, onJoin, style, index = 0, isLeaving = false }: ActivityCardProps) {
  const slotsLeft = activity.currentSlots;
  const isFull = slotsLeft <= 0;
  const chipColor = CategoryColors[activity.category] ?? Colors.accent;
  const dateStr = activity.dateTime
    ? format(new Date(activity.dateTime), 'EEE, h:mm a')
    : '';
  const joined = activity.maxSlots - activity.currentSlots;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        style={[styles.card, Shadows.card, style, isLeaving && styles.cardLeaving]}
        onPress={onPress}
        activeOpacity={0.92}
        disabled={isLeaving}
      >
        {activity.coverImage ? (
          <Image
            source={{ uri: activity.coverImage }}
            style={styles.coverPhoto}
            resizeMode="cover"
          />
        ) : null}

        {/* Category chip + slots badge */}
        <View style={styles.topRow}>
          <View style={[styles.categoryChip, { backgroundColor: chipColor + '18', borderColor: chipColor }]}>
            <Text style={[styles.categoryText, { color: chipColor }]}>{activity.category}</Text>
          </View>
          <View style={[styles.slotBadge, { backgroundColor: isFull ? Colors.danger + '15' : Colors.accent + '15' }]}>
            <Text style={[styles.slotBadgeText, { color: isFull ? Colors.danger : Colors.accent }]}>
              {isFull ? 'FULL' : `${slotsLeft} left`}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{activity.title}</Text>

        {/* Location and time */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={Colors.slate} />
          <Text style={styles.infoText}>{activity.location.name}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.infoText}>{dateStr}</Text>
        </View>

        {/* Progress bar */}
        <SlotProgressBar current={joined} max={activity.maxSlots} />

        {/* Join button */}
        <TouchableOpacity
          style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
          onPress={(e) => {
            e.stopPropagation?.();
            onJoin();
          }}
          disabled={isFull || isLeaving}
          activeOpacity={0.8}
        >
          <Text style={styles.joinBtnText}>
            {isLeaving ? 'Joining…' : isFull ? 'Full' : 'Join →'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  cardLeaving: {
    transform: [{ translateX: 12 }],
  },
  coverPhoto: {
    width: '100%',
    height: 130,
    borderRadius: BorderRadius.input,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primary + '10',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
  },
  slotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  slotBadgeText: {
    fontFamily: Typography.bodyBold,
    fontSize: 12,
  },
  title: {
    fontFamily: Typography.bodyBold,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 4,
  },
  infoText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
  },
  dot: {
    color: Colors.slate,
    marginHorizontal: 2,
  },
  joinBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
  },
  joinBtnDisabled: {
    backgroundColor: Colors.slate,
    opacity: 0.6,
  },
  joinBtnText: {
    color: Colors.white,
    fontFamily: Typography.bodyBold,
    fontSize: 14,
  },
});
