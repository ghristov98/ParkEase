import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { StartSessionRequest } from "@workspace/api-client-react";

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
}

interface LotInfo {
  id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  visible: boolean;
  lot: LotInfo | null;
  vehicles: Vehicle[];
  onStart: (req: StartSessionRequest) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const DURATION_OPTIONS = [
  { label: "Free / Open", minutes: null },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
];

export const StartSessionModal = React.memo(({ visible, lot, vehicles, onStart, onClose, isLoading }: Props) => {
  const colors = useColors();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [durationIndex, setDurationIndex] = useState(0);

  const handleStart = useCallback(() => {
    if (!selectedVehicleId || !lot) return;
    const opt = DURATION_OPTIONS[durationIndex];
    onStart({
      vehicleId: selectedVehicleId,
      parkingLotId: lot.id,
      locationName: lot.name,
      locationAddress: lot.address,
      latitude: lot.latitude,
      longitude: lot.longitude,
      paidMinutes: opt?.minutes ?? undefined,
    });
  }, [selectedVehicleId, durationIndex, lot, onStart]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={styles.handle} />
        <Text style={[styles.title, { color: colors.foreground }]}>🅿️ Start Parking Session</Text>
        {lot && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
            {lot.name}{lot.address ? ` · ${lot.address}` : ""}
          </Text>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Select Vehicle</Text>
        {vehicles.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No vehicles registered yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleRow}>
            {vehicles.map((v) => {
              const isSelected = v.id === selectedVehicleId;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border ?? "#E2E7F5",
                    },
                  ]}
                  onPress={() => setSelectedVehicleId(v.id)}
                >
                  <Text style={[styles.vehicleChipName, { color: isSelected ? "white" : colors.foreground }]}>
                    🚗 {v.name}
                  </Text>
                  <Text style={[styles.vehicleChipPlate, { color: isSelected ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                    {v.licensePlate}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((opt, i) => {
            const isSelected = i === durationIndex;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border ?? "#E2E7F5",
                  },
                ]}
                onPress={() => setDurationIndex(i)}
              >
                <Text style={[styles.durationChipText, { color: isSelected ? "white" : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.startBtn,
            {
              backgroundColor: selectedVehicleId && !isLoading ? colors.primary : colors.mutedForeground,
            },
          ]}
          onPress={handleStart}
          disabled={!selectedVehicleId || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.startBtnText}>Start Parking</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  emptyText: { fontSize: 13, marginBottom: 12 },
  vehicleRow: { marginBottom: 16 },
  vehicleChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 110,
  },
  vehicleChipName: { fontSize: 14, fontWeight: "600" },
  vehicleChipPlate: { fontSize: 11, marginTop: 2 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  durationChip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  durationChipText: { fontSize: 13, fontWeight: "500" },
  startBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  startBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 14 },
});
