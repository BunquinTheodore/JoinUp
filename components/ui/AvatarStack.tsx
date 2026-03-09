import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface AvatarStackProps {
  count: number;
  size?: number;
  maxShow?: number;
}

export function AvatarStack({ count, size = 28, maxShow = 4 }: AvatarStackProps) {
  const shown = Math.min(count, maxShow);
  const avatarColors = [Colors.accent, Colors.primary, Colors.peach, Colors.success, Colors.slate];

  return (
    <View style={styles.container}>
      {Array.from({ length: shown }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: avatarColors[i % avatarColors.length],
              marginLeft: i > 0 ? -(size * 0.3) : 0,
              zIndex: shown - i,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
