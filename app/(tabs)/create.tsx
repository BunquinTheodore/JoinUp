import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

const CATEGORIES = ['Fitness', 'Study', 'Café', 'Outdoors', 'Gaming', 'Social', 'Food', 'Other'];

export default function CreateActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [maxSlots, setMaxSlots] = useState('8');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid =
    title.trim() &&
    description.trim() &&
    category &&
    locationName.trim() &&
    parseInt(maxSlots) > 0;

  const handleUseMyLocation = async () => {
    // Mock reverse geocode
    setLocationName('San Francisco, CA');
  };

  const handleImagePick = async () => {
    Alert.alert('Image Picker', 'Cover image picker would open here.');
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      // Mock submission
      await new Promise((r) => setTimeout(r, 1500));
      Alert.alert('Success', 'Activity created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to create activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + Spacing.md }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.heading}>Create Activity</Text>
          <Text style={styles.subtitle}>Plan something awesome</Text>
        </Animated.View>

        {/* Cover image */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <TouchableOpacity style={styles.coverUpload} onPress={handleImagePick}>
            <Ionicons name="camera-outline" size={32} color={Colors.slate} />
            <Text style={styles.coverText}>Add Cover Photo</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <InputField
            label="Activity Title"
            placeholder="Give it a catchy name"
            value={title}
            onChangeText={setTitle}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <InputField
            label="Description"
            placeholder="What's the plan?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </Animated.View>

        {/* Category */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                size="sm"
              />
            ))}
          </View>
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <InputField
            label="Location"
            placeholder="Where is it happening?"
            value={locationName}
            onChangeText={setLocationName}
          />
          <TouchableOpacity
            style={styles.useLocationBtn}
            onPress={handleUseMyLocation}
          >
            <Ionicons name="navigate-outline" size={16} color={Colors.accent} />
            <Text style={styles.useLocationText}>Use my location</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Date and Time */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <TouchableOpacity style={styles.dateBtn}>
            <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
            <Text style={styles.dateBtnText}>
              {format(date, 'EEEE, MMMM d, yyyy · h:mm a')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Max slots */}
        <Animated.View entering={FadeInDown.delay(450).springify()}>
          <InputField
            label="Max Participants"
            placeholder="8"
            value={maxSlots}
            onChangeText={setMaxSlots}
            keyboardType="number-pad"
          />
        </Animated.View>

        {/* Requires approval */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Require Approval</Text>
              <Text style={styles.switchDesc}>
                Review and approve join requests
              </Text>
            </View>
            <Switch
              value={requiresApproval}
              onValueChange={setRequiresApproval}
              trackColor={{ false: Colors.divider, true: Colors.accent + '50' }}
              thumbColor={requiresApproval ? Colors.accent : Colors.white}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).springify()}>
          <PrimaryButton
            title="Create Activity"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!isValid}
            style={styles.submitBtn}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  heading: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.slate,
    marginBottom: Spacing.lg,
  },
  coverUpload: {
    height: 140,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  coverText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.slate,
  },
  fieldLabel: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  useLocationText: {
    fontFamily: Typography.bodyMed,
    fontSize: 14,
    color: Colors.accent,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dateBtnText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  switchInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontFamily: Typography.bodyMed,
    fontSize: 15,
    color: Colors.text,
  },
  switchDesc: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.slate,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
});
