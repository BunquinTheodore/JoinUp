import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { NavBar } from '../../../components/layout/NavBar';
import { SlotProgressBar } from '../../../components/ui/SlotProgressBar';
import { useActivities } from '../../../hooks/useActivities';

export default function ManageActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, leaveActivity } = useActivities();

  const activity = useMemo(
    () => activities.find((a) => a.id === id) ?? null,
    [activities, id]
  );

  if (!activity) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <NavBar title="Manage" showBack />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Activity not found</Text>
        </View>
      </View>
    );
  }

  const joined = activity.maxSlots - activity.currentSlots;

  const handleRemoveParticipant = (userId: string) => {
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await leaveActivity(activity.id, userId);
          },
        },
      ]
    );
  };

  const handleCancelActivity = () => {
    Alert.alert(
      'Cancel Activity',
      'Are you sure you want to cancel this activity? All participants will be notified.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Activity',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Activity cancelled');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <NavBar title="Host Dashboard" showBack />

      <View style={styles.content}>
        {/* Activity summary */}
        <View style={[styles.summaryCard, Shadows.card]}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <View style={styles.slotInfo}>
            <Text style={styles.slotText}>
              {joined}/{activity.maxSlots} participants
            </Text>
            <SlotProgressBar current={joined} max={activity.maxSlots} showLabel={false} />
          </View>
        </View>

        {/* Participants list */}
        <Text style={styles.sectionTitle}>Participants ({activity.participants.length})</Text>

        <FlatList
          data={activity.participants}
          keyExtractor={(item) => item}
          renderItem={({ item: userId, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <View style={[styles.participantRow, Shadows.card]}>
                <View style={styles.participantAvatar}>
                  <Ionicons name="person" size={18} color={Colors.white} />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {userId === activity.hostId ? `${userId} (Host)` : userId}
                  </Text>
                </View>
                {userId !== activity.hostId && (
                  <TouchableOpacity
                    onPress={() => handleRemoveParticipant(userId)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Cancel activity */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelActivity}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          <Text style={styles.cancelBtnText}>Cancel Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  activityTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  slotInfo: {
    gap: Spacing.sm,
  },
  slotText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.slate,
  },
  sectionTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontFamily: Typography.bodyMed,
    fontSize: 15,
    color: Colors.text,
  },
  removeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  cancelBtnText: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    color: Colors.danger,
  },
  emptyText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.slate,
  },
});
