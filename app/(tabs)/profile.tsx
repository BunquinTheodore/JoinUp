import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
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
import { useActivities } from '../../hooks/useActivities';

type ProfileTab = 'Joined' | 'Hosting' | 'Past';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { activities } = useActivities();
  const [activeTab, setActiveTab] = useState<ProfileTab>('Joined');
  const [showEditSheet, setShowEditSheet] = useState(false);

  const joinedActivities = activities.filter(
    (a) => a.participants.includes(user?.uid ?? '') && a.hostId !== user?.uid
  );
  const hostedActivities = activities.filter(
    (a) => a.hostId === user?.uid
  );
  const pastActivities = activities.filter(
    (a) => a.status === 'completed'
  );

  const getTabActivities = () => {
    switch (activeTab) {
      case 'Joined': return joinedActivities;
      case 'Hosting': return hostedActivities;
      case 'Past': return pastActivities;
    }
  };

  const stats = [
    { label: 'Joined', value: user?.activitiesJoined?.length ?? 0 },
    { label: 'Hosted', value: user?.activitiesHosted?.length ?? 0 },
    { label: 'Rating', value: user?.rating?.toFixed(1) ?? '0.0' },
  ];

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
          <TouchableOpacity style={styles.settingsBtn}>
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
          <Text style={styles.location}>San Francisco, CA</Text>
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
          {getTabActivities().length === 0 ? (
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} activities yet.
            </Text>
          ) : (
            getTabActivities().map((activity, index) => {
              const chipColor = CategoryColors[activity.category] ?? Colors.accent;
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
                      <Ionicons name="image-outline" size={24} color={chipColor} />
                    </View>
                    <Text style={styles.miniCardTitle} numberOfLines={1}>
                      {activity.title}
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
        snapPoints={[500]}
      >
        <Text style={styles.sheetTitle}>Edit Profile</Text>
        <InputField
          label="Display Name"
          value={user?.displayName ?? ''}
          onChangeText={() => {}}
          placeholder="Your name"
        />
        <InputField
          label="Bio"
          value={user?.bio ?? ''}
          onChangeText={() => {}}
          placeholder="About you"
          multiline
          numberOfLines={3}
        />
        <Text style={styles.fieldLabel}>Interests</Text>
        <View style={styles.chipsRow}>
          {['Fitness', 'Study', 'Outdoors', 'Gaming', 'Café', 'Music', 'Food', 'Social'].map(
            (interest) => (
              <CategoryChip
                key={interest}
                label={interest}
                selected={user?.interests?.includes(interest) ?? false}
                onPress={() => {}}
                size="sm"
              />
            )
          )}
        </View>
        <PrimaryButton
          title="Save Changes"
          onPress={() => setShowEditSheet(false)}
          style={{ marginTop: Spacing.md }}
        />
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
  },
  miniCardTitle: {
    fontFamily: Typography.bodyMed,
    fontSize: 13,
    color: Colors.text,
    padding: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
});
