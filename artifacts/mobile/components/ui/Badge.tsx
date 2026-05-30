import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  label: string;
  variant?: "free" | "paid" | "admin" | "superadmin" | "active" | "inactive" | "default";
  style?: ViewStyle;
}

export function Badge({ label, variant = "default", style }: BadgeProps) {
  const colors = useColors();

  const getColors = () => {
    switch (variant) {
      case "free":
      case "active":
        return { bg: "#DCFCE7", text: "#166534" }; // Light green bg, dark green text
      case "paid":
        return { bg: "#FFEDD5", text: "#9A3412" }; // Light orange bg, dark orange text
      case "admin":
      case "superadmin":
        return { bg: "#E0E7FF", text: "#3730A3" }; // Light indigo bg, dark indigo text
      case "inactive":
        return { bg: "#F3F4F6", text: "#4B5563" }; // Light gray bg, dark gray text
      default:
        return { bg: colors.muted, text: colors.mutedForeground };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
