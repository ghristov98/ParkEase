import {
  getGetParkingLotsQueryOptions,
  useCreateParkingLot,
  useDeleteParkingLot,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MapView, Marker, Polygon } from "@/components/NativeMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkZone, getZonePolygons, getParkingMachines, getMapCenter, ZoneResult, ZonePolygon } from "@/services/ZoneService";
import LocationWatcher from "@/services/LocationWatcher";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const MAP_CENTER = getMapCenter();

const INITIAL_REGION = {
  latitude: MAP_CENTER.lat,
  longitude: MAP_CENTER.lng,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const NEARBY_THRESHOLD_M = 300;

const BASE_URL = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");

const AMENITIES = [
  { key: "hasSecurityGuard", label: "Security Guard", emoji: "💂" },
  { key: "hasCCTV", label: "CCTV Cameras", emoji: "📷" },
  { key: "hasLighting", label: "Lighting", emoji: "💡" },
  { key: "isCovered", label: "Covered", emoji: "🏠" },
  { key: "hasEVCharging", label: "EV Charging", emoji: "⚡" },
  { key: "hasDisabledAccess", label: "Disabled Access", emoji: "♿" },
] as const;

type AmenityKey = typeof AMENITIES[number]["key"];

interface AddForm {
  name: string;
  type: "free" | "paid";
  openingHours: string;
  amenities: Record<AmenityKey, boolean>;
  photos: string[];
  mainPhotoIndex: number;
}

const DEFAULT_FORM: AddForm = {
  name: "",
  type: "free",
  openingHours: "",
  amenities: {
    hasSecurityGuard: false,
    hasCCTV: false,
    hasLighting: false,
    isCovered: false,
    hasEVCharging: false,
    hasDisabledAccess: false,
  },
  photos: [],
  mainPhotoIndex: 0,
};

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ZONE_POLYGONS = getZonePolygons();
const PARKING_MACHINES = getParkingMachines();

export default function MapScreen() {
  const [region, setRegion] = useState(INITIAL_REGION);
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [zoneResult, setZoneResult] = useState<ZoneResult>({ zone: null });
  const [showZones, setShowZones] = useState(true);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const { user, accessToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createMutation = useCreateParkingLot();
  const deleteMutation = useDeleteParkingLot();

  const { data: parkingLots } = useQuery(
    getGetParkingLotsQueryOptions({ search: search || undefined })
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted");
        if (status === "granted") {
          try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
            const initial = checkZone(location.coords.latitude, location.coords.longitude);
            setZoneResult(initial);
          } catch { /* keep default */ }
        }
      } catch { /* keep default */ }
    })();
  }, []);

  // Subscribe to live GPS zone updates
  useEffect(() => {
    if (Platform.OS === "web") return;
    const watcher = LocationWatcher.getInstance();
    const unsub = watcher.subscribe((result) => {
      setZoneResult(result);
    });
    watcher.start();
    return () => {
      unsub();
    };
  }, []);

  // Animate zone banner in/out when zone changes
  useEffect(() => {
    Animated.spring(bannerAnim, {
      toValue: zoneResult.zone ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [zoneResult.zone]);

  const nearbyLot = longPressCoord
    ? (parkingLots ?? []).find(
        (lot) => getDistanceMeters(longPressCoord.latitude, longPressCoord.longitude, lot.latitude, lot.longitude) <= NEARBY_THRESHOLD_M
      ) ?? null
    : null;

  const handleLongPress = (e: any) => {
    if (user?.role !== "superadmin") return;
    setLongPressCoord(e.nativeEvent.coordinate);
    setAddForm(DEFAULT_FORM);
    setSelectedLot(null);
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setAddForm((f) => ({ ...f, photos: [...f.photos, ...uris] }));
    }
  };

  const uploadPhoto = async (lotId: string, uri: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("photo", { uri, name: "photo.jpg", type: "image/jpeg" } as any);
    try {
      const resp = await fetch(`${BASE_URL}/api/parking/${lotId}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.url as string;
    } catch {
      return null;
    }
  };

  const handleAddPark = async () => {
    if (!addForm.name.trim() || !longPressCoord) return;
    setIsSaving(true);
    try {
      const lot = await createMutation.mutateAsync({
        data: {
          name: addForm.name.trim(),
          address: `${longPressCoord.latitude.toFixed(5)}, ${longPressCoord.longitude.toFixed(5)}`,
          latitude: longPressCoord.latitude,
          longitude: longPressCoord.longitude,
          type: addForm.type,
          description: addForm.openingHours ? `Hours: ${addForm.openingHours}` : "",
          ...addForm.amenities,
          openingHours: addForm.openingHours || undefined,
        } as any,
      });

      // Upload photos sequentially
      if (addForm.photos.length > 0) {
        for (const uri of addForm.photos) {
          await uploadPhoto(lot.id, uri);
        }
        // If main photo is not the first uploaded, update it
        if (addForm.mainPhotoIndex !== 0) {
          await fetch(`${BASE_URL}/api/parking/${lot.id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ mainPhotoIndex: addForm.mainPhotoIndex }),
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["getParkingLots"] });
      setLongPressCoord(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add parking lot");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePark = () => {
    if (!nearbyLot) return;
    Alert.alert("Remove Parking Lot", `Remove "${nearbyLot.name}" from the map?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          setIsRemoving(true);
          try {
            await deleteMutation.mutateAsync({ id: nearbyLot.id });
            await queryClient.invalidateQueries({ queryKey: ["getParkingLots"] });
            setLongPressCoord(null);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to remove");
          } finally {
            setIsRemoving(false);
          }
        },
      },
    ]);
  };

  const toggleAmenity = (key: AmenityKey) => {
    setAddForm((f) => ({ ...f, amenities: { ...f.amenities, [key]: !f.amenities[key] } }));
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.webHeader}>
          <Text style={[styles.webTitle, { color: colors.foreground }]}>Parking Lots</Text>
          <Input placeholder="Search parking lots..." value={search} onChangeText={setSearch} leftIconText="🔍" />
        </View>
        <FlatList
          data={parkingLots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.webList}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/parking/${item.id}`)}>
              <Card style={styles.lotCard}>
                <View style={styles.lotHeader}>
                  <Text style={[styles.lotName, { color: colors.foreground }]}>{item.name}</Text>
                  <Badge label={item.type} variant={item.type === "free" ? "free" : "paid"} />
                </View>
                <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>{item.address}</Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={{ color: colors.mutedForeground }}>No parking lots found</Text></View>}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!locationPermission}
        onLongPress={handleLongPress}
      >
        {/* Zone polygons */}
        {showZones && ZONE_POLYGONS.map((z: ZonePolygon) => {
          const fillColor = z.type === "blue"
            ? "rgba(59,107,245,0.18)"
            : "rgba(34,197,94,0.13)";
          const strokeColor = z.type === "blue"
            ? "rgba(14,75,241,0.7)"
            : "rgba(34,197,94,0.7)";
          return (
            <Polygon
              key={z.id}
              coordinates={z.coordinates}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={2}
            />
          );
        })}

        {/* Parking machine markers */}
        {showZones && PARKING_MACHINES.map((m, i) => (
          <Marker
            key={`machine-${i}`}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.machineMarker}>
              <Text style={styles.machineEmoji}>💲</Text>
            </View>
          </Marker>
        ))}

        {parkingLots?.map((lot) => {
          return (
            <Marker
              key={lot.id}
              coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
              onPress={() => { setSelectedLot(lot); setLongPressCoord(null); }}
            >
              <View style={[styles.marker, { backgroundColor: lot.type === "free" ? colors.parkingFree : colors.parkingPaid }]}>
                <Text style={styles.markerEmoji}>🅿️</Text>
              </View>
            </Marker>
          );
        })}
        {longPressCoord && (
          <Marker coordinate={longPressCoord} anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.pinEmoji}>📍</Text>
          </Marker>
        )}
      </MapView>

      <View style={[styles.floatingSearch, { top: insets.top + 10 }]}>
        <Input placeholder="Search locations..." value={search} onChangeText={setSearch} leftIconText="🔍" style={styles.searchInput} />
      </View>

      {/* Zone banner — slides in when user is in a zone */}
      <Animated.View
        style={[
          styles.zoneBanner,
          { top: insets.top + 68 },
          {
            opacity: bannerAnim,
            transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
          },
          zoneResult.zone === "blue"
            ? styles.zoneBannerBlue
            : styles.zoneBannerGreen,
        ]}
        pointerEvents="none"
      >
        <Text style={styles.zoneBannerEmoji}>
          {zoneResult.zone === "blue" ? "🔵" : "🟢"}
        </Text>
        <View>
          <Text style={styles.zoneBannerTitle}>
            {zoneResult.zone === "blue"
              ? "You are in the Blue Zone"
              : "You are in the Green Zone"}
          </Text>
          <Text style={styles.zoneBannerSub}>
            {zoneResult.smsCode
              ? `SMS to ${zoneResult.smsCode} · ${zoneResult.hourlyRate?.toFixed(2)} BGN/hr`
              : "Paid parking applies"}
          </Text>
        </View>
      </Animated.View>

      <Card style={{ ...styles.legend, top: insets.top + 80 }}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.parkingFree }]} /><Text style={styles.legendText}>Free</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.parkingPaid }]} /><Text style={styles.legendText}>Paid</Text></View>
        <View style={[styles.legendDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity onPress={() => setShowZones((v) => !v)} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B6BF5", opacity: showZones ? 1 : 0.3 }]} />
          <Text style={[styles.legendText, { opacity: showZones ? 1 : 0.5 }]}>Zones</Text>
        </TouchableOpacity>
      </Card>

      {selectedLot && !longPressCoord && (
        <View style={[styles.bottomSheet, { bottom: 100 + insets.bottom }]}>
          <Card padding={false}>
            <TouchableOpacity onPress={() => setSelectedLot(null)} style={styles.closeButton}>
              <Text style={[styles.closeEmoji, { color: colors.mutedForeground }]}>✕</Text>
            </TouchableOpacity>
            <View style={{ padding: 16 }}>
              <View style={styles.lotHeader}>
                <Text style={[styles.lotName, { color: colors.foreground }]}>{selectedLot.name}</Text>
                <Badge label={selectedLot.type} variant={selectedLot.type === "free" ? "free" : "paid"} />
              </View>
              <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>{selectedLot.address}</Text>
              <TouchableOpacity style={[styles.detailsButton, { backgroundColor: colors.primary }]} onPress={() => router.push(`/parking/${selectedLot.id}`)}>
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Text style={styles.arrowEmoji}>→</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {user?.role === "superadmin" && (
        <TouchableOpacity style={[styles.adminFab, { bottom: 100 + insets.bottom, backgroundColor: colors.primary }]} onPress={() => router.push("/admin")}>
          <Text style={styles.fabEmoji}>⚙️</Text>
        </TouchableOpacity>
      )}

      {/* Long-press bubble — superadmin only */}
      <Modal visible={!!longPressCoord} transparent animationType="slide" onRequestClose={() => setLongPressCoord(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setLongPressCoord(null)} />
        <View style={[styles.bubble, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bubbleHandle} />

          {/* Header */}
          <View style={styles.bubbleHeader}>
            <Text style={styles.bubblePin}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bubbleTitle, { color: colors.foreground }]}>
                {nearbyLot ? "Parking lot nearby" : "Add Parking Lot"}
              </Text>
              {longPressCoord && (
                <Text style={[styles.bubbleCoords, { color: colors.mutedForeground }]}>
                  {longPressCoord.latitude.toFixed(4)}, {longPressCoord.longitude.toFixed(4)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setLongPressCoord(null)}>
              <Text style={[styles.closeEmoji, { color: colors.mutedForeground }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            {/* Name + Type */}
            <View style={styles.section}>
              <Input
                label="Parking Lot Name"
                placeholder="e.g. City Center Parking"
                value={addForm.name}
                onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.typeRow}>
                {(["free", "paid"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, { borderColor: colors.border }, addForm.type === t && { backgroundColor: t === "free" ? colors.parkingFree : colors.parkingPaid, borderColor: "transparent" }]}
                    onPress={() => setAddForm((f) => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeBtnText, { color: addForm.type === t ? "white" : colors.foreground }]}>
                      {t === "free" ? "🟢 Free" : "🟠 Paid"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Working Hours */}
            <View style={styles.section}>
              <Input
                label="⏰  Opening Hours"
                placeholder="e.g. Mon–Fri 08:00–20:00, Sat–Sun 09:00–18:00"
                value={addForm.openingHours}
                onChangeText={(t) => setAddForm((f) => ({ ...f, openingHours: t }))}
              />
            </View>

            {/* Photos */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>📸  Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {addForm.photos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setAddForm((f) => ({ ...f, mainPhotoIndex: i }))}
                    style={styles.photoThumbWrap}
                  >
                    <Image source={{ uri }} style={[styles.photoThumb, addForm.mainPhotoIndex === i && styles.photoThumbMain]} />
                    {addForm.mainPhotoIndex === i && (
                      <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>MAIN</Text></View>
                    )}
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => setAddForm((f) => {
                        const photos = f.photos.filter((_, j) => j !== i);
                        return { ...f, photos, mainPhotoIndex: Math.min(f.mainPhotoIndex, Math.max(0, photos.length - 1)) };
                      })}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.muted }]} onPress={pickPhotos}>
                  <Text style={styles.addPhotoBtnText}>➕</Text>
                  <Text style={[styles.addPhotoBtnLabel, { color: colors.mutedForeground }]}>Add Photo</Text>
                </TouchableOpacity>
              </ScrollView>
              {addForm.photos.length > 1 && (
                <Text style={[styles.mainPhotoHint, { color: colors.mutedForeground }]}>
                  Tap a photo to set it as the main map marker image
                </Text>
              )}
            </View>

            {/* Amenities */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🏷️  Amenities</Text>
              <View style={styles.amenityGrid}>
                {AMENITIES.map(({ key, label, emoji }) => {
                  const active = addForm.amenities[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleAmenity(key)}
                      style={[
                        styles.amenityChip,
                        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : colors.muted },
                      ]}
                    >
                      <Text style={styles.amenityEmoji}>{emoji}</Text>
                      <Text style={[styles.amenityLabel, { color: active ? colors.primary : colors.foreground }]}>{label}</Text>
                      {active && <Text style={[styles.amenityCheck, { color: colors.primary }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save button */}
            <View style={[styles.section, { paddingBottom: 4 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, (!addForm.name.trim() || isSaving) && { opacity: 0.5 }]}
                onPress={handleAddPark}
                disabled={!addForm.name.trim() || isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? "Adding…" : "➕  Add Parking Lot"}</Text>
              </TouchableOpacity>
            </View>

            {/* Remove nearby lot */}
            {nearbyLot && (
              <View style={[styles.removeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.removeLabel, { color: colors.mutedForeground }]}>
                  Nearby: <Text style={{ fontWeight: "700", color: colors.foreground }}>{nearbyLot.name}</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.removeBtn, { borderColor: colors.destructive }, isRemoving && { opacity: 0.5 }]}
                  onPress={handleRemovePark}
                  disabled={isRemoving}
                >
                  <Text style={[styles.removeBtnText, { color: colors.destructive }]}>
                    {isRemoving ? "Removing…" : `🗑️  Remove "${nearbyLot.name}"`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  markerPhoto: { width: 36, height: 36, borderRadius: 18 },
  markerEmoji: { fontSize: 16 },
  machineMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF9800",
  },
  machineEmoji: { fontSize: 13 },
  pinEmoji: { fontSize: 32 },
  floatingSearch: { position: "absolute", left: 16, right: 16, zIndex: 10 },
  searchInput: { backgroundColor: "white", height: 50 },
  legend: { position: "absolute", right: 16, width: 86, zIndex: 10, padding: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: "500" },
  legendDivider: { height: 1, marginVertical: 4 },
  zoneBanner: {
    position: "absolute",
    left: 16,
    right: 100,
    zIndex: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  zoneBannerBlue: { backgroundColor: "#EEF3FF", borderWidth: 1.5, borderColor: "rgba(14,75,241,0.25)" },
  zoneBannerGreen: { backgroundColor: "#F0FFF6", borderWidth: 1.5, borderColor: "rgba(34,197,94,0.3)" },
  zoneBannerEmoji: { fontSize: 22 },
  zoneBannerTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  zoneBannerSub: { fontSize: 11, color: "#555", marginTop: 1 },
  bottomSheet: { position: "absolute", left: 16, right: 16, zIndex: 20 },
  closeButton: { position: "absolute", right: 12, top: 12, zIndex: 30 },
  lotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  lotName: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
  lotAddress: { fontSize: 14, marginBottom: 16 },
  detailsButton: { flexDirection: "row", height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 8 },
  detailsButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  closeEmoji: { fontSize: 18, fontWeight: "600" },
  arrowEmoji: { fontSize: 16, color: "white", fontWeight: "600" },
  fabEmoji: { fontSize: 22 },
  adminFab: {
    position: "absolute", right: 16, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65,
    elevation: 8, zIndex: 10,
  },
  webHeader: { padding: 16, gap: 16 },
  webTitle: { fontSize: 24, fontWeight: "700" },
  webList: { padding: 16, gap: 12 },
  lotCard: { marginBottom: 4 },
  empty: { padding: 40, alignItems: "center" },
  // Modal
  modalBackdrop: { flex: 1 },
  bubble: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
  },
  bubbleHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDD", alignSelf: "center", marginBottom: 12 },
  bubbleHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 4, gap: 12 },
  bubblePin: { fontSize: 26 },
  bubbleTitle: { fontSize: 17, fontWeight: "700" },
  bubbleCoords: { fontSize: 11, marginTop: 1 },
  section: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: -4 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  typeBtnText: { fontWeight: "600", fontSize: 15 },
  // Photos
  photoRow: { gap: 10, paddingVertical: 4 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  photoThumbMain: { borderWidth: 2.5, borderColor: "#0E4BF1" },
  mainBadge: {
    position: "absolute", bottom: 4, left: 4, backgroundColor: "#0E4BF1",
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  mainBadgeText: { color: "white", fontSize: 9, fontWeight: "700" },
  photoRemoveBtn: {
    position: "absolute", top: -6, right: -6, width: 20, height: 20,
    borderRadius: 10, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center",
  },
  photoRemoveText: { color: "white", fontSize: 10, fontWeight: "700" },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  addPhotoBtnText: { fontSize: 20 },
  addPhotoBtnLabel: { fontSize: 10, fontWeight: "600" },
  mainPhotoHint: { fontSize: 11, marginTop: -4 },
  // Amenities
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
  },
  amenityEmoji: { fontSize: 14 },
  amenityLabel: { fontSize: 12, fontWeight: "600" },
  amenityCheck: { fontSize: 12, fontWeight: "800" },
  // Save
  saveBtn: { height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  // Remove
  removeSection: {
    marginTop: 12, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  removeLabel: { fontSize: 13 },
  removeBtn: { height: 46, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  removeBtnText: { fontWeight: "700", fontSize: 15 },
});
