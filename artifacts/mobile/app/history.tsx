import { getGetVehiclesQueryOptions, getGetVehicleHistoryQueryOptions } from "@workspace/api-client-react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronLeft, Clock, MapPin } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useColors } from "@/hooks/useColors";

interface HistoryItem {
  id: string;
  vehicleName: string;
  vehiclePlate: string;
  lotName: string;
  createdAt: string;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery(getGetVehiclesQueryOptions());

  const historyQueries = useQueries({
    queries: (vehicles ?? []).map((v) => ({
      ...getGetVehicleHistoryQueryOptions(v.id),
      select: (data: any[]) =>
        (data ?? []).map((item: any) => ({
          id: item.id,
          vehicleName: v.name,
          vehiclePlate: v.licensePlate,
          lotName: item.parkingLot?.name ?? "Unknown Lot",
          createdAt: item.createdAt,
        })),
    })),
  });

  const allHistory = useMemo<HistoryItem[]>(() => {
    const flat = historyQueries.flatMap((q) => (q.data as HistoryItem[] | undefined) ?? []);
    return flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [historyQueries]);

  const isLoading = vehiclesLoading || historyQueries.some((q) => q.isLoading);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchVehicles();
    await Promise.all(historyQueries.map((q) => q.refetch()));
    setIsRefreshing(false);
  }, [refetchVehicles, historyQueries]);

  if (isLoading && !isRefreshing) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Parking History</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={allHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Clock size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.lotName, { color: colors.foreground }]} numberOfLines={1}>
                🅿️ {item.lotName}
              </Text>
              <Text style={[styles.vehicle, { color: colors.primary }]}>
                {item.vehicleName} · {item.vehiclePlate}
              </Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clock size={72} color={colors.mutedForeground} strokeWidth={1} style={{ opacity: 0.25, marginBottom: 20 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No parking history yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start your first session to see your parking history here.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={() => router.push("/(main)/map")}
            >
              <MapPin size={16} color="white" strokeWidth={2.5} />
              <Text style={styles.ctaBtnText}>Go to Map</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1 },
  lotName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  vehicle: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  date: { fontSize: 12 },
  empty: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  ctaBtnText: { color: "white", fontSize: 16, fontWeight: "600" },
});
