import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const GREEN  = "#22C55E";
const YELLOW = "#F97316";
const RED    = "#EF4444";

function timerColor(seconds: number): string {
  if (seconds < 30 * 60) return GREEN;
  if (seconds < 60 * 60) return YELLOW;
  return RED;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface SessionTimerCardProps {
  lotName?: string;
}

export const SessionTimerCard = React.memo(function SessionTimerCard({
  lotName = "Current Parking Session",
}: SessionTimerCardProps) {
  const colors = useColors();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const color = useMemo(() => timerColor(seconds), [seconds]);
  const phase = seconds < 30 * 60 ? "green" : seconds < 60 * 60 ? "yellow" : "red";

  useEffect(() => {
    if (phase !== "green") {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [phase, pulseAnim]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleToggle = useCallback(() => {
    setRunning((r) => !r);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setSeconds(0);
  }, []);

  const label =
    phase === "green"
      ? "Session active"
      : phase === "yellow"
      ? "Approaching limit"
      : "Time exceeded";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🅿️</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {lotName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Parking Timer
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.timerWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.timer, { color }]}>{formatTime(seconds)}</Text>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </Animated.View>

      <Text style={[styles.label, { color }]}>{label}</Text>

      <View style={styles.phaseBar}>
        <View style={[styles.phaseSeg, { backgroundColor: GREEN, opacity: phase === "green" ? 1 : 0.25 }]} />
        <View style={[styles.phaseSeg, { backgroundColor: YELLOW, opacity: phase === "yellow" ? 1 : 0.25 }]} />
        <View style={[styles.phaseSeg, { backgroundColor: RED, opacity: phase === "red" ? 1 : 0.25 }]} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: color + "18", borderColor: color }]}
          onPress={handleToggle}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, { color }]}>{running ? "⏸ Pause" : "▶ Start"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnReset, { borderColor: colors.border }]}
          onPress={handleReset}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, { color: colors.mutedForeground }]}>↺ Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  headerEmoji: { fontSize: 28 },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  timerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  timer: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  label: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  phaseBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  phaseSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  btnReset: {
    flex: 0.5,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
