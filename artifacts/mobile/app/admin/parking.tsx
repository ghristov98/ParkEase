import {
  useCreateParkingLot,
  useDeleteParkingLot,
  useUpdateParkingLot,
  getGetParkingLotsQueryOptions,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminParking() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<any>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { data: parkingLots, isLoading, refetch } = useQuery(getGetParkingLotsQueryOptions());
  const createMutation = useCreateParkingLot();
  const updateMutation = useUpdateParkingLot();
  const deleteMutation = useDeleteParkingLot();

  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: "40.7128",
    longitude: "-74.0060",
    type: "free" as "free" | "paid",
    description: "",
  });

  const handleOpenAdd = () => {
    setEditingLot(null);
    setForm({
      name: "",
      address: "",
      latitude: "40.7128",
      longitude: "-74.0060",
      type: "free",
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lot: any) => {
    setEditingLot(lot);
    setForm({
      name: lot.name,
      address: lot.address,
      latitude: lot.latitude.toString(),
      longitude: lot.longitude.toString(),
      type: lot.type,
      description: lot.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      };

      if (editingLot) {
        await updateMutation.mutateAsync({
          id: editingLot.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Save failed");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteMutation.mutateAsync({ id });
        refetch();
      }}
    ]);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Button title="Add Parking Lot" onPress={handleOpenAdd} icon="add" fullWidth />
      </View>

      <FlatList
        data={parkingLots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.lotCard}>
            <View style={styles.lotRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lotName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>{item.address}</Text>
                <Badge label={item.type} variant={item.type as any} />
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleOpenEdit(item)}>
                  <Text style={[styles.actionEmoji, { color: colors.primary }]}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionEmoji, { color: colors.destructive }]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />

      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContent, { backgroundColor: colors.background, paddingTop: 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingLot ? "Edit Parking Lot" : "Add Parking Lot"}
            </Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={[styles.closeEmoji, { color: colors.foreground }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Input label="Name" value={form.name} onChangeText={(t) => setForm({...form, name: t})} />
            <Input label="Address" value={form.address} onChangeText={(t) => setForm({...form, address: t})} />
            <View style={styles.row}>
              <View style={{flex:1}}><Input label="Lat" value={form.latitude} onChangeText={(t) => setForm({...form, latitude: t})} /></View>
              <View style={{width:12}} />
              <View style={{flex:1}}><Input label="Lng" value={form.longitude} onChangeText={(t) => setForm({...form, longitude: t})} /></View>
            </View>
            <View style={styles.typeRow}>
              <TouchableOpacity 
                style={[styles.typeBtn, form.type === 'free' && { backgroundColor: colors.primary }]}
                onPress={() => setForm({...form, type: 'free'})}
              >
                <Text style={[styles.typeBtnText, form.type === 'free' && { color: 'white' }]}>Free</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, form.type === 'paid' && { backgroundColor: colors.primary }]}
                onPress={() => setForm({...form, type: 'paid'})}
              >
                <Text style={[styles.typeBtnText, form.type === 'paid' && { color: 'white' }]}>Paid</Text>
              </TouchableOpacity>
            </View>
            <Input label="Description" value={form.description} onChangeText={(t) => setForm({...form, description: t})} multiline />
            <Button title="Save" onPress={handleSave} fullWidth style={{ marginTop: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionEmoji: {
    fontSize: 20,
  },
  closeEmoji: {
    fontSize: 22,
    fontWeight: "600",
  },
  container: { flex: 1 },
  header: { padding: 16 },
  list: { padding: 16, gap: 12 },
  lotCard: { marginBottom: 4 },
  lotRow: { flexDirection: "row", alignItems: "center" },
  lotName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  lotAddress: { fontSize: 14, marginBottom: 8 },
  actions: { gap: 16, paddingLeft: 12 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  row: { flexDirection: "row" },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  typeBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD" },
  typeBtnText: { fontWeight: "600" },
});
