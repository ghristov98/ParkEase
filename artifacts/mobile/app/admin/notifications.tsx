import { useCreateNotification } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/contexts/ToastContext";

export default function AdminNotifications() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateNotification();
  const { showError, showSuccess, showWarning } = useToast();

  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "info",
    isAllUsers: true,
  });

  const handleSend = async () => {
    if (!form.title || !form.body) {
      showWarning("Title and Body are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          title: form.title,
          body: form.body,
          type: form.type,
        },
      });
      showSuccess("Notification sent to all users");
      setForm({ title: "", body: "", type: "info", isAllUsers: true });
    } catch (err: any) {
      showError(err.message || "Failed to send");
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Send to All Users</Text>
      <View style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.foreground }]}>Broadcast to everyone</Text>
        <Switch 
          value={form.isAllUsers} 
          onValueChange={(v) => setForm({...form, isAllUsers: v})}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Input 
        label="Notification Title" 
        placeholder="Update available" 
        value={form.title}
        onChangeText={(t) => setForm({...form, title: t})}
      />

      <Input 
        label="Message Body" 
        placeholder="Enter message here..." 
        multiline
        value={form.body}
        onChangeText={(t) => setForm({...form, body: t})}
      />

      <View style={styles.typeSection}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Notification Type</Text>
        <View style={styles.typeGrid}>
          {["info", "alert", "general"].map((t) => (
            <Button
              key={t}
              variant={form.type === t ? "primary" : "outline"}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              onPress={() => setForm({...form, type: t})}
              style={styles.typeBtn}
              size="sm"
            />
          ))}
        </View>
      </View>

      <Button 
        title="Send Notification" 
        onPress={handleSend} 
        loading={createMutation.isPending}
        fullWidth
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  switchText: { fontSize: 16 },
  typeSection: { marginTop: 8 },
  typeGrid: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1 },
});
