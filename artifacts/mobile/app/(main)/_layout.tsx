import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Bell, Car, Map, UserCircle } from "lucide-react-native";
import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { getGetUnreadNotificationCountQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

const UnreadBadge = React.memo(function UnreadBadge({ color: _color }: { color: string }) {
  const { data } = useQuery(getGetUnreadNotificationCountQueryOptions());
  const count = data?.count ?? 0;
  if (!count) return null;
  return (
    <View style={[styles.badge, { position: "absolute", top: -6, right: -10 }]}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
});

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

  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
    headerShown: false,
    tabBarStyle: {
      position: "absolute" as const,
      backgroundColor: isIOS ? "transparent" : colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 0,
      ...(Platform.OS === "web" ? { height: 64 } : {}),
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
  }), [colors, isIOS, isDark]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ focused, color }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "map.fill" : "map"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Map
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ focused, color }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "car.fill" : "car"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Car
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused, color }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "bell.fill" : "bell"}
                tintColor={color}
                size={24}
              />
            ) : (
              <View>
                <Bell
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
                <UnreadBadge color={color} />
              </View>
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "person.fill" : "person"}
                tintColor={color}
                size={24}
              />
            ) : (
              <UserCircle
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
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
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
});
