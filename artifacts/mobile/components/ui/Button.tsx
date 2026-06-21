import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export function Button({
  variant = "primary",
  size = "md",
  title,
  onPress,
  loading,
  disabled,
  fullWidth,
  icon,
  style,
}: ButtonProps) {
  const colors = useColors();

  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return "transparent";
      case "secondary":
        return colors.secondary;
      case "outline":
        return "transparent";
      case "ghost":
        return "transparent";
      case "destructive":
        return colors.destructive;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case "primary":
        return colors.primaryForeground;
      case "secondary":
        return colors.secondaryForeground;
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.primary;
      case "destructive":
        return colors.destructiveForeground;
      default:
        return colors.primaryForeground;
    }
  };

  const height = size === "sm" ? 36 : size === "md" ? 48 : 56;
  const paddingHorizontal = size === "sm" ? 12 : 24;
  const fontSize = size === "sm" ? 14 : 16;
  const iconSize = size === "sm" ? 16 : 18;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && (
            <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
          )}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), fontSize },
              disabled && { color: colors.mutedForeground },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const containerStyle: ViewStyle = {
    height,
    paddingHorizontal,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: getBackgroundColor(),
    width: fullWidth ? "100%" : "auto",
    borderWidth: variant === "outline" ? 1 : 0,
    borderColor: variant === "outline" ? colors.primary : "transparent",
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  if (variant === "primary" && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={{ width: fullWidth ? "100%" : "auto" }}
      >
        <LinearGradient
          colors={[colors.primary, "#3B6BF5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={containerStyle}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={containerStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
  },
  icon: {
    marginRight: 8,
  },
});
