import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../../constants/theme';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SlotProgressBar } from '../../../components/ui/SlotProgressBar';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { NavBar } from '../../../components/layout/NavBar';
import { useActivities } from '../../../hooks/useActivities';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const galleryWidth = Dimensions.get('window').width - Spacing.md * 2;
  const { activities, joinActivity, leaveActivity, getJoinStatus, canAccessChat, deleteRejectedJoin } = useActivities();
  const user = useAuthStore((s) => s.user);

  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showPeopleSheet, setShowPeopleSheet] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { displayName: string; photoUrl: string }>>({});

  const activity = useMemo(
    () => activities.find((a) => a.id === id) ?? null,
    [activities, id]
  );

  if (!activity) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <NavBar title="Activity" showBack />
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Activity not found</Text>
        </View>
      </View>
    );
  }

  const chipColor = CategoryColors[activity.category] ?? Colors.accent;
  const isHost = activity.hostId === user?.uid;
  const joinStatus = getJoinStatus(activity.id);
  const isParticipant = joinStatus === 'approved';
  const isFull = activity.currentSlots <= 0;
  const isVerified = !!user?.isVerified;
  const joined = activity.maxSlots - activity.currentSlots;
  const dateStr = activity.dateTime
    ? format(new Date(activity.dateTime), 'EEEE, MMMM d · h:mm a')
    : '';

  const participantIds = useMemo(
    () => activity.participants.filter((participantId) => participantId !== activity.hostId),
    [activity.hostId, activity.participants]
  );

  const fetchMemberProfiles = useCallback(async () => {
    const ids = Array.from(new Set([activity.hostId, ...participantIds]));

    if (ids.length === 0) {
      setMemberProfiles({});
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, photo_url')
      .in('id', ids);

    if (error) {
      return;
    }

    const nextProfiles: Record<string, { displayName: string; photoUrl: string }> = {};
    (data ?? []).forEach((row: any) => {
      nextProfiles[row.id] = {
        displayName: row.display_name ?? '',
        photoUrl: row.photo_url ?? '',
      };
    });

    setMemberProfiles(nextProfiles);
  }, [activity.hostId, participantIds]);

  useEffect(() => {
    void fetchMemberProfiles();
  }, [fetchMemberProfiles]);

  const getPersonName = (personId: string, fallbackLabel: string) => {
    const profile = memberProfiles[personId];
    return profile?.displayName?.trim() || fallbackLabel;
  };

  const getPersonInitial = (personId: string, fallbackLabel: string) => {
    const profile = memberProfiles[personId];
    const name = profile?.displayName?.trim() || fallbackLabel;
    return name.charAt(0).toUpperCase();
  };

  const handleJoin = async () => {
    if (!user) return;
    if (!isVerified) {
      Alert.alert(
        'Verification required',
        'Verify your account first. You can verify by confirming your email or completing the safety profile task.'
      );
      return;
    }

    setIsJoining(true);
    try {
      const joined = await joinActivity(activity.id, user.uid);
      if (joined) {
        setShowJoinSheet(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to join activity.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    Alert.alert('Leave Activity', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveActivity(activity.id, user.uid);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <NavBar
        title={activity.title}
        showBack
        rightAction={
          (
            <View style={styles.headerRightButtons}>
              {isHost && (
                <TouchableOpacity
                  onPress={() => router.push(`/activity/${id}/manage`)}
                  style={styles.headerBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="settings" size={22} color={Colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowPeopleSheet(true)}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          )
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Images Gallery */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.imageGallery}>
            {(activity.images ?? []).length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
              >
                {activity.images!.map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={[styles.galleryImage, { width: galleryWidth }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : activity.coverImage ? (
              <Image
                source={{ uri: activity.coverImage }}
                style={[styles.galleryImage, { width: galleryWidth }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={48} color={Colors.slate} />
              </View>
            )}
            {(activity.images ?? []).length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCountText}>{(activity.images ?? []).length} photos</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Category and status */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.chipRow}>
          <View style={[styles.categoryChip, { backgroundColor: chipColor + '18', borderColor: chipColor }]}>
            <Text style={[styles.categoryText, { color: chipColor }]}>{activity.category}</Text>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>FULL</Text>
            </View>
          )}
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.title}>{activity.title}</Text>
        </Animated.View>

        {/* Host info */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.hostRow}>
          <View style={styles.hostAvatar}>
            <Ionicons name="person" size={16} color={Colors.white} />
          </View>
          <Text style={styles.hostText}>
            Hosted by <Text style={styles.hostName}>{activity.hostName}</Text>
          </Text>
        </Animated.View>

        {/* Date and location */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{dateStr}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{activity.location.name}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.descSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{activity.description}</Text>
        </Animated.View>

        {/* Participants */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.participantsRow}>
            <AvatarStack count={activity.participants.length} size={32} />
            <Text style={styles.participantCount}>
              {joined}/{activity.maxSlots} spots filled
            </Text>
          </View>
          <SlotProgressBar current={joined} max={activity.maxSlots} />
        </Animated.View>

        {/* Reactions */}
        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.reactionsRow}>
          <TouchableOpacity style={styles.reactionBtn}>
            <Text>🔥</Text>
            <Text style={styles.reactionCount}>{activity.reactions.fire}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reactionBtn}>
            <Text>❤️</Text>
            <Text style={styles.reactionCount}>{activity.reactions.heart}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reactionBtn}>
            <Text>👍</Text>
            <Text style={styles.reactionCount}>{activity.reactions.like}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom action */}
      <Animated.View
        entering={FadeInUp.delay(500).springify()}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}
      >
        {isParticipant || isHost ? (
          <View style={styles.bottomActions}>
            <PrimaryButton
              title="Open Chat"
              onPress={() => {
                if (canAccessChat(activity.id, activity.hostId)) {
                  router.push(`/chat/${activity.id}`);
                }
              }}
              style={styles.chatBtn}
            />
            {!isHost && (
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                <Text style={styles.leaveBtnText}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : joinStatus === 'pending' ? (
          <PrimaryButton
            title="Waiting for approval"
            onPress={() => {}}
            disabled
            style={styles.joinBtn}
          />
        ) : joinStatus === 'rejected' ? (
          <PrimaryButton
            title="Delete Rejected Request"
            onPress={async () => {
              const removed = await deleteRejectedJoin(activity.id);
              if (!removed) {
                Alert.alert('Delete failed', 'Could not remove this rejected request.');
              }
            }}
            style={styles.joinBtn}
          />
        ) : (
          <PrimaryButton
            title={isFull ? 'Activity Full' : !isVerified ? 'Verify to Join' : 'Join Activity'}
            onPress={handleJoin}
            loading={isJoining}
            disabled={isFull || !isVerified}
            style={styles.joinBtn}
          />
        )}
      </Animated.View>

      {/* Join Confirmation Sheet */}
      <BottomSheet
        visible={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        snapPoints={[320]}
      >
        <View style={styles.confirmSheet}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={36} color={Colors.white} />
          </View>
          <Text style={styles.confirmTitle}>Request Sent</Text>
          <Text style={styles.confirmMessage}>
            You joined {activity.title} as pending. Chat unlocks automatically when approved.
          </Text>
          <PrimaryButton
            title="Got it"
            onPress={() => {
              setShowJoinSheet(false);
            }}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showPeopleSheet}
        onClose={() => setShowPeopleSheet(false)}
        snapPoints={[520]}
      >
        <View style={styles.peopleSheet}>
          <Text style={styles.peopleTitle}>Event people</Text>

          <View style={styles.peopleSection}>
            <Text style={styles.peopleSectionLabel}>Host</Text>
            <View style={[styles.personRow, Shadows.card]}>
              <View style={styles.personAvatar}>
                <Text style={styles.personAvatarText}>
                  {getPersonInitial(activity.hostId, activity.hostName || 'Host')}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{getPersonName(activity.hostId, activity.hostName || 'Host')}</Text>
                <Text style={styles.personMeta}>Host</Text>
              </View>
            </View>
          </View>

          <View style={styles.peopleSection}>
            <Text style={styles.peopleSectionLabel}>Members ({participantIds.length})</Text>
            {participantIds.length === 0 ? (
              <View style={[styles.emptyMembers, Shadows.card]}>
                <Text style={styles.emptyMembersText}>No members yet</Text>
              </View>
            ) : (
              <FlatList
                data={participantIds}
                keyExtractor={(item) => item}
                renderItem={({ item: memberId, index }) => (
                  <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                    <View style={[styles.personRow, Shadows.card]}>
                      <View style={styles.personAvatar}>
                        <Text style={styles.personAvatarText}>
                          {getPersonInitial(memberId, `Member ${index + 1}`)}
                        </Text>
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personName}>{getPersonName(memberId, `Member ${index + 1}`)}</Text>
                        <Text style={styles.personMeta}>Member</Text>
                      </View>
                    </View>
                  </Animated.View>
                )}
                contentContainerStyle={styles.membersList}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </BottomSheet>
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
  notFoundText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.slate,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 120,
  },
  imageGallery: {
    height: 250,
    backgroundColor: Colors.primary + '12',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  imageCarousel: {
    width: '100%',
    height: '100%',
  },
  galleryImage: {
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCounter: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  imageCountText: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
    color: Colors.white,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Typography.bodyMed,
    fontSize: 13,
  },
  fullBadge: {
    backgroundColor: Colors.danger + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  fullBadgeText: {
    fontFamily: Typography.bodyBold,
    fontSize: 12,
    color: Colors.danger,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 24,
    color: Colors.text,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
  },
  hostName: {
    fontFamily: Typography.bodyBold,
    color: Colors.text,
  },
  infoSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
  },
  infoValue: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.text,
    marginTop: 1,
  },
  descSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  participantsSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  participantCount: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.slate,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 6,
  },
  reactionCount: {
    fontFamily: Typography.bodyMed,
    fontSize: 13,
    color: Colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.card,
  },
  peopleSheet: {
    flex: 1,
  },
  peopleTitle: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  peopleSection: {
    marginBottom: Spacing.lg,
  },
  peopleSectionLabel: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  membersList: {
    paddingBottom: Spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  personAvatarText: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    color: Colors.white,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontFamily: Typography.bodyMed,
    fontSize: 15,
    color: Colors.text,
  },
  personMeta: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    marginTop: 2,
  },
  emptyMembers: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
  },
  emptyMembersText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chatBtn: {
    flex: 1,
  },
  leaveBtn: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtnText: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.danger,
  },
  joinBtn: {
    width: '100%',
  },
  manageBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSheet: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  confirmTitle: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  confirmMessage: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
});
