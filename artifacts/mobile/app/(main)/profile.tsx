import { useUpdateProfile, getGetFavouritesQueryOptions, useRemoveFavourite } from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
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
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "@/hooks/useNavigate";

type FontSize = "normal" | "large" | "xlarge";
const FONT_SCALE: Record<FontSize, number> = { normal: 1, large: 1.15, xlarge: 1.3 };

export default function ProfileScreen() {
  const { user, logout, updateUser, accessToken } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDark, setMode, mode } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { navigate: navToSpot, clearPreference } = useNavigate();

  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const scale = FONT_SCALE[fontSize];

  const { data: favourites, refetch: refetchFavourites } = useQuery({
    ...getGetFavouritesQueryOptions(),
    enabled: !!accessToken,
    retry: 0,
  });

  const removeFavourite = useRemoveFavourite({
    mutation: { onSuccess: () => refetchFavourites() },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });

  const updateProfileMutation = useUpdateProfile();

  const handleUpdateProfile = async () => {
    try {
      const updatedUser = await updateProfileMutation.mutateAsync({ data: form });
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
    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string) => {
    const formData = new FormData();
    formData.append("photo", { uri, name: "profile.jpg", type: "image/jpeg" } as any);
    try {
      const baseUrl = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
      const resp = await fetch(`${baseUrl}/api/users/profile/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      updateUser({ ...user!, photoUrl: data.url });
    } catch {
      Alert.alert("Error", "Failed to upload photo");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground, fontSize: 28 * scale }]}>{t("profile")}</Text>
        </View>

        {/* Avatar */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarInitial, { fontSize: 32 * scale }]}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.card }]}>
              <Text style={styles.cameraEmoji}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.foreground, fontSize: 22 * scale }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground, fontSize: 16 * scale }]}>{user?.email}</Text>
        </View>

        {/* Personal Info */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 18 * scale }]}>{t("personalInfo")}</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={[styles.editButtonText, { color: colors.primary }]}>
                {isEditing ? t("cancel") : t("edit")}
              </Text>
            </TouchableOpacity>
          </View>
          {isEditing ? (
            <View style={styles.form}>
              <Input label={t("firstName")} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
              <Input label={t("lastName")} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
              <Input label={t("phone")} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
              <Button title={t("saveChanges")} onPress={handleUpdateProfile} loading={updateProfileMutation.isPending} fullWidth />
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>📞</Text>
                <Text style={[styles.infoText, { color: colors.foreground, fontSize: 16 * scale }]}>
                  {user?.phone || "No phone added"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>✉️</Text>
                <Text style={[styles.infoText, { color: colors.foreground, fontSize: 16 * scale }]}>{user?.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoEmoji}>🛡️</Text>
                <Text style={[styles.infoText, { color: colors.foreground, fontSize: 16 * scale }]}>
                  Status: {user?.isVerified ? "Verified" : "Unverified"}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Favourites */}
        {accessToken && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 18 * scale }]}>⭐ {t("favourites")}</Text>
            </View>
            {(favourites ?? []).length === 0 ? (
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontSize: 14 * scale }]}>{t("noFavourites")}</Text>
            ) : (
              (favourites ?? []).map((fav: any) => (
                <View key={fav.id} style={[styles.favItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.favName, { color: colors.foreground, fontSize: 15 * scale }]}>{fav.name}</Text>
                    <Text style={[styles.favAddress, { color: colors.mutedForeground, fontSize: 13 * scale }]}>{fav.address}</Text>
                    <Text style={[styles.favType, { color: fav.type === "free" ? "#16A34A" : colors.primary, fontSize: 12 * scale }]}>
                      {fav.type === "free" ? "🆓 Free" : "💳 Paid"}
                    </Text>
                  </View>
                  <View style={styles.favActions}>
                    <TouchableOpacity
                      style={[styles.favNavBtn, { backgroundColor: colors.accent }]}
                      onPress={() => {
                        if (fav.latitude && fav.longitude) {
                          navToSpot(fav.latitude, fav.longitude, fav.name);
                        } else {
                          Alert.alert("No location", "This spot has no location data.");
                        }
                      }}
                    >
                      <Text style={styles.favNavText}>🧭</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.favNavBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push(`/parking/${fav.id}`)}
                    >
                      <Text style={styles.favNavText}>→</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.favRemoveBtn, { borderColor: "#EF4444" }]}
                      onPress={() => removeFavourite.mutate({ lotId: fav.id })}
                    >
                      <Text style={{ color: "#EF4444", fontSize: 16 }}>★</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        {/* Settings */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 18 * scale, marginBottom: 16 }]}>
            ⚙️ {t("settings")}
          </Text>

          {/* Dark Mode */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🌙</Text>
              <Text style={[styles.settingLabel, { color: colors.foreground, fontSize: 15 * scale }]}>{t("darkMode")}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? "dark" : "light")}
              trackColor={{ false: colors.muted, true: colors.primary + "80" }}
              thumbColor={isDark ? colors.primary : colors.mutedForeground}
            />
          </View>

          {/* Language */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>{lang === "en" ? "🇬🇧" : "🇧🇬"}</Text>
              <Text style={[styles.settingLabel, { color: colors.foreground, fontSize: 15 * scale }]}>{t("language")}</Text>
            </View>
            <View style={styles.langToggle}>
              <TouchableOpacity
                onPress={() => setLang("en")}
                style={[styles.langBtn, lang === "en" && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.langBtnText, lang === "en" && { color: "white" }]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLang("bg")}
                style={[styles.langBtn, lang === "bg" && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.langBtnText, lang === "bg" && { color: "white" }]}>BG</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Font Size */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🔤</Text>
              <Text style={[styles.settingLabel, { color: colors.foreground, fontSize: 15 * scale }]}>{t("fontSize")}</Text>
            </View>
            <View style={styles.fontSizeToggle}>
              {(["normal", "large", "xlarge"] as FontSize[]).map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setFontSize(size)}
                  style={[styles.fontSizeBtn, fontSize === size && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.fontSizeBtnText, fontSize === size && { color: "white" }]}>
                    {size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nav preference reset */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              clearPreference();
              Alert.alert("Reset", "Navigation app preference cleared.");
            }}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🧭</Text>
              <Text style={[styles.settingLabel, { color: colors.foreground, fontSize: 15 * scale }]}>Reset Nav Preference</Text>
            </View>
            <Text style={{ color: colors.mutedForeground }}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Admin card */}
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
          title={t("signOut")}
          onPress={logout}
          icon="🚪"
          style={styles.signOutButton}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: { fontWeight: "700" },
  profileHeader: { alignItems: "center", marginBottom: 32 },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontWeight: "700", color: "white" },
  cameraEmoji: { fontSize: 14 },
  arrowEmoji: { fontSize: 20, color: "white", fontWeight: "600" },
  editBadge: { position: "absolute", right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  userName: { fontWeight: "700", marginBottom: 4 },
  userEmail: {},
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontWeight: "700" },
  editButtonText: { fontSize: 14, fontWeight: "600" },
  form: { gap: 12 },
  infoList: { gap: 16 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoEmoji: { fontSize: 18, width: 24, textAlign: "center" },
  infoText: {},
  adminCard: { marginBottom: 24 },
  adminContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  adminTitle: { color: "white", fontSize: 18, fontWeight: "700", marginBottom: 2 },
  adminSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  signOutButton: { marginTop: 8, borderColor: "#EF4444" },
  favItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  favName: { fontWeight: "600" },
  favAddress: { marginTop: 2 },
  favType: { fontWeight: "600", marginTop: 2 },
  favActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  favNavBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  favNavText: { color: "white", fontSize: 15, fontWeight: "700" },
  favRemoveBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  // Settings
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  settingLabel: { fontWeight: "500" },
  langToggle: { flexDirection: "row", gap: 4 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" },
  langBtnText: { fontSize: 13, fontWeight: "700" },
  fontSizeToggle: { flexDirection: "row", gap: 4 },
  fontSizeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "transparent" },
  fontSizeBtnText: { fontSize: 13, fontWeight: "700" },
});
