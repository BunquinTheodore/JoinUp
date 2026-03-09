import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../constants/theme';

interface NotificationBadgeProps {
  count: number;
  size?: number;
}

export function NotificationBadge({ count, size = 18 }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          width: count > 9 ? size + 8 : size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.6 }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  text: {
    color: Colors.white,
    fontFamily: Typography.bodyBold,
    textAlign: 'center',
  },
});
