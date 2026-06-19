import { getGetParkingStatsQueryOptions, getGetUserStatsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: userStats, isLoading: userLoading } = useQuery(getGetUserStatsQueryOptions());
  const { data: parkingStats, isLoading: parkingLoading } = useQuery(getGetParkingStatsQueryOptions());

  if (userLoading || parkingLoading) return <LoadingScreen />;

  const statCards = [
    {
      label: "Total Users",
      value: userStats?.total || 0,
      emoji: "👥",
      color: "#3B82F6",
      bg: "#EFF6FF",
      route: "/admin/users",
    },
    {
      label: "Active Users",
      value: userStats?.active || 0,
      emoji: "✅",
      color: "#10B981",
      bg: "#ECFDF5",
      route: "/admin/users",
    },
    {
      label: "Parking Lots",
      value: parkingStats?.total || 0,
      emoji: "🚗",
      color: "#F59E0B",
      bg: "#FFFBEB",
      route: "/admin/parking",
    },
    {
      label: "Free Lots",
      value: parkingStats?.free || 0,
      emoji: "🌿",
      color: "#22C55E",
      bg: "#F0FDF4",
      route: "/admin/parking",
    },
  ];

  const actions = [
    {
      emoji: "👥",
      color: "#3B82F6",
      bg: "#EFF6FF",
      title: "Manage Users",
      subtitle: "View, search and manage all users",
      route: "/admin/users",
    },
    {
      emoji: "🅿️",
      color: "#F59E0B",
      bg: "#FFFBEB",
      title: "Manage Parking Lots",
      subtitle: "Add, edit and remove parking locations",
      route: "/admin/parking",
    },
    {
      emoji: "📢",
      color: "#8B5CF6",
      bg: "#F5F3FF",
      title: "Send Notification",
      subtitle: "Broadcast a message to all users",
      route: "/admin/notifications",
    },
    {
      emoji: "📣",
      color: "#0E4BF1",
      bg: "#EEF1FD",
      title: "Announcements",
      subtitle: "Pin city-wide messages in all users' alerts",
      route: "/admin/broadcasts",
    },
    {
      emoji: "⚠️",
      color: "#F59E0B",
      bg: "#FFFBEB",
      title: "Event Warnings",
      subtitle: "Alert users about road works, fairs, zone closures",
      route: "/admin/events",
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header banner */}
      <LinearGradient
        colors={["#0E4BF1", "#3B6BF5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerLabel}>ADMIN DASHBOARD</Text>
        <Text style={styles.headerTitle}>Welcome back,</Text>
        <Text style={styles.headerName}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.headerSub}>Here's what's happening with ParkEase today.</Text>
      </LinearGradient>

      {/* Stat cards grid */}
      <View style={styles.gridWrapper}>
        <View style={styles.grid}>
          {statCards.map((stat, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(stat.route as any)}
              activeOpacity={0.8}
              style={styles.statCardOuter}
            >
              <View style={[styles.statCard, { backgroundColor: stat.bg, borderColor: stat.color + "30" }]}>
                <View style={[styles.statIconBg, { backgroundColor: stat.color + "20" }]}>
                  <Text style={styles.statEmoji}>{stat.emoji}</Text>
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.foreground }]}>{stat.label}</Text>
                <Text style={[styles.statArrow, { color: stat.color }]}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.actionList}>
          {actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.actionIconBg, { backgroundColor: action.bg }]}>
                  <Text style={styles.actionEmoji}>{action.emoji}</Text>
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.foreground }]}>{action.title}</Text>
                  <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{action.subtitle}</Text>
                </View>
                <View style={[styles.chevronBg, { backgroundColor: action.color + "15" }]}>
                  <Text style={[styles.chevron, { color: action.color }]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "400",
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },
  gridWrapper: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCardOuter: {
    width: "47.5%",
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statEmoji: { fontSize: 22 },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  statArrow: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  actionList: { gap: 10 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEmoji: { fontSize: 24 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  actionSub: { fontSize: 12, lineHeight: 16 },
  chevronBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: { fontSize: 20, fontWeight: "700" },
});
