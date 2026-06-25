import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore, useProtectedRoute } from '@/features/auth';
import '@/shared/lib/env'; // fail fast on invalid environment
import { AppQueryProvider } from '@/shared/lib/query';
import { registerSupabaseAutoRefresh } from '@/shared/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Load the session once, keep it fresh while foregrounded, and route-guard.
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    const stopAutoRefresh = registerSupabaseAutoRefresh();
    return () => {
      unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  useProtectedRoute();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <AppQueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
