import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { NavBar } from '../../components/layout/NavBar';
import { useActivities } from '../../hooks/useActivities';
import { useLocation } from '../../hooks/useLocation';
import { useUsers } from '../../hooks/useUsers';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;

type PlaceOption = {
  label: string;
  keywords: string[];
};

const PHILIPPINE_PLACES: PlaceOption[] = [
  { label: 'All Philippines', keywords: [] },
  { label: 'Batangas City', keywords: ['batangas city'] },
  { label: 'Manila', keywords: ['manila', 'intramuros', 'luneta', 'rizal park', 'binondo', 'escolta'] },
  { label: 'Makati', keywords: ['makati', 'poblacion', 'little tokyo'] },
  { label: 'Quezon City', keywords: ['quezon city', 'up diliman'] },
  { label: 'Taguig / BGC', keywords: ['taguig', 'bgc'] },
  { label: 'Paranaque', keywords: ['paranaque', 'baclaran'] },
  { label: 'Batangas (Province)', keywords: ['batangas', 'bauan', 'mt. maculot', 'taal'] },
];

type ViewMode = 'events' | 'users';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading: activitiesLoading } = useActivities();
  const { users, isLoading: usersLoading } = useUsers();
  const { location } = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('events');
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState('All Philippines');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (!location?.city) return;

    const city = location.city.toLowerCase();
    const matched = PHILIPPINE_PLACES.find(
      (place) => place.label !== 'All Philippines' && place.keywords.some((keyword) => keyword.includes(city))
    );

    if (matched) {
      setSelectedPlace(matched.label);
    }
  }, [location?.city]);

  const selectedPlaceOption = useMemo(
    () => PHILIPPINE_PLACES.find((place) => place.label === selectedPlace) ?? PHILIPPINE_PLACES[0],
    [selectedPlace]
  );

  const filteredActivities = useMemo(() => {
    const byPlace = selectedPlaceOption.label === 'All Philippines'
      ? activities
      : activities.filter((activity) => {
          const haystack = `${activity.location.name} ${activity.title}`.toLowerCase();
          return selectedPlaceOption.keywords.some((keyword) => haystack.includes(keyword));
        });

    if (!eventSearchQuery.trim()) {
      return byPlace;
    }

    const query = eventSearchQuery.toLowerCase();
    return byPlace.filter((activity) => {
      const titleMatch = activity.title.toLowerCase().includes(query);
      const locationMatch = activity.location.name.toLowerCase().includes(query);
      const categoryMatch = activity.category.toLowerCase().includes(query);
      return titleMatch || locationMatch || categoryMatch;
    });
  }, [activities, eventSearchQuery, selectedPlaceOption]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) {
      return users;
    }

    const query = userSearchQuery.toLowerCase();
    return users.filter((user) => {
      const nameMatch = user.displayName.toLowerCase().includes(query);
      const bioMatch = user.bio.toLowerCase().includes(query);
      const interestsMatch = user.interests.some((interest) => interest.toLowerCase().includes(query));
      return nameMatch || bioMatch || interestsMatch;
    });
  }, [users, userSearchQuery]);

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

      {/* View mode tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'events' && styles.tabActive]}
          onPress={() => setViewMode('events')}
        >
          <Text style={[styles.tabText, viewMode === 'events' && styles.tabTextActive]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'users' && styles.tabActive]}
          onPress={() => setViewMode('users')}
        >
          <Text style={[styles.tabText, viewMode === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {/* Location dropdown (Events only) */}
      {viewMode === 'events' && (
      <View style={styles.locationWrap}>
        <TouchableOpacity
          style={styles.locationPill}
          activeOpacity={0.85}
          onPress={() => setShowPlaceDropdown((prev) => !prev)}
        >
          <Ionicons name="location" size={16} color={Colors.success} />
          <Text style={styles.locationText}>{selectedPlace}</Text>
          <Ionicons name={showPlaceDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.slate} />
        </TouchableOpacity>

        {showPlaceDropdown ? (
          <View style={[styles.placeDropdown, Shadows.card]}>
            {PHILIPPINE_PLACES.map((place) => {
              const active = place.label === selectedPlace;
              return (
                <TouchableOpacity
                  key={place.label}
                  style={[styles.placeItem, active && styles.placeItemActive]}
                  onPress={() => {
                    setSelectedPlace(place.label);
                    setShowPlaceDropdown(false);
                  }}
                >
                  <Text style={[styles.placeItemText, active && styles.placeItemTextActive]}>{place.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
      )}

      {showPlaceDropdown && viewMode === 'events' ? (
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setShowPlaceDropdown(false)}
        />
      ) : null}

      {/* Event search bar (Events only) */}
      {viewMode === 'events' && (
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.slate} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events by title or location"
          placeholderTextColor={Colors.slate}
          value={eventSearchQuery}
          onChangeText={setEventSearchQuery}
        />
        {eventSearchQuery ? (
          <TouchableOpacity onPress={() => setEventSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.slate} />
          </TouchableOpacity>
        ) : null}
      </View>
      )}

      {/* User search bar (Users only) */}
      {viewMode === 'users' && (
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.slate} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or interests"
          placeholderTextColor={Colors.slate}
          value={userSearchQuery}
          onChangeText={setUserSearchQuery}
        />
        {userSearchQuery ? (
          <TouchableOpacity onPress={() => setUserSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.slate} />
          </TouchableOpacity>
        ) : null}
      </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Events view */}
        {viewMode === 'events' && (
        <>
          {/* Section title */}
          <Text style={styles.sectionTitle}>Happening Near You</Text>

          {activitiesLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          ) : (
            filteredActivities.length === 0 ? (
              <Text style={styles.emptyText}>
                {eventSearchQuery ? 'No activities found matching your search.' : 'No activities found for this place yet.'}
              </Text>
            ) : filteredActivities.map((activity, index) => {
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
                  {/* Cover image */}
                  <View style={styles.coverImage}>
                    {activity.coverImage ? (
                      <Image
                        source={{ uri: activity.coverImage }}
                        style={styles.coverPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.coverPlaceholder}>
                        <Ionicons name="image-outline" size={40} color={Colors.slate} />
                      </View>
                    )}

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

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {activity.title}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={Colors.slate} />
                        <Text style={styles.metaText} numberOfLines={2}>
                          {activity.location.name}
                        </Text>
                      </View>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {dateStr}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
          )}
        </>
        )}

        {/* Users view */}
        {viewMode === 'users' && (
        <>
          {/* Section title */}
          <Text style={styles.sectionTitle}>Discover People</Text>

          {usersLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          ) : (
            filteredUsers.length === 0 ? (
              <Text style={styles.emptyText}>{userSearchQuery ? 'No users found matching your search.' : 'No users available yet.'}</Text>
            ) : filteredUsers.map((user, index) => (
              <Animated.View
                key={user.uid}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <View
                  style={[styles.userCard, Shadows.card]}
                >
                  {/* Profile photo */}
                  <View style={styles.userPhotoContainer}>
                    {user.photoURL ? (
                      <Image
                        source={{ uri: user.photoURL }}
                        style={styles.userPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.userPhotoPlaceholder}>
                        <Ionicons name="person-outline" size={40} color={Colors.slate} />
                      </View>
                    )}
                    {user.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                      </View>
                    )}
                  </View>

                  {/* User info */}
                  <View style={styles.userInfo}>
                    <View style={styles.userHeader}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.displayName || 'Anonymous'}
                      </Text>
                      {user.ratingCount > 0 && (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color={Colors.accent} />
                          <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>

                    {user.bio && (
                      <Text style={styles.userBio} numberOfLines={2}>
                        {user.bio}
                      </Text>
                    )}

                    {user.interests.length > 0 && (
                      <View style={styles.interestsContainer}>
                        {user.interests.slice(0, 3).map((interest, i) => (
                          <View key={i} style={styles.interestTag}>
                            <Text style={styles.interestText}>{interest}</Text>
                          </View>
                        ))}
                        {user.interests.length > 3 && (
                          <Text style={styles.moreInterests}>+{user.interests.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </>
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: Typography.bodyMed,
    fontSize: 16,
    color: Colors.slate,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  locationWrap: {
    position: 'relative',
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
    zIndex: 30,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  placeDropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.divider,
    minWidth: 210,
    overflow: 'hidden',
    zIndex: 31,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  placeItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeItemActive: {
    backgroundColor: Colors.accent + '14',
  },
  placeItemText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
  },
  placeItemTextActive: {
    color: Colors.accent,
    fontFamily: Typography.bodyMed,
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
  emptyText: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    color: Colors.slate,
    fontFamily: Typography.body,
    fontSize: 14,
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
  coverPhoto: {
    width: '100%',
    height: '100%',
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
    lineHeight: 23,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    flexShrink: 1,
    minWidth: 0,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  userPhotoContainer: {
    position: 'relative',
  },
  userPhoto: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.card,
  },
  userPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    ...Shadows.card,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  userName: {
    fontFamily: Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: Spacing.sm,
  },
  ratingText: {
    fontFamily: Typography.bodyMed,
    fontSize: 12,
    color: Colors.accent,
  },
  userBio: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  interestsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: Colors.accent + '14',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  interestText: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.accent,
  },
  moreInterests: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.slate,
    paddingHorizontal: Spacing.xs,
  },
});
