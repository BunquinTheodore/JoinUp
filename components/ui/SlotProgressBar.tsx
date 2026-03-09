import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/theme';

interface SlotProgressBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
}

export function SlotProgressBar({ current, max, showLabel = true }: SlotProgressBarProps) {
  const progress = useSharedValue(0);
  const percentage = max > 0 ? (current / max) * 100 : 0;

  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%` as `${number}%`,
  }));

  const barColor = percentage >= 100 ? Colors.danger : percentage >= 75 ? Colors.peach : Colors.accent;

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: barColor },
            animatedStyle,
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>
          {current}/{max} joined
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barBackground: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.cream,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.slate,
    minWidth: 60,
  },
});
