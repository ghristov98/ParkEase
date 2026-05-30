import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useForgotPassword } from "@workspace/api-client-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const forgotMutation = useForgotPassword();

  const handleForgot = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setError(null);
    try {
      await forgotMutation.mutateAsync({
        data: { email },
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset instructions");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.headerActions, { top: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password</Text>
        
        {isSuccess ? (
          <View style={styles.successContainer}>
            <View style={[styles.successBadge, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="checkmark-circle" size={48} color="#166534" />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Instructions Sent!</Text>
            <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
              We've sent password reset instructions to{"\n"}
              <Text style={{ fontWeight: "600", color: colors.foreground }}>{email}</Text>
            </Text>
            <Button
              variant="outline"
              title="Back to Login"
              onPress={() => router.replace("/(auth)/login")}
              fullWidth
              style={styles.backToLoginButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "10" }]}>
                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleForgot}
              loading={forgotMutation.isPending}
              fullWidth
              style={styles.submitButton}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  successContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  successBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 40,
  },
  backToLoginButton: {
    marginTop: 16,
  },
});
