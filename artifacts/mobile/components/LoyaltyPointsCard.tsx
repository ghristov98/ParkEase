import React, {
  useCallback,
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

interface FloatItem {
  id: string;
  value: number;
  anim: Animated.ValueXY;
  opacity: Animated.Value;
}

const ACCENT = "#00C5A8";

interface LoyaltyPointsCardProps {
  initialPoints?: number;
}

export const LoyaltyPointsCard = React.memo(function LoyaltyPointsCard({
  initialPoints = 150,
}: LoyaltyPointsCardProps) {
  const colors = useColors();
  const [points, setPoints] = useState(initialPoints);
  const [floaters, setFloaters] = useState<FloatItem[]>([]);
  const floaterIdRef = useRef(0);

  const earnPoints = useCallback(() => {
    const earned = Math.floor(Math.random() * 10) + 5;
    setPoints((p) => p + earned);

    const id = `float-${floaterIdRef.current++}`;
    const anim = new Animated.ValueXY({ x: 0, y: 0 });
    const opacity = new Animated.Value(1);

    const floater: FloatItem = { id, value: earned, anim, opacity };

    setFloaters((prev) => [...prev, floater]);

    Animated.parallel([
      Animated.timing(anim, {
        toValue: { x: (Math.random() - 0.5) * 40, y: -70 },
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    });
  }, []);

  const tier = useMemo(() => {
    if (points >= 500) return { label: "Gold", emoji: "🥇", color: "#F59E0B" };
    if (points >= 200) return { label: "Silver", emoji: "🥈", color: "#9CA3AF" };
    return { label: "Bronze", emoji: "🥉", color: "#CD7C3E" };
  }, [points]);

  const progress = useMemo(() => {
    if (points >= 500) return 1;
    if (points >= 200) return (points - 200) / 300;
    return points / 200;
  }, [points]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Loyalty Points</Text>
          <View style={styles.tierRow}>
            <Text style={styles.tierEmoji}>{tier.emoji}</Text>
            <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label} Member</Text>
          </View>
        </View>
        <View style={styles.pointsBubble}>
          <Text style={styles.pointsNum}>{points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: tier.color, width: `${Math.min(progress * 100, 100)}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressNote, { color: colors.mutedForeground }]}>
        {points >= 500
          ? "Maximum tier reached 🎉"
          : `${points >= 200 ? 500 - points : 200 - points} pts to next tier`}
      </Text>

      <View style={styles.btnWrap}>
        <TouchableOpacity
          style={[styles.earnBtn, { backgroundColor: ACCENT }]}
          onPress={earnPoints}
          activeOpacity={0.8}
        >
          <Text style={styles.earnBtnText}>⭐ Check In & Earn</Text>
        </TouchableOpacity>

        {floaters.map((f) => (
          <Animated.View
            key={f.id}
            pointerEvents="none"
            style={[
              styles.floater,
              {
                opacity: f.opacity,
                transform: [
                  { translateX: f.anim.x },
                  { translateY: f.anim.y },
                ],
              },
            ]}
          >
            <Text style={styles.floaterText}>+{f.value} pts</Text>
          </Animated.View>
        ))}
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tierEmoji: { fontSize: 14 },
  tierLabel: { fontSize: 13, fontWeight: "600" },
  pointsBubble: {
    backgroundColor: "#00C5A8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 64,
  },
  pointsNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    lineHeight: 26,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressNote: {
    fontSize: 12,
    marginBottom: 14,
  },
  btnWrap: {
    position: "relative",
    alignItems: "center",
  },
  earnBtn: {
    height: 44,
    borderRadius: 12,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  earnBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  floater: {
    position: "absolute",
    bottom: 22,
    left: "50%",
    pointerEvents: "none",
  },
  floaterText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00C5A8",
  },
});
