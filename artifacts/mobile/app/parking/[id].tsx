import { getGetParkingLotByIdQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
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

export default function ParkingLotDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lot, isLoading } = useQuery(getGetParkingLotByIdQueryOptions(id!));
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (isLoading) return <LoadingScreen />;
  if (!lot) return null;

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
        <View style={styles.imageContainer}>
          {lot.photos && lot.photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {lot.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
              <Text style={styles.imageEmoji}>🖼️</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backEmoji}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
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
          </View>

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
                      {
                        backgroundColor:
                          lot.type === "free" ? colors.parkingFree : colors.parkingPaid,
                      },
                    ]}
                  />
                </Marker>
              </MapView>
            ) : (
              <View style={[styles.miniMap, { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.mutedForeground }}>Map view not available on web</Text>
              </View>
            )}
            <TouchableOpacity style={styles.mapOverlay} onPress={openInMaps} />
          </View>

          {lot.extras && lot.extras.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {lot.description || "No description available for this parking lot."}
            </Text>
          </View>

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
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    width: "100%",
    position: "relative",
  },
  photo: {
    width: 400, // Should be screen width, but relative is hard in static
    height: 300,
  },
  imageEmoji: {
    fontSize: 56,
  },
  backEmoji: {
    fontSize: 22,
    color: "white",
    fontWeight: "600",
  },
  locationEmoji: {
    fontSize: 14,
  },
  extraEmoji: {
    fontSize: 14,
  },
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
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    marginTop: -20,
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  extrasList: {
    gap: 8,
  },
  extraChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  extraText: {
    fontSize: 14,
    fontWeight: "500",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  directionsButton: {
    marginTop: 8,
  },
});
