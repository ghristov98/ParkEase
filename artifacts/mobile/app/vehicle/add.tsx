import { useCreateVehicle } from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ChevronLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/contexts/ToastContext";

export default function AddVehicleScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const createVehicleMutation = useCreateVehicle();
  const { showError, showWarning } = useToast();

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
      showWarning("Please fill in all required fields");
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
      showError(err.message || "Failed to add vehicle");
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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Vehicle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={pickImage} style={styles.photoPickerWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPicker} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPicker, styles.photoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Camera size={32} color={colors.mutedForeground} strokeWidth={1.5} />
              <Text style={[styles.photoPlaceholderText, { color: colors.mutedForeground }]}>
                Add Photo
              </Text>
            </View>
          )}
        </Pressable>

        <Input
          label="Vehicle Name *"
          placeholder='e.g. "My Car"'
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />
        <Input
          label="License Plate *"
          placeholder="A1234BC"
          value={form.licensePlate}
          onChangeText={(text) => setForm({ ...form, licensePlate: text.toUpperCase() })}
          autoCapitalize="characters"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Brand *"
              placeholder="Toyota"
              value={form.brand}
              onChangeText={(text) => setForm({ ...form, brand: text })}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Input
              label="Model *"
              placeholder="Corolla"
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
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Input
              label="Color"
              placeholder="White"
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
          style={{ marginTop: 8 }}
        />
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 20, gap: 12 },
  photoPickerWrap: { alignItems: "center", marginBottom: 8 },
  photoPicker: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 14, fontWeight: "500" },
  row: { flexDirection: "row" },
});
