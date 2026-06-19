import { getGetBroadcastsQueryOptions, useCreateBroadcast, useDeleteBroadcast } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminBroadcastsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: broadcasts = [], isLoading, refetch } = useQuery(getGetBroadcastsQueryOptions());
  const createMutation = useCreateBroadcast({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["getBroadcasts"] }); setTitle(""); setBody(""); setShowForm(false); } },
  });
  const deleteMutation = useDeleteBroadcast({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["getBroadcasts"] }) },
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Title and message are required");
      return;
    }
    createMutation.mutate({ title: title.trim(), body: body.trim() });
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete announcement?", "This will remove it from all users.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id }) },
    ]);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>📣 Broadcasts</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.addBtnText}>{showForm ? "✕" : "＋"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>New Announcement</Text>
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Road works on Primorski Blvd" />
          <Input
            label="Message"
            value={body}
            onChangeText={setBody}
            placeholder="Detailed message to all users…"
            multiline
          />
          <Button
            title="Publish"
            onPress={handleCreate}
            loading={createMutation.isPending}
            fullWidth
          />
        </Card>
      )}

      <FlatList
        data={broadcasts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <Card style={styles.broadcastItem}>
            <View style={styles.broadcastHeader}>
              <Text style={[styles.broadcastTitle, { color: colors.foreground }]}>{item.title}</Text>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Text style={{ color: "#EF4444", fontSize: 18 }}>🗑</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.broadcastBody, { color: colors.mutedForeground }]}>{item.body}</Text>
            <Text style={[styles.broadcastTime, { color: colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📢</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No announcements yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap ＋ above to create a city-wide announcement for all users.
            </Text>
          </View>
        }
      />
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
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "white", fontSize: 20, fontWeight: "700" },
  form: { marginHorizontal: 16, marginBottom: 12, gap: 12 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  list: { padding: 16 },
  broadcastItem: { marginBottom: 12 },
  broadcastHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  broadcastTitle: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  broadcastBody: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  broadcastTime: { fontSize: 12 },
  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
