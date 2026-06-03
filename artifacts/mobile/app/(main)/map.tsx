import {
  getGetParkingLotsQueryOptions,
  useCreateParkingLot,
  useDeleteParkingLot,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const INITIAL_REGION = {
  latitude: 42.7339,
  longitude: 25.4858,
  latitudeDelta: 5.0,
  longitudeDelta: 5.0,
};

const NEARBY_THRESHOLD_M = 300;

function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const [region, setRegion] = useState(INITIAL_REGION);
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addForm, setAddForm] = useState({ name: "", type: "free" as "free" | "paid" });
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { user } = useAuth();
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
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          } catch {
            // Location hardware unavailable — keep default region
          }
        }
      } catch {
        // Permission API unavailable — keep default region
      }
    })();
  }, []);

  const nearbyLot = longPressCoord
    ? (parkingLots ?? []).find(
        (lot) =>
          getDistanceMeters(
            longPressCoord.latitude,
            longPressCoord.longitude,
            lot.latitude,
            lot.longitude
          ) <= NEARBY_THRESHOLD_M
      ) ?? null
    : null;

  const handleLongPress = (e: any) => {
    if (user?.role !== "superadmin") return;
    const coord = e.nativeEvent.coordinate;
    setLongPressCoord(coord);
    setAddForm({ name: "", type: "free" });
    setSelectedLot(null);
  };

  const handleAddPark = async () => {
    if (!addForm.name.trim() || !longPressCoord) return;
    setIsSaving(true);
    try {
      await createMutation.mutateAsync({
        data: {
          name: addForm.name.trim(),
          address: `${longPressCoord.latitude.toFixed(5)}, ${longPressCoord.longitude.toFixed(5)}`,
          latitude: longPressCoord.latitude,
          longitude: longPressCoord.longitude,
          type: addForm.type,
          description: "",
        },
      });
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
    Alert.alert(
      "Remove Parking Lot",
      `Remove "${nearbyLot.name}" from the map?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
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
      ]
    );
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.webHeader}>
          <Text style={[styles.webTitle, { color: colors.foreground }]}>Parking Lots</Text>
          <Input
            placeholder="Search parking lots..."
            value={search}
            onChangeText={setSearch}
            leftIconText="🔍"
          />
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
                <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>
                  {item.address}
                </Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.mutedForeground }}>No parking lots found</Text>
            </View>
          }
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
        {parkingLots?.map((lot) => (
          <Marker
            key={lot.id}
            coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
            onPress={() => { setSelectedLot(lot); setLongPressCoord(null); }}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: lot.type === "free" ? colors.parkingFree : colors.parkingPaid },
              ]}
            >
              <Text style={styles.markerEmoji}>🚗</Text>
            </View>
          </Marker>
        ))}

        {longPressCoord && (
          <Marker coordinate={longPressCoord} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.pinContainer}>
              <Text style={styles.pinEmoji}>📍</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={[styles.floatingSearch, { top: insets.top + 10 }]}>
        <Input
          placeholder="Search locations..."
          value={search}
          onChangeText={setSearch}
          leftIconText="🔍"
          style={styles.searchInput}
        />
      </View>

      <Card style={{ ...styles.legend, top: insets.top + 80 }}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.parkingFree }]} />
          <Text style={styles.legendText}>Free</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.parkingPaid }]} />
          <Text style={styles.legendText}>Paid</Text>
        </View>
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
              <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>
                {selectedLot.address}
              </Text>
              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/parking/${selectedLot.id}`)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Text style={styles.arrowEmoji}>→</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {user?.role === "superadmin" && (
        <TouchableOpacity
          style={[styles.adminFab, { bottom: 100 + insets.bottom, backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin")}
        >
          <Text style={styles.fabEmoji}>⚙️</Text>
        </TouchableOpacity>
      )}

      {/* Long-press bubble modal — superadmin only */}
      <Modal
        visible={!!longPressCoord}
        transparent
        animationType="slide"
        onRequestClose={() => setLongPressCoord(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLongPressCoord(null)}
        />
        <View style={[styles.bubble, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bubbleHandle} />

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

          {/* Add form */}
          <View style={styles.bubbleForm}>
            <Input
              label="Parking Lot Name"
              placeholder="e.g. City Center Parking"
              value={addForm.name}
              onChangeText={(t) => setAddForm({ ...addForm, name: t })}
            />
            <Text style={[styles.typeLabel, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { borderColor: colors.border },
                  addForm.type === "free" && { backgroundColor: colors.parkingFree, borderColor: colors.parkingFree },
                ]}
                onPress={() => setAddForm({ ...addForm, type: "free" })}
              >
                <Text style={[styles.typeBtnText, addForm.type === "free" && { color: "white" }]}>
                  🟢 Free
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { borderColor: colors.border },
                  addForm.type === "paid" && { backgroundColor: colors.parkingPaid, borderColor: colors.parkingPaid },
                ]}
                onPress={() => setAddForm({ ...addForm, type: "paid" })}
              >
                <Text style={[styles.typeBtnText, addForm.type === "paid" && { color: "white" }]}>
                  🟠 Paid
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary },
                (!addForm.name.trim() || isSaving) && { opacity: 0.5 },
              ]}
              onPress={handleAddPark}
              disabled={!addForm.name.trim() || isSaving}
            >
              <Text style={styles.saveBtnText}>{isSaving ? "Adding…" : "➕ Add Parking Lot"}</Text>
            </TouchableOpacity>
          </View>

          {/* Remove section — only if a nearby lot exists */}
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
                  {isRemoving ? "Removing…" : `🗑️ Remove "${nearbyLot.name}"`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pinContainer: { alignItems: "center" },
  pinEmoji: { fontSize: 32 },
  floatingSearch: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInput: { backgroundColor: "white", height: 50 },
  legend: {
    position: "absolute",
    right: 16,
    width: 80,
    zIndex: 10,
    padding: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: "500" },
  bottomSheet: { position: "absolute", left: 16, right: 16, zIndex: 20 },
  closeButton: { position: "absolute", right: 12, top: 12, zIndex: 30 },
  lotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  lotName: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
  lotAddress: { fontSize: 14, marginBottom: 16 },
  detailsButton: {
    flexDirection: "row",
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  markerEmoji: { fontSize: 14 },
  closeEmoji: { fontSize: 18, fontWeight: "600" },
  arrowEmoji: { fontSize: 16, color: "white", fontWeight: "600" },
  fabEmoji: { fontSize: 22 },
  adminFab: {
    position: "absolute",
    right: 16,
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
  webHeader: { padding: 16, gap: 16 },
  webTitle: { fontSize: 24, fontWeight: "700" },
  webList: { padding: 16, gap: 12 },
  lotCard: { marginBottom: 4 },
  empty: { padding: 40, alignItems: "center" },
  // Modal / bubble
  modalBackdrop: {
    flex: 1,
  },
  bubble: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  bubbleHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  bubblePin: { fontSize: 28 },
  bubbleTitle: { fontSize: 17, fontWeight: "700" },
  bubbleCoords: { fontSize: 12, marginTop: 2 },
  bubbleForm: { paddingHorizontal: 20, gap: 12 },
  typeLabel: { fontSize: 13, fontWeight: "500", marginBottom: -4 },
  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnText: { fontWeight: "600", fontSize: 15 },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  removeSection: {
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  removeLabel: { fontSize: 13 },
  removeBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: { fontWeight: "700", fontSize: 15 },
});
