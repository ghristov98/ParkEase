import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type FeedbackStatus = "success" | "error";

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
  /** Briefly show ✓ or ✗ before reverting to idle */
  feedbackStatus?: FeedbackStatus;
}

export const Button = memo(function Button({
  variant = "primary",
  size = "md",
  title,
  onPress,
  loading,
  disabled,
  fullWidth,
  icon,
  style,
  feedbackStatus,
}: ButtonProps) {
  const colors = useColors();
  const [internalStatus, setInternalStatus] = useState<FeedbackStatus | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (feedbackStatus) {
      setInternalStatus(feedbackStatus);
      checkScale.setValue(0);
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }).start();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setInternalStatus(null), 1500);
    }
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, [feedbackStatus]);

  const isLoading = !!loading;
  const isDisabled = disabled || isLoading;
  const isFeedback = !!internalStatus;

  const getBackgroundColor = useCallback((): string => {
    if (internalStatus === "success") return "#10B981";
    if (internalStatus === "error") return "#EF4444";
    switch (variant) {
      case "primary": return "transparent";
      case "secondary": return colors.secondary;
      case "destructive": return colors.destructive;
      default: return "transparent";
    }
  }, [internalStatus, variant, colors]);

  const getTextColor = useCallback((): string => {
    if (internalStatus) return "#FFFFFF";
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case "primary": return colors.primaryForeground;
      case "secondary": return colors.secondaryForeground;
      case "outline": return colors.primary;
      case "ghost": return colors.primary;
      case "destructive": return colors.destructiveForeground;
      default: return colors.primaryForeground;
    }
  }, [internalStatus, disabled, variant, colors]);

  const height = size === "sm" ? 36 : size === "md" ? 48 : 56;
  const paddingHorizontal = size === "sm" ? 12 : 24;
  const fontSize = size === "sm" ? 14 : 16;
  const iconSize = size === "sm" ? 16 : 18;
  const textColor = getTextColor();

  const content = (
    <View style={styles.content}>
      {isFeedback ? (
        <Animated.Text style={[styles.feedbackLabel, { color: textColor, transform: [{ scale: checkScale }] }]}>
          {internalStatus === "success" ? "✓" : "✗"}
        </Animated.Text>
      ) : isLoading ? (
        <>
          <ActivityIndicator color={textColor} size="small" style={{ marginRight: 8 }} />
          <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
        </>
      ) : (
        <>
          {icon && <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>}
          <Text style={[styles.text, { color: textColor, fontSize }, disabled && { color: colors.mutedForeground }]}>
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
    opacity: isDisabled && !isFeedback ? 0.6 : 1,
    ...style,
  };

  if (variant === "primary" && !disabled && !isFeedback) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
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
      disabled={isDisabled}
      activeOpacity={0.7}
      style={containerStyle}
    >
      {content}
    </TouchableOpacity>
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
  icon: {
    marginRight: 8,
  },
  feedbackLabel: {
    fontSize: 22,
    fontWeight: "700",
  },
});
