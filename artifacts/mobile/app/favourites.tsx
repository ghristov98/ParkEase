import AsyncStorage from "@react-native-async-storage/async-storage";
import { getGetParkingLotsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronLeft, Heart, Map, MapPin } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useColors } from "@/hooks/useColors";

const FAVOURITES_KEY = "parkease_favourites";

export default function FavouritesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [storageLoaded, setStorageLoaded] = useState(false);

  const { data: allLots, isLoading: lotsLoading, refetch } = useQuery(getGetParkingLotsQueryOptions());

  useEffect(() => {
    AsyncStorage.getItem(FAVOURITES_KEY)
      .then((raw) => {
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          setFavouriteIds(new Set(ids));
        }
      })
      .catch(() => {})
      .finally(() => setStorageLoaded(true));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const [raw] = await Promise.all([
      AsyncStorage.getItem(FAVOURITES_KEY).catch(() => null),
      refetch(),
    ]);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      setFavouriteIds(new Set(ids));
    }
    setIsRefreshing(false);
  }, [refetch]);

  const favouriteLots = useMemo(
    () => (allLots ?? []).filter((lot) => favouriteIds.has(lot.id)),
    [allLots, favouriteIds]
  );

  if ((lotsLoading || !storageLoaded) && !isRefreshing) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Favourites</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={favouriteLots}
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
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.push(`/parking/${item.id}`)}
          >
            <View style={[styles.iconWrap, { backgroundColor: "#EF444415" }]}>
              <Heart size={20} color="#EF4444" strokeWidth={2} fill="#EF4444" />
            </View>
            <View style={styles.info}>
              <Text style={[styles.lotName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.addressRow}>
                <MapPin size={12} color={colors.mutedForeground} strokeWidth={2} />
                <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </View>
            <Badge
              label={item.type}
              variant={item.type === "free" ? "free" : "paid"}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Heart size={72} color={colors.mutedForeground} strokeWidth={1} style={{ opacity: 0.25, marginBottom: 20 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No favourite spots saved yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap the heart icon on any parking lot to save it here for quick access.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={() => router.push("/(main)/map")}
            >
              <Map size={16} color="white" strokeWidth={2.5} />
              <Text style={styles.ctaBtnText}>Explore Map</Text>
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
  title: { fontSize: 18, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
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
  lotName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 13, flex: 1 },
  empty: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, textAlign: "center" },
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
