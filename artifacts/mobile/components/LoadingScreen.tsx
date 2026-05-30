import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function LoadingScreen() {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
        <Ionicons name="car-sport" size={40} color="white" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>ParkEase</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  loader: {
    marginTop: 24,
  },
});
