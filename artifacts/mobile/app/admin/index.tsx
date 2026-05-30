import { Ionicons } from "@expo/vector-icons";
import { getGetParkingStatsQueryOptions, getGetUserStatsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
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

import { Card } from "@/components/ui/Card";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: userStats, isLoading: userLoading } = useQuery(getGetUserStatsQueryOptions());
  const { data: parkingStats, isLoading: parkingLoading } = useQuery(getGetParkingStatsQueryOptions());

  if (userLoading || parkingLoading) return <LoadingScreen />;

  const statCards = [
    { label: "Total Users", value: userStats?.total || 0, icon: "people", color: "#3B82F6" },
    { label: "Active Users", value: userStats?.active || 0, icon: "person-add", color: "#10B981" },
    { label: "Parking Lots", value: parkingStats?.total || 0, icon: "car", color: "#F59E0B" },
    { label: "Free Lots", value: parkingStats?.free || 0, icon: "leaf", color: "#22C55E" },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.grid}>
        {statCards.map((stat, i) => (
          <Card key={i} style={styles.statCard as any}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color + "20" }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.actions}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        
        <TouchableOpacity onPress={() => router.push("/admin/users")} style={styles.actionItem}>
          <Card>
            <View style={styles.actionContent}>
              <View style={styles.actionInfo}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Manage Users</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/parking")} style={styles.actionItem}>
          <Card>
            <View style={styles.actionContent}>
              <View style={styles.actionInfo}>
                <Ionicons name="map-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Manage Parking Lots</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/notifications")} style={styles.actionItem}>
          <Card>
            <View style={styles.actionContent}>
              <View style={styles.actionInfo}>
                <Ionicons name="send-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Send Global Notification</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    marginBottom: 16,
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  actionItem: {
    marginBottom: 4,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
