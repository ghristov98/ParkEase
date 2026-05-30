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
import { useRegister } from "@workspace/api-client-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const registerMutation = useRegister();

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password } = form;
    if (!firstName || !lastName || !email || !phone || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError(null);
    try {
      await registerMutation.mutateAsync({
        data: { firstName, lastName, email, phone, password },
      });
      router.push({
        pathname: "/(auth)/verify",
        params: { email },
      });
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Join ParkEase today for smarter parking
        </Text>

        <View style={styles.form}>
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "10" }]}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="First Name"
                placeholder="John"
                value={form.firstName}
                onChangeText={(text) => setForm({ ...form, firstName: text })}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Input
                label="Last Name"
                placeholder="Doe"
                value={form.lastName}
                onChangeText={(text) => setForm({ ...form, lastName: text })}
              />
            </View>
          </View>

          <Input
            label="Email Address"
            placeholder="john@example.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />

          <Input
            label="Phone Number"
            placeholder="+1 234 567 8900"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />

          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={registerMutation.isPending}
            fullWidth
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
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
    marginTop: 16,
    marginBottom: 32,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
