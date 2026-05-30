import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useVerifyEmail } from "@workspace/api-client-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const verifyMutation = useVerifyEmail();

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setError(null);
    try {
      await verifyMutation.mutateAsync({
        data: { email: email!, code },
      });
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err.message || "Verification failed");
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
        <Text style={[styles.title, { color: colors.foreground }]}>Verify Email</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>{email}</Text>
        </Text>

        <View style={styles.form}>
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "10" }]}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <Input
            label="Verification Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.codeInput}
          />

          <Button
            title="Verify & Continue"
            onPress={handleVerify}
            loading={verifyMutation.isPending}
            fullWidth
            style={styles.submitButton}
          />

          <TouchableOpacity style={styles.resendButton}>
            <Text style={[styles.resendText, { color: colors.primary }]}>
              Didn't receive code? Resend
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
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
    marginTop: 16,
    marginBottom: 24,
  },
  resendButton: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
