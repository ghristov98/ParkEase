import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { ParkingSession } from "@workspace/api-client-react";

interface Props {
  session: ParkingSession;
  vehicleName?: string;
  onEnd: () => void;
  onExtend: () => void;
  isEnding?: boolean;
}

function formatDuration(totalSeconds: number, countdown: boolean): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const base = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (countdown && totalSeconds < 0) return `-${base}`;
  return base;
}

export const ActiveSessionCard = React.memo(({ session, vehicleName, onEnd, onExtend, isEnding }: Props) => {
  const colors = useColors();
  const isPaid = !!session.endTime;

  const getSeconds = useCallback(() => {
    if (isPaid) {
      const end = new Date(session.endTime!).getTime();
      return Math.floor((end - Date.now()) / 1000);
    }
    const start = new Date(session.startTime).getTime();
    return Math.floor((Date.now() - start) / 1000);
  }, [session.endTime, session.startTime, isPaid]);

  const [seconds, setSeconds] = useState(getSeconds);

  useEffect(() => {
    setSeconds(getSeconds());
    const id = setInterval(() => setSeconds(getSeconds()), 1000);
    return () => clearInterval(id);
  }, [getSeconds]);

  const isExpiringSoon = isPaid && seconds >= 0 && seconds <= 300;
  const isExpired = isPaid && seconds < 0;

  const timerColor = isExpired
    ? "#EF4444"
    : isExpiringSoon
    ? "#F59E0B"
    : colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={styles.info}>
          <Text style={[styles.location, { color: colors.foreground }]} numberOfLines={1}>
            {session.locationName}
          </Text>
          {vehicleName && (
            <Text style={[styles.vehicle, { color: colors.mutedForeground }]} numberOfLines={1}>
              🚗 {vehicleName}
            </Text>
          )}
        </View>
        <View style={styles.timerBox}>
          <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
            {isPaid ? (isExpired ? "EXPIRED" : "ENDS IN") : "PARKED"}
          </Text>
          <Text style={[styles.timer, { color: timerColor }]}>
            {formatDuration(seconds, isPaid)}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.extendBtn, { borderColor: colors.primary }]}
          onPress={onExtend}
        >
          <Text style={[styles.btnText, { color: colors.primary }]}>+ Extend</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.endBtn, { backgroundColor: isEnding ? colors.mutedForeground : "#EF4444" }]}
          onPress={onEnd}
          disabled={isEnding}
        >
          <Text style={styles.endBtnText}>{isEnding ? "Ending…" : "End Session"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  info: { flex: 1 },
  location: { fontSize: 14, fontWeight: "600" },
  vehicle: { fontSize: 12, marginTop: 2 },
  timerBox: { alignItems: "flex-end" },
  timerLabel: { fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" },
  timer: { fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  buttons: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  extendBtn: { borderWidth: 1.5, backgroundColor: "transparent" },
  endBtn: {},
  btnText: { fontSize: 14, fontWeight: "600" },
  endBtnText: { fontSize: 14, fontWeight: "600", color: "white" },
});
