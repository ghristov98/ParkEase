import { Ionicons } from "@expo/vector-icons";
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
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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

export default function VehicleDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

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
      Alert.alert("Success", "Vehicle updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Update failed");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to remove this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleMutation.mutateAsync({ id: vehicle.id });
              router.back();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Delete failed");
            }
          },
        },
      ]
    );
  };

  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "We need location permission to update vehicle position");
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
      Alert.alert("Success", "Location updated to current position");
    } catch (err) {
      Alert.alert("Error", "Failed to update location");
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
    } catch (err) {
      Alert.alert("Error", "Failed to upload photo");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString() + " " + new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.imageContainer}>
          {vehicle.photoUrl ? (
            <Image source={{ uri: vehicle.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
              <Ionicons name="car" size={64} color={colors.mutedForeground} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraIcon} onPress={changePhoto}>
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Card style={styles.mainInfo}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.name, { color: colors.foreground }]}>{vehicle.name}</Text>
                <Text style={[styles.plate, { color: colors.primary }]}>{vehicle.licensePlate}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                <Ionicons name={isEditing ? "close" : "create-outline"} size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.form}>
                <Input label="Name" value={form.name} onChangeText={(t) => setForm({...form, name: t})} />
                <Input label="Plate" value={form.licensePlate} onChangeText={(t) => setForm({...form, licensePlate: t})} />
                <View style={styles.row}>
                  <View style={{flex:1}}><Input label="Brand" value={form.brand} onChangeText={(t) => setForm({...form, brand: t})} /></View>
                  <View style={{width:12}} />
                  <View style={{flex:1}}><Input label="Model" value={form.model} onChangeText={(t) => setForm({...form, model: t})} /></View>
                </View>
                <Button title="Save Changes" onPress={handleUpdate} loading={updateVehicleMutation.isPending} fullWidth />
              </View>
            ) : (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Brand</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{vehicle.brand}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Model</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{vehicle.model}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Year</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{vehicle.year}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Color</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{vehicle.color}</Text>
                </View>
              </View>
            )}
          </Card>

          <Button
            variant="secondary"
            title="Update Current Location"
            onPress={updateLocation}
            icon="location-outline"
            fullWidth
            style={styles.locationButton}
            loading={updateLocationMutation.isPending}
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent History</Text>
            {history?.events.map((event) => (
              <View key={event.id} style={styles.historyItem}>
                <View style={[styles.historyDot, { backgroundColor: colors.primary }]} />
                <View style={styles.historyContent}>
                  <Text style={[styles.historyType, { color: colors.foreground }]}>{event.eventType.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.historyDesc, { color: colors.mutedForeground }]}>{event.description}</Text>
                  <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>{formatDate(event.createdAt)}</Text>
                </View>
              </View>
            ))}
            {(!history || history.events.length === 0) && (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 10 }}>No history available</Text>
            )}
          </View>

          <Button
            variant="destructive"
            title="Delete Vehicle"
            onPress={handleDelete}
            icon="trash-outline"
            fullWidth
            style={styles.deleteButton}
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
    height: 250,
    width: "100%",
  },
  photo: {
    width: "100%",
    height: "100%",
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
  cameraIcon: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  mainInfo: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  plate: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  detailItem: {
    width: "45%",
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
  },
  locationButton: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  historyDesc: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
  },
  deleteButton: {
    marginTop: 16,
  },
});
