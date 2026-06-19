import React, { useEffect, useRef, memo } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = memo(function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius,
          backgroundColor: colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
});

// ── Pre-built skeleton rows ──────────────────────────────────────────────────

export const SkeletonVehicleCard = memo(function SkeletonVehicleCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.vehicleCard, { backgroundColor: colors.card }]}>
      <Skeleton width={56} height={56} borderRadius={12} />
      <View style={skStyles.vehicleLines}>
        <Skeleton height={16} width="60%" borderRadius={6} />
        <Skeleton height={13} width="40%" borderRadius={6} style={{ marginTop: 6 }} />
        <Skeleton height={12} width="70%" borderRadius={6} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
});

export const SkeletonNotificationItem = memo(function SkeletonNotificationItem() {
  const colors = useColors();
  return (
    <View style={[skStyles.notifItem, { backgroundColor: colors.card }]}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={skStyles.notifLines}>
        <Skeleton height={14} width="75%" borderRadius={6} />
        <Skeleton height={12} width="90%" borderRadius={6} style={{ marginTop: 7 }} />
        <Skeleton height={11} width="50%" borderRadius={6} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
});

export const SkeletonDashboardCard = memo(function SkeletonDashboardCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.dashCard, { backgroundColor: colors.card }]}>
      <Skeleton height={20} width="50%" borderRadius={6} />
      <Skeleton height={40} width="35%" borderRadius={8} style={{ marginTop: 12 }} />
      <Skeleton height={14} width="65%" borderRadius={6} style={{ marginTop: 8 }} />
      <Skeleton height={80} borderRadius={10} style={{ marginTop: 16 }} />
    </View>
  );
});

const skStyles = StyleSheet.create({
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  vehicleLines: { flex: 1, gap: 0 },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  notifLines: { flex: 1 },
  dashCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});
