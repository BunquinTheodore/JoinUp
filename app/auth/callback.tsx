import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function OAuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect quickly to root; auth state synchronization runs in the auth hook.
    const timer = setTimeout(() => {
      router.replace('/');
    }, 250);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cream,
  },
});
