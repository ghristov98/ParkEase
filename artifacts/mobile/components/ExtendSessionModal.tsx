import React, { useState, useCallback } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onExtend: (minutes: number) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const OPTIONS = [
  { label: "+15 min", minutes: 15 },
  { label: "+30 min", minutes: 30 },
  { label: "+1 hour", minutes: 60 },
  { label: "+2 hours", minutes: 120 },
];

export const ExtendSessionModal = React.memo(({ visible, onExtend, onClose, isLoading }: Props) => {
  const colors = useColors();
  const [selected, setSelected] = useState(1);

  const handleConfirm = useCallback(() => {
    const opt = OPTIONS[selected];
    if (opt) onExtend(opt.minutes);
  }, [selected, onExtend]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>⏱ Extend Parking Time</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>How long would you like to add?</Text>

        <View style={styles.options}>
          {OPTIONS.map((opt, i) => {
            const isSelected = i === selected;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border ?? "#E2E7F5",
                  },
                ]}
                onPress={() => setSelected(i)}
              >
                <Text style={[styles.optionText, { color: isSelected ? "white" : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border ?? "#E2E7F5" }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.confirmBtn, { backgroundColor: isLoading ? colors.mutedForeground : colors.primary }]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.confirmText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "35%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  option: {
    flex: 1,
    minWidth: "40%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  optionText: { fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelBtn: { borderWidth: 1.5 },
  confirmBtn: {},
  btnText: { fontSize: 15, fontWeight: "600" },
  confirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});
