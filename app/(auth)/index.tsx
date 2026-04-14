import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bokeh circle animations
  const circle1 = useSharedValue(0);
  const circle2 = useSharedValue(0);
  const circle3 = useSharedValue(0);
  const panelY = useSharedValue(height);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate bokeh circles
    circle1.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    circle2.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    circle3.value = withDelay(
      1000,
      withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // Slide panel up with spring
    panelY.value = withDelay(
      300,
      withSpring(0, { damping: 18, stiffness: 120 })
    );

    // Fade in title and subtitle
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 800 }));
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
  }, []);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(circle1.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(circle1.value, [0, 1], [-10, 30]) },
      { scale: interpolate(circle1.value, [0, 1], [0.8, 1.2]) },
    ],
    opacity: interpolate(circle1.value, [0, 0.5, 1], [0.15, 0.25, 0.15]),
  }));

  const circle2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(circle2.value, [0, 1], [30, -20]) },
      { translateY: interpolate(circle2.value, [0, 1], [20, -10]) },
      { scale: interpolate(circle2.value, [0, 1], [1, 0.7]) },
    ],
    opacity: interpolate(circle2.value, [0, 0.5, 1], [0.1, 0.2, 0.1]),
  }));

  const circle3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(circle3.value, [0, 1], [-15, 25]) },
      { translateY: interpolate(circle3.value, [0, 1], [15, -20]) },
      { scale: interpolate(circle3.value, [0, 1], [0.9, 1.3]) },
    ],
    opacity: interpolate(circle3.value, [0, 0.5, 1], [0.12, 0.22, 0.12]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Navy background with bokeh circles */}
      <View style={styles.background}>
        <Animated.View style={[styles.bokehCircle, styles.circle1, circle1Style]} />
        <Animated.View style={[styles.bokehCircle, styles.circle2, circle2Style]} />
        <Animated.View style={[styles.bokehCircle, styles.circle3, circle3Style]} />

        {/* App name and tagline */}
        <View style={styles.brandContainer}>
          <Animated.Text style={[styles.appName, titleStyle]}>
            <Text style={styles.appNameJoin}>Join</Text>
            <Text style={styles.appNameUp}>Up</Text>
          </Animated.Text>
          <Animated.Text style={[styles.tagline, subtitleStyle]}>
            Find your people. Do things.
          </Animated.Text>
        </View>
      </View>

      {/* White curved bottom panel */}
      <Animated.View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.lg }, panelStyle]}>
        <PrimaryButton
          title="Get Started"
          onPress={() => router.push('/(auth)/sign-up')}
          style={styles.primaryBtn}
        />
        <SecondaryButton
          title="Continue with Email"
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.secondaryBtn}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bokehCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: Colors.accent,
    top: height * 0.1,
    left: -40,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: Colors.peach,
    top: height * 0.05,
    right: -30,
  },
  circle3: {
    width: 180,
    height: 180,
    backgroundColor: Colors.accent,
    top: height * 0.25,
    right: width * 0.3,
  },
  brandContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  appName: {
    fontSize: 42,
    fontFamily: Typography.display,
    marginBottom: Spacing.sm,
  },
  appNameJoin: {
    color: Colors.white,
  },
  appNameUp: {
    color: Colors.accent,
  },
  tagline: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.slate,
  },
  panel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.sheet + 8,
    borderTopRightRadius: BorderRadius.sheet + 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  primaryBtn: {
    marginBottom: Spacing.md,
  },
  secondaryBtn: {
    marginBottom: Spacing.sm,
  },
});
