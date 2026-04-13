import React, { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Syne_700Bold } from '@expo-google-fonts/syne';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '../lib/queryClient';
import { StatusBar } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAuthBootstrapped(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || !authBootstrapped) {
      return;
    }

    const currentPath = pathname || '/';
    const isAuthRoute =
      currentPath === '/' ||
      currentPath.startsWith('/(auth)') ||
      currentPath.startsWith('/sign-in') ||
      currentPath.startsWith('/sign-up');

    const isProtectedRoute =
      currentPath.startsWith('/(tabs)') ||
      currentPath.startsWith('/activity') ||
      currentPath.startsWith('/chat') ||
      currentPath.startsWith('/notifications') ||
      currentPath.startsWith('/profile') ||
      currentPath.startsWith('/explore') ||
      currentPath.startsWith('/create');

    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/(auth)');
      return;
    }

    if (isAuthenticated && isAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [authBootstrapped, fontsLoaded, isAuthenticated, pathname, router]);

  if (!fontsLoaded || !authBootstrapped) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="light-content" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="activity/[id]"
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="chat/[id]"
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
