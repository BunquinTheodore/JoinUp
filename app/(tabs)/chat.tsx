import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { useActivities } from '../../hooks/useActivities';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { getMockChatPreview } from '../../lib/mockChats';
import type { JoinRequestStatus } from '../../types';

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading, getJoinStatus, canAccessChat, deleteRejectedJoin } = useActivities();
  const user = useAuthStore((state) => state.user);
  const joinedIds = new Set(user?.activitiesJoined ?? []);

  const chatActivities = activities.filter((activity) => {
    const status = getJoinStatus(activity.id);
    const isHost = activity.hostId === user?.uid;
    return Boolean(status) || isHost || joinedIds.has(activity.id);
  });

  const statusMeta = (status: JoinRequestStatus | null, isHost: boolean) => {
    if (isHost) {
      return { label: 'Hosting', color: Colors.primary, locked: false };
    }

    if (status === 'pending') {
      return { label: 'Waiting for approval', color: Colors.warning, locked: true };
    }

    if (status === 'rejected') {
      return { label: 'Not approved', color: Colors.error, locked: true };
    }

    return { label: 'Chat unlocked', color: Colors.success, locked: false };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Chats</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : chatActivities.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No chats yet"
          message="Join an activity to start chatting with other participants."
        />
      ) : (
        <FlatList
          data={chatActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const chipColor = CategoryColors[item.category] ?? Colors.accent;
            const preview = getMockChatPreview(item.id);
            const isHost = item.hostId === user?.uid;
            const status = getJoinStatus(item.id);
            const effectiveStatus: JoinRequestStatus | null =
              isHost ? null : status ?? (joinedIds.has(item.id) ? 'pending' : null);
            const meta = statusMeta(effectiveStatus, isHost);
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <TouchableOpacity
                  style={[styles.chatItem, Shadows.card]}
                  onPress={() => {
                    if (canAccessChat(item.id, item.hostId)) {
                      router.push(`/chat/${item.id}`);
                      return;
                    }

                    Alert.alert(
                      'Chat locked',
                      effectiveStatus === 'rejected'
                        ? 'Your join request was not approved for this activity.'
                        : 'Your join request is still pending approval.'
                    );
                  }}
                  activeOpacity={0.9}
                >
                  <View style={[styles.chatIcon, { backgroundColor: chipColor + '20' }]}>
                    <Ionicons
                      name={meta.locked ? 'lock-closed' : 'chatbubble'}
                      size={20}
                      color={meta.locked ? Colors.slate : chipColor}
                    />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.chatSubtitle} numberOfLines={1}>
                      {meta.locked
                        ? meta.label
                        : preview
                          ? `${preview.senderName}: ${preview.text}`
                          : `${item.participants.length} participants`}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: meta.color + '1A' }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  {effectiveStatus === 'rejected' && !isHost ? (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={async (event) => {
                        event.stopPropagation();
                        const removed = await deleteRejectedJoin(item.id);
                        if (!removed) {
                          Alert.alert('Delete failed', 'Could not remove this rejected activity.');
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.slate} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  heading: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.text,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
  },
  chatSubtitle: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  statusText: {
    fontFamily: Typography.bodyMed,
    fontSize: 11,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '14',
  },
});
