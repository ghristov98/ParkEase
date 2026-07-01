import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: boolean;
  shadow?: boolean;
}

export function Card({ children, style, padding = true, shadow = true }: CardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: padding ? 16 : 0,
        },
        shadow && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
});
