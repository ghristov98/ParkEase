import { Eye, EyeOff } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  leftIconText?: string;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
}

export const Input = React.memo(function Input({
  label,
  error,
  leftIcon: LeftIconComponent,
  leftIconText,
  rightIcon: RightIconComponent,
  onRightIconPress,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const actualSecureTextEntry = isPassword && !showPassword;

  const iconColor = isFocused ? colors.primary : colors.mutedForeground;

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  const handleTogglePassword = useCallback(() => setShowPassword((v) => !v), []);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.destructive
              : isFocused
              ? colors.primary
              : colors.border,
          },
          props.multiline && {
            height: undefined,
            minHeight: 52,
            alignItems: "flex-start",
            paddingVertical: 10,
          },
        ]}
      >
        {LeftIconComponent ? (
          <View style={styles.leftIcon}>
            <LeftIconComponent size={20} color={iconColor} strokeWidth={2} />
          </View>
        ) : leftIconText ? (
          <Text style={styles.leftIconText}>{leftIconText}</Text>
        ) : null}

        <TextInput
          style={[
            styles.input,
            { color: colors.foreground },
            props.multiline && {
              height: undefined,
              minHeight: 80,
              textAlignVertical: "top",
            },
            style,
          ]}
          scrollEnabled={props.multiline}
          placeholderTextColor={colors.mutedForeground}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={actualSecureTextEntry}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={handleTogglePassword}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.mutedForeground} strokeWidth={2} />
            ) : (
              <Eye size={20} color={colors.mutedForeground} strokeWidth={2} />
            )}
          </TouchableOpacity>
        ) : RightIconComponent ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RightIconComponent size={20} color={colors.mutedForeground} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  leftIcon: {
    marginRight: 10,
  },
  leftIconText: {
    fontSize: 18,
    marginRight: 10,
    lineHeight: 22,
  },
  rightIcon: {
    marginLeft: 10,
    padding: 4,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
