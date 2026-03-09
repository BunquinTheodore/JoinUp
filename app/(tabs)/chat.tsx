import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CategoryColors } from '../../constants/theme';
import { useActivities } from '../../hooks/useActivities';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities, isLoading } = useActivities();

  // Show chats for activities user is part of
  const chatActivities = activities.filter((a) =>
    a.participants.includes('user-1')
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Chats</Text>
      </View>

      {chatActivities.length === 0 ? (
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
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <TouchableOpacity
                  style={[styles.chatItem, Shadows.card]}
                  onPress={() => router.push(`/chat/${item.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.chatIcon, { backgroundColor: chipColor + '20' }]}>
                    <Ionicons name="chatbubble" size={20} color={chipColor} />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.chatSubtitle} numberOfLines={1}>
                      {item.participants.length} participants
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.slate} />
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
});
