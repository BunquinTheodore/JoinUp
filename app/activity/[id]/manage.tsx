import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { NavBar } from '../../../components/layout/NavBar';
import { SlotProgressBar } from '../../../components/ui/SlotProgressBar';
import { useActivities } from '../../../hooks/useActivities';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';

export default function ManageActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { activities, leaveActivity, refetch } = useActivities();

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const activity = useMemo(
    () => activities.find((a) => a.id === id) ?? null,
    [activities, id]
  );

  const uploadActivityImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = (uri.split('.').pop() ?? 'jpg').split('?')[0].toLowerCase();
    const path = `activity-images/${user?.uid ?? 'anon'}-${activity?.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(path, blob, {
        upsert: false,
        contentType: blob.type || 'image/jpeg',
      });

    if (uploadError) {
      throw uploadError;
    }

    return supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl;
  };

  const handleAddImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow media access to add images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setIsUploadingImage(true);
      const imageUrl = await uploadActivityImage(result.assets[0].uri);

      // Update activity with new image
      const currentImages = activity?.images ?? [];
      const updatedImages = [...currentImages, imageUrl];

      const { error } = await supabase
        .from('activities')
        .update({ images: updatedImages })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      Alert.alert('Success', 'Image added successfully!');
    } catch {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = (imageUrl: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedImages = (activity?.images ?? []).filter((img) => img !== imageUrl);

              const { error } = await supabase
                .from('activities')
                .update({ images: updatedImages })
                .eq('id', id);

              if (error) throw error;

              await refetch();

              Alert.alert('Success', 'Image deleted successfully!');
            } catch {
              Alert.alert('Error', 'Could not delete the image.');
            }
          },
        },
      ]
    );
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {/* Image Gallery */}
          <Text style={styles.sectionTitle}>Photos ({(activity.images ?? []).length})</Text>
          <View style={[styles.imageGallery, Shadows.card]}>
            {(activity.images ?? []).length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                {activity.images!.map((imageUrl, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.galleryImage} />
                    <TouchableOpacity
                      style={styles.deleteImageBtn}
                      onPress={() => handleDeleteImage(imageUrl)}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyGallery}>
                <Ionicons name="images-outline" size={32} color={Colors.slate} />
                <Text style={styles.emptyGalleryText}>No photos yet</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.addImageBtn}
              onPress={handleAddImage}
              disabled={isUploadingImage}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
              <Text style={styles.addImageText}>{isUploadingImage ? 'Uploading...' : 'Add Photo'}</Text>
            </TouchableOpacity>
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
            scrollEnabled={false}
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
      </ScrollView>
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
  scrollContent: {
    paddingVertical: Spacing.md,
  },
  imageGallery: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  imageScrollView: {
    marginBottom: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.sm,
  },
  deleteImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.text,
    borderRadius: 12,
  },
  emptyGallery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyGalleryText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.slate,
    marginTop: Spacing.sm,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  addImageText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.accent,
  },
});
