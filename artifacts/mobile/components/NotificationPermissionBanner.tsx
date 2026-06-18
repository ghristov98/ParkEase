import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
}

export const NotificationPermissionBanner = React.memo(({ visible }: Props) => {
  const colors = useColors();
  const [permission, setPermission] = useState<string>("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const handleEnable = async () => {
    if (Platform.OS !== "web" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "default") setDismissed(true);
  };

  if (
    !visible ||
    dismissed ||
    Platform.OS !== "web" ||
    !("Notification" in (typeof window !== "undefined" ? window : {})) ||
    permission !== "default"
  ) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.primary + "60" }]}>
      <Text style={[styles.icon]}>🔔</Text>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.foreground }]}>Enable parking alerts</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Get notified when your parking is about to expire
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleEnable} style={[styles.enableBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.enableText}>Enable</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDismissed(true)} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  icon: { fontSize: 22 },
  text: { flex: 1 },
  title: { fontSize: 13, fontWeight: "700" },
  body: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  enableBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  enableText: { color: "white", fontSize: 12, fontWeight: "700" },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: 16, fontWeight: "600" },
});
