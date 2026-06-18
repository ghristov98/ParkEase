import {
  getGetParkingLotByIdQueryOptions,
  getCheckFavouriteQueryOptions,
  useAddFavourite,
  useRemoveFavourite,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MapView, Marker } from "@/components/NativeMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const SCREEN_W = Dimensions.get("window").width;

const AMENITY_MAP: Record<string, { emoji: string; label: string }> = {
  hasSecurityGuard: { emoji: "💂", label: "Security Guard" },
  hasCCTV: { emoji: "📷", label: "CCTV Cameras" },
  hasLighting: { emoji: "💡", label: "Lighting" },
  isCovered: { emoji: "🏠", label: "Covered" },
  hasEVCharging: { emoji: "⚡", label: "EV Charging" },
  hasDisabledAccess: { emoji: "♿", label: "Disabled Access" },
};

export default function ParkingLotDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lot, isLoading } = useQuery(getGetParkingLotByIdQueryOptions(id!));
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: favCheck, refetch: refetchFav } = useQuery({
    ...getCheckFavouriteQueryOptions(id!),
    enabled: !!accessToken && !!id,
    retry: 0,
  });
  const isFavourite = favCheck?.isFavourite ?? false;

  const addFav = useAddFavourite({ mutation: { onSuccess: () => { refetchFav(); queryClient.invalidateQueries({ queryKey: ['getFavourites'] }); } } });
  const removeFav = useRemoveFavourite({ mutation: { onSuccess: () => { refetchFav(); queryClient.invalidateQueries({ queryKey: ['getFavourites'] }); } } });

  const toggleFavourite = () => {
    if (!accessToken) return;
    if (isFavourite) removeFav.mutate({ lotId: id! });
    else addFav.mutate({ lotId: id! });
  };

  if (isLoading) return <LoadingScreen />;
  if (!lot) return null;

  const lotAny = lot as any;
  const mainPhotoIdx = lotAny.mainPhotoIndex ?? 0;
  const orderedPhotos = lot.photos && lot.photos.length > 0
    ? [
        lot.photos[mainPhotoIdx] ?? lot.photos[0]!,
        ...lot.photos.filter((_, i) => i !== mainPhotoIdx),
      ]
    : [];

  const activeAmenities = Object.entries(AMENITY_MAP).filter(
    ([key]) => (lotAny as any)[key] === true
  );

  const openInMaps = () => {
    const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
    const latLng = `${lot.latitude},${lot.longitude}`;
    const label = lot.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Photo carousel */}
        <View style={styles.imageContainer}>
          {orderedPhotos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {orderedPhotos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={[styles.photo, { width: SCREEN_W }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
              <Text style={styles.imageEmoji}>🅿️</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backEmoji}>←</Text>
          </TouchableOpacity>
          {orderedPhotos.length > 1 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>1 / {orderedPhotos.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Name + type badge + favourite */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{lot.name}</Text>
              <View style={styles.addressRow}>
                <Text style={styles.locationEmoji}>📍</Text>
                <Text style={[styles.address, { color: colors.mutedForeground }]}>{lot.address}</Text>
              </View>
            </View>
            <Badge
              label={lot.type}
              variant={lot.type === "free" ? "free" : "paid"}
              style={styles.badge}
            />
            {accessToken && (
              <TouchableOpacity
                onPress={toggleFavourite}
                style={[styles.favButton, { borderColor: isFavourite ? "#F59E0B" : colors.border }]}
              >
                <Text style={{ fontSize: 22 }}>{isFavourite ? "⭐" : "☆"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Opening hours */}
          {lotAny.openingHours ? (
            <Card style={styles.hoursCard}>
              <View style={styles.hoursRow}>
                <Text style={styles.clockEmoji}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>Opening Hours</Text>
                  <Text style={[styles.hoursValue, { color: colors.foreground }]}>{lotAny.openingHours}</Text>
                </View>
              </View>
            </Card>
          ) : null}

          {/* Amenities from new boolean fields */}
          {activeAmenities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
              <View style={styles.amenityGrid}>
                {activeAmenities.map(([key, { emoji, label }]) => (
                  <View
                    key={key}
                    style={[styles.amenityChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={styles.amenityEmoji}>{emoji}</Text>
                    <Text style={[styles.amenityText, { color: colors.foreground }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Legacy extras (from extras table) */}
          {lot.extras && lot.extras.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Extra Services</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extrasList}>
                {lot.extras.map((extra) => (
                  <View key={extra.id} style={[styles.extraChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.extraEmoji}>⭐</Text>
                    <Text style={[styles.extraText, { color: colors.foreground }]}>{extra.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Mini map */}
          <View style={styles.mapContainer}>
            {Platform.OS !== "web" ? (
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: lot.latitude,
                  longitude: lot.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}>
                  <View
                    style={[
                      styles.marker,
                      { backgroundColor: lot.type === "free" ? colors.parkingFree : colors.parkingPaid },
                    ]}
                  />
                </Marker>
              </MapView>
            ) : (
              <View style={[styles.miniMap, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: colors.mutedForeground }}>Map view not available on web</Text>
              </View>
            )}
            <TouchableOpacity style={styles.mapOverlay} onPress={openInMaps} />
          </View>

          {/* Description */}
          {lot.description ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{lot.description}</Text>
            </View>
          ) : null}

          <Button
            title="Get Directions"
            onPress={openInMaps}
            icon="🧭"
            fullWidth
            style={styles.directionsButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    height: 300,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  photo: {
    height: 300,
  },
  imageEmoji: { fontSize: 64 },
  backEmoji: { fontSize: 22, color: "white", fontWeight: "600" },
  locationEmoji: { fontSize: 14 },
  extraEmoji: { fontSize: 14 },
  clockEmoji: { fontSize: 22, marginRight: 12 },
  amenityEmoji: { fontSize: 16 },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCount: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  photoCountText: { color: "white", fontSize: 12, fontWeight: "600" },
  content: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  name: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 14, flex: 1 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, marginLeft: 8 },
  favButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  // Hours
  hoursCard: { marginBottom: 20 },
  hoursRow: { flexDirection: "row", alignItems: "center" },
  hoursLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  hoursValue: { fontSize: 15, fontWeight: "500" },
  // Amenities
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  amenityText: { fontSize: 13, fontWeight: "600" },
  // Extras
  extrasList: { gap: 8 },
  extraChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  extraText: { fontSize: 14, fontWeight: "500" },
  // Mini map
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
  },
  miniMap: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { ...StyleSheet.absoluteFillObject },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "white",
  },
  // Description
  description: { fontSize: 15, lineHeight: 22 },
  directionsButton: { marginTop: 8 },
});
