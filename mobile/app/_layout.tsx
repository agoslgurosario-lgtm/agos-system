import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPush, isPushEnabled } from '../lib/pushNotifications';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { ClogEventProvider } from '../lib/ClogEventContext';
import { AlertsProvider } from '../lib/AlertsContext';

import "../global.css";

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === 'login' ||
      segments[0] === 'change-password' ||
      segments[0] === 'privacy-consent' ||
      segments[0] === 'forgot-password';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && !user.privacy_agreed_at && segments[0] !== 'privacy-consent') {
      router.replace('/privacy-consent');
    } else if ( user && user.privacy_agreed_at && user.must_change_password && segments[0] !== 'change-password') {
      router.replace('/change-password');
    } else if (user && user.privacy_agreed_at && !user.must_change_password && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  // register this phone for push once the user is fully logged in
  useEffect(() => {
    if (!user || !user.privacy_agreed_at || user.must_change_password) return;
    isPushEnabled(user.user_id).then((enabled) => {
      if (enabled) registerForPush();
    });
  }, [user?.user_id, user?.privacy_agreed_at, user?.must_change_password]);

  // tapping a notification (works from closed, background and foreground)
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !user || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledRef.current === id) return; // handle each tap once
    handledRef.current = id;

    const alertId = lastResponse.notification.request.content.data?.alert_id;
    if (alertId) {
      router.push({ pathname: '/(tabs)/alerts', params: { alertId: String(alertId) } });
    }
  }, [lastResponse, isLoading, user?.user_id]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-consent" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="clog-details" options={{ headerShown: false }} />
      <Stack.Screen name="user-manual" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <AlertsProvider>
        <ClogEventProvider>
          <ThemeProvider value={DefaultTheme}>
            <AuthGate />
            <StatusBar style="dark" />
          </ThemeProvider>
        </ClogEventProvider>
      </AlertsProvider>
    </AuthProvider>
  );
}