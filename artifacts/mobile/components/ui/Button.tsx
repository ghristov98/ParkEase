import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
}

export const Button = React.memo(function Button({
  variant = "primary",
  size = "md",
  title,
  onPress,
  loading,
  disabled,
  fullWidth,
  icon: IconComponent,
  style,
}: ButtonProps) {
  const colors = useColors();

  const getBackgroundColor = useCallback(() => {
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
  }, [variant, colors]);

  const getTextColor = useCallback(() => {
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
  }, [variant, disabled, colors]);

  const height = size === "sm" ? 36 : size === "md" ? 48 : 56;
  const paddingHorizontal = size === "sm" ? 12 : 24;
  const fontSize = size === "sm" ? 14 : 16;
  const iconSize = size === "sm" ? 16 : 18;

  const textColor = getTextColor();

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {IconComponent && (
            <View style={styles.iconWrap}>
              <IconComponent size={iconSize} color={textColor} strokeWidth={2} />
            </View>
          )}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize },
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
    ...style,
  };

  if (variant === "primary" && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => ({
          width: fullWidth ? "100%" : "auto",
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <LinearGradient
          colors={[colors.primary, "#3B6BF5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={containerStyle}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        containerStyle,
        {
          transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
  },
  iconWrap: {
    marginRight: 8,
  },
});
