import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const SCREEN_W = Dimensions.get("window").width;
const SCENE_W = Math.min(SCREEN_W - 48, 320);
const SCENE_H = 170;

const ROAD_TOP = 112;
const ROAD_H = 42;
const ROAD_CENTER_Y = ROAD_TOP + ROAD_H / 2 - 16;

const BAY_X = SCENE_W * 0.68;
const BAY_W = 52;
const BAY_H = 86;
const BAY_TOP = ROAD_TOP - BAY_H;

const CAR_SIZE = 30;

const NUM_DASHES = 8;
const DASH_W = 20;
const DASH_GAP = SCENE_W / NUM_DASHES;

export function LoadingScreen() {
  const colors = useColors();

  const carX = useRef(new Animated.Value(-CAR_SIZE)).current;
  const carY = useRef(new Animated.Value(0)).current;
  const carRot = useRef(new Animated.Value(0)).current;
  const wheelSpin = useRef(new Animated.Value(0)).current;
  const dotOpacity1 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;

  const rotation = carRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-90deg"],
  });

  useEffect(() => {
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity1, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(dotOpacity2, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(dotOpacity3, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dotOpacity1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dotOpacity2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dotOpacity3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
      ])
    );
    dotLoop.start();

    const runCar = () => {
      carX.setValue(-CAR_SIZE);
      carY.setValue(0);
      carRot.setValue(0);
      wheelSpin.setValue(0);

      Animated.sequence([
        // Drive along road to bay entrance
        Animated.timing(carX, {
          toValue: BAY_X - CAR_SIZE / 2,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Turn and pull into bay
        Animated.parallel([
          Animated.timing(carRot, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(carY, {
            toValue: -(BAY_H - 6),
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Parked — pause
        Animated.delay(900),
        // Back out
        Animated.parallel([
          Animated.timing(carRot, {
            toValue: 0,
            duration: 450,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(carY, {
            toValue: 0,
            duration: 650,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Drive off screen right
        Animated.timing(carX, {
          toValue: SCENE_W + CAR_SIZE,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]).start(() => runCar());
    };

    runCar();

    return () => {
      dotLoop.stop();
      carX.stopAnimation();
      carY.stopAnimation();
      carRot.stopAnimation();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Brand */}
      <View style={styles.brand}>
        <LinearGradient colors={[colors.primary, "#3B6BF5"]} style={styles.logoBadge}>
          <Text style={styles.logoLetter}>P</Text>
        </LinearGradient>
        <Text style={[styles.appTitle, { color: colors.foreground }]}>ParkEase</Text>
        <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Smart Parking, Anywhere</Text>
      </View>

      {/* Animation scene */}
      <View style={[styles.scene, { width: SCENE_W, height: SCENE_H }]}>

        {/* Bay area background */}
        <View style={[styles.bayBg, { left: BAY_X, top: BAY_TOP, width: BAY_W, height: BAY_H, borderColor: colors.primary + "55" }]} />

        {/* P sign */}
        <View style={[styles.pSignWrap, { left: BAY_X + BAY_W / 2 - 14, top: BAY_TOP + 8 }]}>
          <LinearGradient colors={[colors.primary, "#3B6BF5"]} style={styles.pSign}>
            <Text style={styles.pText}>P</Text>
          </LinearGradient>
        </View>

        {/* Bay side lines */}
        <View style={[styles.bayLine, { left: BAY_X - 1, top: BAY_TOP, height: BAY_H, backgroundColor: colors.primary + "80" }]} />
        <View style={[styles.bayLine, { left: BAY_X + BAY_W, top: BAY_TOP, height: BAY_H, backgroundColor: colors.primary + "80" }]} />

        {/* Road */}
        <View style={[styles.road, { top: ROAD_TOP, height: ROAD_H, backgroundColor: "#4A5568" }]}>
          {/* Road edge lines */}
          <View style={[styles.roadEdge, { backgroundColor: "#F6C90E", top: 0 }]} />
          <View style={[styles.roadEdge, { backgroundColor: "#F6C90E", bottom: 0 }]} />
          {/* Center dashes */}
          {Array.from({ length: NUM_DASHES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dash,
                {
                  left: i * DASH_GAP + 4,
                  top: ROAD_H / 2 - 2,
                },
              ]}
            />
          ))}
        </View>

        {/* Car — positioned on road center, transforms drive it */}
        <Animated.Text
          style={[
            styles.car,
            {
              top: ROAD_CENTER_Y,
              transform: [
                { translateX: carX },
                { translateY: carY },
                { rotate: rotation },
              ],
            },
          ]}
        >
          🚗
        </Animated.Text>

        {/* Ground shadow */}
        <View style={[styles.ground, { top: ROAD_TOP + ROAD_H, backgroundColor: colors.muted }]} />
      </View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        <Text style={[styles.loadingLabel, { color: colors.mutedForeground }]}>Loading</Text>
        <Animated.Text style={[styles.dot, { color: colors.primary, opacity: dotOpacity1 }]}>●</Animated.Text>
        <Animated.Text style={[styles.dot, { color: colors.primary, opacity: dotOpacity2 }]}>●</Animated.Text>
        <Animated.Text style={[styles.dot, { color: colors.primary, opacity: dotOpacity3 }]}>●</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  brand: {
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E4BF1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoLetter: {
    color: "white",
    fontSize: 36,
    fontWeight: "800",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 13,
    fontWeight: "500",
  },
  scene: {
    position: "relative",
    overflow: "hidden",
  },
  road: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  roadEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  dash: {
    position: "absolute",
    width: DASH_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bayBg: {
    position: "absolute",
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(14,75,241,0.05)",
  },
  bayLine: {
    position: "absolute",
    width: 2.5,
    borderRadius: 2,
  },
  pSignWrap: {
    position: "absolute",
    zIndex: 2,
  },
  pSign: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  car: {
    position: "absolute",
    left: 0,
    fontSize: CAR_SIZE,
    lineHeight: CAR_SIZE + 4,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 2,
  },
  dot: {
    fontSize: 8,
  },
});
