import { usePathname } from "expo-router";
import React, { memo, useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const W = Dimensions.get("window").width;

export const RouteProgressBar = memo(function RouteProgressBar() {
  const colors = useColors();
  const pathname = usePathname();
  const progress = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Reset and start
    progress.setValue(0);
    barOpacity.setValue(1);

    Animated.sequence([
      // Rush to 75%
      Animated.timing(progress, {
        toValue: 0.75,
        duration: 280,
        useNativeDriver: false,
      }),
      // Creep to 90%
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: false,
      }),
      // Finish to 100%
      Animated.timing(progress, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }),
      // Fade out
      Animated.timing(barOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => progress.setValue(0));
  }, [pathname]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, W],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            backgroundColor: colors.primary,
            opacity: barOpacity,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    height: 3,
  },
  bar: {
    height: 3,
    borderRadius: 0,
  },
});
