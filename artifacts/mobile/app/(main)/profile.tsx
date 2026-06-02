
import { useUpdateProfile } from "@workspace/api-client-react";
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

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const { user, logout, updateUser, accessToken } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });

  const updateProfileMutation = useUpdateProfile();

  const handleUpdateProfile = async () => {
    try {
      const updatedUser = await updateProfileMutation.mutateAsync({
        data: form,
      });
      updateUser(updatedUser);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
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
      name: "profile.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const baseUrl = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
      const resp = await fetch(`${baseUrl}/api/users/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      updateUser({ ...user!, photoUrl: data.url });
    } catch (err) {
      Alert.alert("Error", "Failed to upload photo");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.card }]}>
              <Text style={styles.cameraEmoji}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Info</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={[styles.editButtonText, { color: colors.primary }]}>
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <Input
                label="First Name"
                value={form.firstName}
                onChangeText={(text) => setForm({ ...form, firstName: text })}
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChangeText={(text) => setForm({ ...form, lastName: text })}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                keyboardType="phone-pad"
              />
              <Button
                title="Save Changes"
                onPress={handleUpdateProfile}
                loading={updateProfileMutation.isPending}
                fullWidth
              />
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>📞</Text>
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {user?.phone || "No phone added"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>✉️</Text>
                <Text style={[styles.infoText, { color: colors.foreground }]}>{user?.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>🛡️</Text>
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  Status: {user?.isVerified ? "Verified" : "Unverified"}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {user?.role === "superadmin" && (
          <TouchableOpacity onPress={() => router.push("/admin")} style={styles.adminCard}>
            <Card style={{ backgroundColor: colors.primary }}>
              <View style={styles.adminContent}>
                <View>
                  <Text style={styles.adminTitle}>Admin Dashboard</Text>
                  <Text style={styles.adminSubtitle}>Manage users, lots and more</Text>
                </View>
                <Text style={styles.arrowEmoji}>→</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        <Button
          variant="outline"
          title="Sign Out"
          onPress={logout}
          icon="log-out-outline"
          style={styles.signOutButton}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
  },
  cameraEmoji: {
    fontSize: 14,
  },
  infoEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  arrowEmoji: {
    fontSize: 20,
    color: "white",
    fontWeight: "600",
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    gap: 12,
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  adminCard: {
    marginBottom: 24,
  },
  adminContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adminTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  adminSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  signOutButton: {
    marginTop: 8,
    borderColor: "#EF4444",
  },
});
