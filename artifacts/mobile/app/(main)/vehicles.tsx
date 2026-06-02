import { getGetVehiclesQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function VehiclesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: vehicles, isLoading, refetch } = useQuery(getGetVehiclesQueryOptions());

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Vehicles</Text>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/vehicle/${item.id}`)}>
            <Card style={styles.vehicleCard}>
              <View style={styles.vehicleInfo}>
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.photo} />
                  ) : (
                    <Text style={styles.vehicleEmoji}>🚘</Text>
                  )}
                </View>
                <View style={styles.details}>
                  <Text style={[styles.vehicleName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.licensePlate, { color: colors.primary }]}>{item.licensePlate}</Text>
                  <Text style={[styles.vehicleModel, { color: colors.mutedForeground }]}>
                    {item.brand} {item.model} • {item.year}
                  </Text>
                </View>
                <Text style={styles.chevronEmoji}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Text style={styles.emptyEmoji}>🚘</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No vehicles added</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add your first vehicle to start tracking and managing it.
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/vehicle/add")}
            >
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 100 + insets.bottom }]}
        onPress={() => router.push("/vehicle/add")}
      >
        <Text style={styles.fabEmoji}>➕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  list: {
    padding: 20,
    gap: 16,
  },
  vehicleCard: {
    marginBottom: 4,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  details: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  licensePlate: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 14,
  },
  empty: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  vehicleEmoji: {
    fontSize: 28,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  chevronEmoji: {
    fontSize: 24,
    color: "#6B7399",
  },
  fabEmoji: {
    fontSize: 22,
  },
  addButton: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },
});
