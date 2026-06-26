import { getGetVehiclesQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Car, ChevronRight, MapPin, Plus, PlusCircle } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: vehicles, isLoading, refetch } = useQuery(getGetVehiclesQueryOptions());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

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
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/vehicle/${item.id}`)}>
            <Card style={styles.vehicleCard}>
              <View style={styles.vehicleInfo}>
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.photo} />
                  ) : (
                    <Car size={28} color={colors.mutedForeground} strokeWidth={1.5} />
                  )}
                </View>
                <View style={styles.details}>
                  <Text style={[styles.vehicleName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.licensePlate, { color: colors.primary }]}>{item.licensePlate}</Text>
                  <Text style={[styles.vehicleModel, { color: colors.mutedForeground }]}>
                    {item.brand} {item.model} • {item.year}
                  </Text>
                  {(item as any).latitude != null && (
                    <View style={[styles.locationBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                      <MapPin size={10} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.locationBadgeText, { color: colors.primary }]}>Location pinned</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} strokeWidth={2} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Car size={72} color={colors.mutedForeground} strokeWidth={1} style={{ opacity: 0.25, marginBottom: 20 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>You haven't added a vehicle yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add your first vehicle to start tracking and managing it.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              onPress={() => router.push("/vehicle/add")}
            >
              <Plus size={18} color="white" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </Pressable>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: 100 + insets.bottom,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
        onPress={() => router.push("/vehicle/add")}
      >
        <PlusCircle size={28} color="white" strokeWidth={2} />
      </Pressable>
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
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 24,
    gap: 8,
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
