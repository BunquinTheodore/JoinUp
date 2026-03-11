import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { Colors, Typography, Spacing, BorderRadius, CategoryColors } from '../constants/theme';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { NavBar } from '../components/layout/NavBar';
import { EmptyState } from '../components/ui/EmptyState';
import type { Notification } from '../types';

/* ── Mock notifications ───────────────────────────────────── */
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'join',
    title: 'New participant!',
    body: 'Sofia Rivera joined "Morning Yoga in the Park"',
    activityId: 'act-1',
    read: false,
    createdAt: { seconds: Date.now() / 1000 - 600, nanoseconds: 0, toDate: () => new Date(Date.now() - 600_000) } as any,
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'chat',
    title: 'New message',
    body: 'Lena Chen sent a message in "Coffee & Study Session"',
    activityId: 'act-2',
    read: false,
    createdAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0, toDate: () => new Date(Date.now() - 3_600_000) } as any,
  },
  {
    id: 'notif-3',
    userId: 'user-1',
    type: 'reminder',
    title: 'Starting soon!',
    body: '"Sunset Hiking at Twin Peaks" starts in 1 hour',
    activityId: 'act-3',
    read: true,
    createdAt: { seconds: Date.now() / 1000 - 7200, nanoseconds: 0, toDate: () => new Date(Date.now() - 7_200_000) } as any,
  },
  {
    id: 'notif-4',
    userId: 'user-1',
    type: 'join',
    title: 'Activity full!',
    body: '"Beach Volleyball" has reached its max participants 🎉',
    activityId: 'act-4',
    read: true,
    createdAt: { seconds: Date.now() / 1000 - 86400, nanoseconds: 0, toDate: () => new Date(Date.now() - 86_400_000) } as any,
  },
  {
    id: 'notif-5',
    userId: 'user-1',
    type: 'update',
    title: 'Activity updated',
    body: 'The time for "Dinner & Wine Night" has been changed to 8:00 PM',
    activityId: 'act-5',
    read: true,
    createdAt: { seconds: Date.now() / 1000 - 172800, nanoseconds: 0, toDate: () => new Date(Date.now() - 172_800_000) } as any,
  },
];

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  join: { name: 'person-add', color: Colors.success },
  chat: { name: 'chatbubble', color: Colors.accent },
  reminder: { name: 'alarm', color: '#F59E0B' },
  update: { name: 'create', color: Colors.primary },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setIsLoading(false);
    }, 400);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (notif: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    // Navigate to activity
    if (notif.activityId) {
      router.push(`/activity/${notif.activityId}`);
    }
  };

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => {
    const icon = ICON_MAP[item.type] ?? { name: 'notifications' as keyof typeof Ionicons.glyphMap, color: Colors.slate };
    const timeAgo = item.createdAt
      ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
      : '';

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <TouchableOpacity
          style={[styles.notifRow, !item.read && styles.notifRowUnread]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: icon.color + '18' }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>
          <View style={styles.notifContent}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.notifTime}>{timeAgo}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScreenWrapper>
      <NavBar
        title="Notifications"
        showBack
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.markRead}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="No notifications"
          message="You're all caught up! Check back later."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: Spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  notifRowUnread: {
    backgroundColor: Colors.accent + '08',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  notifTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    color: Colors.text,
  },
  notifBody: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  notifTime: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    marginTop: 6,
    marginLeft: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 42 + Spacing.md + Spacing.sm,
  },
  markRead: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.accent,
  },
});
