import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { getGetUnreadNotificationCountQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

function UnreadBadge({ color: _color }: { color: string }) {
  const { data } = useQuery(getGetUnreadNotificationCountQueryOptions());
  const count = data?.count ?? 0;
  if (!count) return null;
  return (
    <View style={[styles.badge, { position: "absolute", top: -4, right: -8 }]}>
      <View style={styles.badgeDot} />
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="map">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Map</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="vehicles">
        <Icon sf={{ default: "car", selected: "car.fill" }} />
        <Label>Vehicles</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Alerts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 64 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "map.fill" : "map"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "map" : "map-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "car.fill" : "car"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "car" : "car-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "bell.fill" : "bell"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function MainTabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  badge: {},
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
});
