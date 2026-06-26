import {
  useDeleteVehicle,
  useUpdateVehicle,
  useUpdateVehicleLocation,
  getGetVehicleByIdQueryOptions,
  getGetVehicleHistoryQueryOptions,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, ChevronLeft, MapPin, Pencil, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/contexts/ToastContext";

export default function VehicleDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { showSuccess, showError, showWarning, showConfirm } = useToast();

  const { data: vehicle, isLoading, refetch } = useQuery(getGetVehicleByIdQueryOptions(id!));
  const { data: history } = useQuery(getGetVehicleHistoryQueryOptions(id!));
  
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const updateLocationMutation = useUpdateVehicleLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    licensePlate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
  });

  React.useEffect(() => {
    if (vehicle) {
      setForm({
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year.toString(),
        color: vehicle.color,
      });
    }
  }, [vehicle]);

  if (isLoading) return <LoadingScreen />;
  if (!vehicle) return null;

  const handleUpdate = async () => {
    try {
      await updateVehicleMutation.mutateAsync({
        id: vehicle.id,
        data: {
          ...form,
          year: parseInt(form.year, 10),
        },
      });
      setIsEditing(false);
      refetch();
      showSuccess("Vehicle updated successfully");
    } catch (err: any) {
      showError(err.message || "Update failed");
    }
  };

  const handleDelete = () => {
    showConfirm({
      title: "Delete Vehicle",
      message: "Are you sure you want to remove this vehicle?",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteVehicleMutation.mutateAsync({ id: vehicle.id });
          router.back();
        } catch (err: any) {
          showError(err.message || "Delete failed");
        }
      },
    });
  };

  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showWarning("We need location permission to update vehicle position");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await updateLocationMutation.mutateAsync({
        id: vehicle.id,
        data: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
      });
      refetch();
      showSuccess("Location updated to current position");
    } catch {
      showError("Failed to update location");
    }
  };

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    const formData = new FormData();
    formData.append("photo", {
      uri,
      name: "vehicle.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const baseUrl = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
      const resp = await fetch(`${baseUrl}/api/vehicles/${vehicle.id}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!resp.ok) throw new Error("Upload failed");
      refetch();
    } catch {
      showError("Failed to upload photo");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString() + " " + new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ChevronLeft size={24} color={colors.foreground} strokeWidth={2.5} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {vehicle.name}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            >
              {isEditing
                ? <X size={18} color={colors.foreground} strokeWidth={2.5} />
                : <Pencil size={18} color={colors.foreground} strokeWidth={2.5} />
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.iconBtn, { backgroundColor: "#FEF2F2" }]}
            >
              <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo */}
        {vehicle.photoUrl ? (
          <Pressable onPress={changePhoto} style={styles.photoWrap}>
            <Image source={{ uri: vehicle.photoUrl }} style={styles.photo} resizeMode="cover" />
            <View style={styles.photoOverlay}>
              <Camera size={20} color="white" strokeWidth={2} />
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={changePhoto} style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
            <Camera size={32} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text style={[styles.addPhotoText, { color: colors.mutedForeground }]}>Add Photo</Text>
          </Pressable>
        )}

        <View style={styles.content}>
          {isEditing ? (
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Edit Vehicle</Text>
              <View style={styles.formGap}>
                <Input label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
                <Input label="License Plate" value={form.licensePlate} onChangeText={(t) => setForm({ ...form, licensePlate: t.toUpperCase() })} autoCapitalize="characters" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="Brand" value={form.brand} onChangeText={(t) => setForm({ ...form, brand: t })} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Input label="Model" value={form.model} onChangeText={(t) => setForm({ ...form, model: t })} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="Year" value={form.year} onChangeText={(t) => setForm({ ...form, year: t })} keyboardType="numeric" />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Input label="Color" value={form.color} onChangeText={(t) => setForm({ ...form, color: t })} />
                  </View>
                </View>
                <Button title="Save Changes" onPress={handleUpdate} loading={updateVehicleMutation.isPending} fullWidth />
              </View>
            </Card>
          ) : (
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Vehicle Info</Text>
              {[
                ["License Plate", vehicle.licensePlate],
                ["Brand", vehicle.brand],
                ["Model", vehicle.model],
                ["Year", vehicle.year.toString()],
                ["Color", vehicle.color],
              ].map(([label, value]) => (
                <View key={label} style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Location */}
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Location</Text>
            {vehicle.latitude != null && vehicle.longitude != null ? (
              <View style={styles.locationRow}>
                <MapPin size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                  {vehicle.latitude.toFixed(5)}, {vehicle.longitude.toFixed(5)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.noLocation, { color: colors.mutedForeground }]}>
                No location set
              </Text>
            )}
            <Button
              title="Update to Current Location"
              icon={MapPin}
              onPress={updateLocation}
              loading={updateLocationMutation.isPending}
              variant="outline"
              fullWidth
              style={{ marginTop: 12 }}
            />
          </Card>

          {/* History */}
          {history && history.length > 0 && (
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Parking History</Text>
              <FlatList
                data={history.slice(0, 5)}
                keyExtractor={(item: any) => item.id}
                scrollEnabled={false}
                renderItem={({ item }: { item: any }) => (
                  <View style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.historyLot, { color: colors.foreground }]} numberOfLines={1}>
                      🅿️ {item.parkingLot?.name ?? "Unknown Lot"}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                )}
              />
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoWrap: {
    height: 200,
    width: "100%",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 200,
  },
  photoOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholder: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addPhotoText: { fontSize: 14, fontWeight: "500" },
  content: { padding: 16, gap: 12 },
  card: { marginBottom: 0 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  formGap: { gap: 12 },
  row: { flexDirection: "row" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  locationText: { fontSize: 13, flex: 1 },
  noLocation: { fontSize: 14 },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  historyLot: { fontSize: 14, fontWeight: "600" },
  historyDate: { fontSize: 12 },
});
