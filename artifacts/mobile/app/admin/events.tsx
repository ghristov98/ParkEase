import { getGetAllEventsQueryOptions, useCreateEvent, useDeleteEvent } from "@workspace/api-client-react";
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

export default function AdminEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery(getGetAllEventsQueryOptions());
  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["getAllEvents"] });
        qc.invalidateQueries({ queryKey: ["getActiveEvents"] });
        setShowForm(false);
        setTitle(""); setMessage(""); setZone(""); setStartTime(""); setEndTime("");
      },
    },
  });
  const deleteMutation = useDeleteEvent({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["getAllEvents"] }); qc.invalidateQueries({ queryKey: ["getActiveEvents"] }); } },
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [zone, setZone] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !message.trim() || !startTime || !endTime) {
      Alert.alert("Error", "Title, message, start and end time are required.\nUse format: 2026-06-19T08:00");
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert("Error", "Invalid date format. Use: 2026-06-19T08:00");
      return;
    }
    if (end <= start) {
      Alert.alert("Error", "End time must be after start time.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      zone: zone.trim() || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete event?", "This will remove the warning for all users.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id }) },
    ]);
  };

  const isActive = (start: string, end: string) => {
    const now = new Date();
    return now >= new Date(start) && now <= new Date(end);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>⚠️ Events</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={[styles.addBtn, { backgroundColor: "#F59E0B" }]}>
          <Text style={styles.addBtnText}>{showForm ? "✕" : "＋"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>New Event Warning</Text>
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Street fair in Blue Zone" />
          <Input label="Message" value={message} onChangeText={setMessage} placeholder="Full warning message…" multiline />
          <Input label="Zone (optional)" value={zone} onChangeText={setZone} placeholder="Blue / Green / All" />
          <Input label="Start (2026-06-20T08:00)" value={startTime} onChangeText={setStartTime} placeholder="2026-06-20T08:00" />
          <Input label="End (2026-06-20T18:00)" value={endTime} onChangeText={setEndTime} placeholder="2026-06-20T18:00" />
          <Button title="Create Warning" onPress={handleCreate} loading={createMutation.isPending} fullWidth />
        </Card>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => {
          const active = isActive(item.startTime, item.endTime);
          return (
            <Card style={[styles.eventItem, active && { borderLeftWidth: 4, borderLeftColor: "#F59E0B" }]}>
              <View style={styles.eventHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.eventTitleRow}>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
                    {active && <View style={styles.activePill}><Text style={styles.activePillText}>LIVE</Text></View>}
                    {item.zone && (
                      <View style={[styles.zonePill, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.zonePillText, { color: colors.mutedForeground }]}>{item.zone}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.eventMessage, { color: colors.mutedForeground }]}>{item.message}</Text>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                    🕒 {new Date(item.startTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} →{" "}
                    {new Date(item.endTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item.id)} style={{ paddingLeft: 8 }}>
                  <Text style={{ color: "#EF4444", fontSize: 18 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create event warnings to alert users about road works, fairs, or restricted zones.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "white", fontSize: 20, fontWeight: "700" },
  form: { marginHorizontal: 16, marginBottom: 12, gap: 12 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  list: { padding: 16 },
  eventItem: { marginBottom: 12 },
  eventHeader: { flexDirection: "row", alignItems: "flex-start" },
  eventTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  activePill: { backgroundColor: "#FEF3C7", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText: { fontSize: 10, fontWeight: "700", color: "#92400E" },
  zonePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  zonePillText: { fontSize: 11, fontWeight: "600" },
  eventMessage: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  eventTime: { fontSize: 12 },
  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
