import { Ionicons } from "@expo/vector-icons";
import { useCreateVehicle } from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AddVehicleScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const createVehicleMutation = useCreateVehicle();

  const [form, setForm] = useState({
    name: "",
    licensePlate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    color: "",
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.licensePlate || !form.brand || !form.model) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const vehicle = await createVehicleMutation.mutateAsync({
        data: {
          ...form,
          year: parseInt(form.year, 10),
        },
      });

      if (photoUri) {
        await uploadPhoto(vehicle.id, photoUri);
      }

      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add vehicle");
    }
  };

  const uploadPhoto = async (id: string, uri: string) => {
    const formData = new FormData();
    formData.append("photo", {
      uri,
      name: "vehicle.jpg",
      type: "image/jpeg",
    } as any);

    const baseUrl = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
    const resp = await fetch(`${baseUrl}/api/vehicles/${id}/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!resp.ok) throw new Error("Photo upload failed");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Add Vehicle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity onPress={pickImage} style={styles.photoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
              <Ionicons name="camera-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.photoText, { color: colors.mutedForeground }]}>Add Vehicle Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <Input
            label="Vehicle Nickname"
            placeholder="My Cool Car"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
          <Input
            label="License Plate"
            placeholder="ABC-1234"
            value={form.licensePlate}
            onChangeText={(text) => setForm({ ...form, licensePlate: text })}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Brand"
                placeholder="Tesla"
                value={form.brand}
                onChangeText={(text) => setForm({ ...form, brand: text })}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Input
                label="Model"
                placeholder="Model 3"
                value={form.model}
                onChangeText={(text) => setForm({ ...form, model: text })}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Year"
                placeholder="2024"
                value={form.year}
                onChangeText={(text) => setForm({ ...form, year: text })}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Input
                label="Color"
                placeholder="Midnight Silver"
                value={form.color}
                onChangeText={(text) => setForm({ ...form, color: text })}
              />
            </View>
          </View>

          <Button
            title="Save Vehicle"
            onPress={handleSave}
            loading={createVehicleMutation.isPending}
            fullWidth
            style={styles.saveButton}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  photoPicker: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
  },
  saveButton: {
    marginTop: 16,
  },
});
