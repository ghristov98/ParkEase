import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function MapView({ style, children, initialRegion, region, ...props }: any) {
  return (
    <View
      style={[styles.placeholder, style]}
      {...props}
    >
      <Text style={styles.text}>Map not available on web</Text>
      {children}
    </View>
  );
}

export function Marker({ children }: any) {
  return children ?? null;
}

export function Polygon(_props: any) {
  return null;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#6B7399",
    fontSize: 14,
  },
});
