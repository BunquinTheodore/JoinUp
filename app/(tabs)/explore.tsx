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

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading } = useActivities();
  const { location } = useLocation();
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState('All Philippines');

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
    if (selectedPlaceOption.label === 'All Philippines') {
      return activities;
    }

    return activities.filter((activity) => {
      const haystack = `${activity.location.name} ${activity.title}`.toLowerCase();
      return selectedPlaceOption.keywords.some((keyword) => haystack.includes(keyword));
    });
  }, [activities, selectedPlaceOption]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <NavBar
        title="Explore"
        showBack
      />

      {/* Location dropdown */}
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

      {showPlaceDropdown ? (
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setShowPlaceDropdown(false)}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Section title */}
        <Text style={styles.sectionTitle}>Happening Near You</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
        ) : (
          filteredActivities.length === 0 ? (
            <Text style={styles.emptyText}>No activities found for this place yet.</Text>
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
});
