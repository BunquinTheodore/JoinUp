import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { signOutAndResetSession } from '../../hooks/useAuth';

type ProfileTab = 'Joined' | 'Hosting' | 'Past';
type HistoryActivity = {
  id: string;
  title: string;
  category: string;
  coverImage?: string;
  dateTime: string;
  locationName: string;
  status: string;
  hostId: string;
};

function mapHistoryActivity(row: any): HistoryActivity {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    coverImage: row.cover_image ?? undefined,
    dateTime: row.date_time,
    locationName: row.location_name ?? '',
    status: row.status ?? 'active',
    hostId: row.host_id,
  };
}

function dedupeById(items: HistoryActivity[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [activeTab, setActiveTab] = useState<ProfileTab>('Joined');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState<'switch' | 'logout' | null>(null);
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [editLocation, setEditLocation] = useState(user?.location ?? '');
  const [editBio, setEditBio] = useState(user?.bio ?? '');
  const [joinedActivities, setJoinedActivities] = useState<HistoryActivity[]>([]);
  const [hostedActivities, setHostedActivities] = useState<HistoryActivity[]>([]);
  const [pastActivities, setPastActivities] = useState<HistoryActivity[]>([]);

  useEffect(() => {
    setEditName(user?.displayName ?? '');
    setEditLocation(user?.location ?? '');
    setEditBio(user?.bio ?? '');
  }, [user?.bio, user?.displayName, user?.location]);

  const fetchHistory = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const now = new Date().toISOString();
      const { data: joinedRows, error: joinedError } = await supabase
        .from('participants')
        .select('activity_id')
        .eq('user_id', user.uid)
        .eq('status', 'joined');

      if (joinedError) throw joinedError;

      const joinedIds = (joinedRows ?? []).map((row: any) => row.activity_id);

      let joinedActivitiesRaw: HistoryActivity[] = [];
      if (joinedIds.length > 0) {
        const { data: joinedActivitiesData, error: joinedActivitiesError } = await supabase
          .from('activities')
          .select('id, title, category, cover_image, date_time, location_name, status, host_id')
          .in('id', joinedIds)
          .order('date_time', { ascending: true });

        if (joinedActivitiesError) throw joinedActivitiesError;
        joinedActivitiesRaw = (joinedActivitiesData ?? []).map(mapHistoryActivity);
      }

      const { data: hostedData, error: hostedError } = await supabase
        .from('activities')
        .select('id, title, category, cover_image, date_time, location_name, status, host_id')
        .eq('host_id', user.uid)
        .order('date_time', { ascending: true });

      if (hostedError) throw hostedError;

      const hostedRaw = (hostedData ?? []).map(mapHistoryActivity);

      const joinedUpcoming = joinedActivitiesRaw.filter(
        (activity) => activity.hostId !== user.uid && activity.status === 'active' && activity.dateTime >= now
      );
      const hostedUpcoming = hostedRaw.filter(
        (activity) => activity.status === 'active' && activity.dateTime >= now
      );
      const past = dedupeById([
        ...joinedActivitiesRaw.filter((activity) => activity.status !== 'active' || activity.dateTime < now),
        ...hostedRaw.filter((activity) => activity.status !== 'active' || activity.dateTime < now),
      ]).sort(
        (left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime()
      );

      setJoinedActivities(joinedUpcoming);
      setHostedActivities(hostedUpcoming);
      setPastActivities(past);
    } catch (error: any) {
      setHistoryError(error.message ?? 'Failed to load profile activity history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.uid) return;
    const nextName = editName.trim();
    const nextLocation = editLocation.trim();
    const nextBio = editBio.trim();

    if (!nextName) {
      Alert.alert('Missing name', 'Display name is required.');
      return;
    }

    const updates: {
      display_name?: string;
      location?: string;
      bio?: string;
    } = {};

    if (nextName !== (user.displayName ?? '').trim()) {
      updates.display_name = nextName;
    }

    if (nextLocation !== (user.location ?? '').trim()) {
      updates.location = nextLocation;
    }

    if (nextBio !== (user.bio ?? '').trim()) {
      updates.bio = nextBio;
    }

    if (Object.keys(updates).length === 0) {
      setShowEditSheet(false);
      return;
    }

    try {
      setSaveLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.uid);

      if (error) {
        const missingLocationMessage = [error.message, error.details, error.hint]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const isMissingLocationColumn =
          updates.location !== undefined &&
          (
            error.code === 'PGRST204' ||
            missingLocationMessage.includes("could not find the 'location' column") ||
            (missingLocationMessage.includes('location') && missingLocationMessage.includes('column'))
          );

        if (!isMissingLocationColumn) {
          throw error;
        }

        const retryUpdates = { ...updates };
        delete retryUpdates.location;

        if (Object.keys(retryUpdates).length > 0) {
          const { error: retryError } = await supabase
            .from('profiles')
            .update(retryUpdates)
            .eq('id', user.uid);

          if (retryError) throw retryError;
        }

        const localFallbackUpdates: { displayName?: string; bio?: string } = {};

        if (retryUpdates.display_name !== undefined) {
          localFallbackUpdates.displayName = nextName;
        }

        if (retryUpdates.bio !== undefined) {
          localFallbackUpdates.bio = nextBio;
        }

        if (Object.keys(localFallbackUpdates).length > 0) {
          updateUser(localFallbackUpdates);
        }

        setShowEditSheet(false);
        Alert.alert(
          'Saved with warning',
          'Name and bio were saved. Location could not be saved because the database schema is missing the location column. Run the latest Supabase migrations to enable location updates.'
        );
        return;
      }

      const localUpdates: { displayName?: string; location?: string; bio?: string } = {};

      if (updates.display_name !== undefined) {
        localUpdates.displayName = nextName;
      }

      if (updates.location !== undefined) {
        localUpdates.location = nextLocation;
      }

      if (updates.bio !== undefined) {
        localUpdates.bio = nextBio;
      }

      updateUser(localUpdates);

      setShowEditSheet(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Save failed', error.message ?? 'Could not save your profile.');
    } finally {
      setSaveLoading(false);
    }
  }, [editBio, editLocation, editName, updateUser, user?.uid]);

  const handleAuthAction = useCallback(
    async (action: 'switch' | 'logout') => {
      const isSwitch = action === 'switch';
      try {
        setAuthActionLoading(action);
        setShowSettingsSheet(false);
        await signOutAndResetSession();
        await new Promise((resolve) => setTimeout(resolve, 250));
        router.replace(isSwitch ? '/(auth)/sign-in' : '/(auth)');
      } catch (error: any) {
        Alert.alert('Sign out failed', error.message ?? 'Could not complete the request.');
      } finally {
        setAuthActionLoading(null);
      }
    },
    [router]
  );

  const getTabActivities = useCallback(() => {
    switch (activeTab) {
      case 'Joined':
        return joinedActivities;
      case 'Hosting':
        return hostedActivities;
      case 'Past':
        return pastActivities;
    }
  }, [activeTab, hostedActivities, joinedActivities, pastActivities]);

  const stats = useMemo(
    () => [
      { label: 'Joined', value: joinedActivities.length },
      { label: 'Hosted', value: hostedActivities.length },
      { label: 'Rating', value: user?.rating?.toFixed(1) ?? '0.0' },
    ],
    [hostedActivities.length, joinedActivities.length, user?.rating]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setShowSettingsSheet(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Avatar and info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </View>
          <Text style={styles.displayName}>
            {user?.displayName ?? 'User'}
          </Text>
          <Text style={styles.location}>{user?.location || 'No location set'}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowEditSheet(true)}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>
            {user?.bio ?? 'No bio yet.'}
          </Text>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.chipsRow}>
            {(user?.interests ?? []).map((interest) => (
              <CategoryChip
                key={interest}
                label={interest}
                selected={false}
                onPress={() => {}}
                size="sm"
              />
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['Joined', 'Hosting', 'Past'] as ProfileTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity list */}
        <View style={styles.activitiesSection}>
          {historyLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.loadingText}>Loading your activity history...</Text>
            </View>
          ) : historyError ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.errorText}>{historyError}</Text>
              <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : getTabActivities().length === 0 ? (
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} activities yet.
            </Text>
          ) : (
            getTabActivities().map((activity, index) => {
              const chipColor = CategoryColors[activity.category as keyof typeof CategoryColors] ?? Colors.accent;
              return (
                <Animated.View
                  key={activity.id}
                  entering={FadeInDown.delay(index * 50).springify()}
                >
                  <TouchableOpacity
                    style={[styles.miniCard, Shadows.card]}
                    onPress={() => router.push(`/activity/${activity.id}`)}
                  >
                    <View style={[styles.miniCardImage, { backgroundColor: chipColor + '20' }]}>
                      {activity.coverImage ? (
                        <Image
                          source={{ uri: activity.coverImage }}
                          style={styles.miniCardPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={24} color={chipColor} />
                      )}
                    </View>
                    <Text style={styles.miniCardTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text style={styles.miniCardMeta} numberOfLines={1}>
                      {activity.locationName}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Sheet */}
      <BottomSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        snapPoints={[520]}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <InputField
            label="Display Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
          />
          <InputField
            label="Location"
            value={editLocation}
            onChangeText={setEditLocation}
            placeholder="City, Country"
          />
          <InputField
            label="Bio"
            value={editBio}
            onChangeText={setEditBio}
            placeholder="About you"
            multiline
            numberOfLines={4}
          />
          <PrimaryButton
            title="Save Changes"
            onPress={handleSaveProfile}
            loading={saveLoading}
            style={styles.sheetSaveBtn}
          />
        </ScrollView>
      </BottomSheet>

      {/* Account Settings Sheet */}
      <BottomSheet
        visible={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        snapPoints={[330]}
      >
        <View style={styles.settingsSheetContent}>
          <Text style={styles.sheetTitle}>Account settings</Text>
          <Text style={styles.settingsSubtitle}>
            Manage how this device signs into JoinUp.
          </Text>

          <TouchableOpacity
            style={styles.settingsAction}
            onPress={() => handleAuthAction('switch')}
            activeOpacity={0.85}
            disabled={authActionLoading !== null}
          >
            <View style={[styles.settingsIconWrap, styles.settingsIconAccent]}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.accent} />
            </View>
            <View style={styles.settingsActionTextWrap}>
              <Text style={styles.settingsActionTitle}>Switch account</Text>
              <Text style={styles.settingsActionSubtitle}>
                Sign out and jump straight to sign in.
              </Text>
            </View>
            {authActionLoading === 'switch' ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.slate} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsAction}
            onPress={() => handleAuthAction('logout')}
            activeOpacity={0.85}
            disabled={authActionLoading !== null}
          >
            <View style={[styles.settingsIconWrap, styles.settingsIconDanger]}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.settingsActionTextWrap}>
              <Text style={styles.settingsActionTitle}>Log out</Text>
              <Text style={styles.settingsActionSubtitle}>
                End this session and return to the welcome screen.
              </Text>
            </View>
            {authActionLoading === 'logout' ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.slate} />
            )}
          </TouchableOpacity>
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
  profileHeader: {
    backgroundColor: Colors.primary,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSheetContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  settingsSubtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
    marginBottom: Spacing.md,
  },
  settingsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.cream,
    marginBottom: Spacing.sm,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconAccent: {
    backgroundColor: Colors.accent + '18',
  },
  settingsIconDanger: {
    backgroundColor: Colors.error + '14',
  },
  settingsActionTextWrap: {
    flex: 1,
  },
  settingsActionTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  settingsActionSubtitle: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
    lineHeight: 18,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: Spacing.md,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  displayName: {
    fontFamily: Typography.bodyBold,
    fontSize: 22,
    color: Colors.text,
  },
  location: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
    marginTop: 2,
  },
  editBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.text,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  editBtnText: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.bodyBold,
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  bioText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.slate,
  },
  tabTextActive: {
    color: Colors.accent,
    fontFamily: Typography.bodyBold,
  },
  activitiesSection: {
    padding: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
    textAlign: 'center',
    width: '100%',
    paddingVertical: Spacing.xl,
  },
  miniCard: {
    width: 160,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
  },
  miniCardImage: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniCardPhoto: {
    width: '100%',
    height: '100%',
  },
  miniCardTitle: {
    fontFamily: Typography.bodyMed,
    fontSize: 13,
    color: Colors.text,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  miniCardMeta: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingBottom: Spacing.xl,
  },
  sheetSaveBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  loadingWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  retryBtnText: {
    fontFamily: Typography.bodyMed,
    color: Colors.accent,
  },
});
