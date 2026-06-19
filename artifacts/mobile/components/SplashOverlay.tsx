import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

interface SplashOverlayProps {
  isReady: boolean;
}

export const SplashOverlay = memo(function SplashOverlay({ isReady }: SplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const logoScale = useRef(new Animated.Value(0.78)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const readyRef = useRef(false);
  const timerFiredRef = useRef(false);

  const dismiss = useCallback(() => {
    if (!readyRef.current || !timerFiredRef.current) return;
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [containerOpacity]);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 2-second minimum hold
    const timer = setTimeout(() => {
      timerFiredRef.current = true;
      dismiss();
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady) {
      readyRef.current = true;
      dismiss();
    }
  }, [isReady, dismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      pointerEvents="none"
    >
      <LinearGradient colors={["#F5F7FF", "#EEF1FD"]} style={styles.bg} />
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, alignItems: "center", gap: 16 }}>
        <LinearGradient
          colors={["#0E4BF1", "#3B6BF5"]}
          style={styles.logoBadge}
        >
          <Text style={styles.logoLetter}>P</Text>
        </LinearGradient>
        <Text style={styles.appName}>ParkEase</Text>
        <Text style={styles.tagline}>Smart Parking, Anywhere</Text>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: W,
    height: H,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E4BF1",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  logoLetter: {
    color: "white",
    fontSize: 44,
    fontWeight: "800",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0A0A1A",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#6B7399",
    fontWeight: "500",
  },
});
