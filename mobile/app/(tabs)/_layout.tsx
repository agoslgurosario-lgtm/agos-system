import { Tabs } from 'expo-router';
import React, { useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Platform } from 'react-native';

import ProfileSheet from '@/components/profile/ProfileSheet';

export default function TabLayout() {
  const [profileVisible, setProfileVisible] = useState(false)

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#122A48',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: {
            backgroundColor: '#FFFAFA',
            borderTopWidth: 0,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Map',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="map" color={color} />,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            href: null, // not visible in the bottom tab bar
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={color} />,
          }}
        />
        <Tabs.Screen
          name="readings"
          options={{
            title: 'Readings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="waveform.path.ecg" color={color} />,
          }}
        />
        <Tabs.Screen
          name="clogs"
          options={{
            title: 'Clog Events',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="water-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="document.on.document" color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle" color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setProfileVisible(true)
            },
          }}
        />
      </Tabs>
      
      <ProfileSheet visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </>
  );
}