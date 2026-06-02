import { Ionicons } from "@expo/vector-icons";
import { getGetParkingLotsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MapView, Marker } from "@/components/NativeMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const INITIAL_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const [region, setRegion] = useState(INITIAL_REGION);
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: parkingLots, isLoading } = useQuery(
    getGetParkingLotsQueryOptions({ search: search || undefined })
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted");
        if (status === "granted") {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          } catch {
            // Location hardware unavailable (simulator/web) — keep default region
          }
        }
      } catch {
        // Permission API unavailable — keep default region
      }
    })();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.webHeader}>
          <Text style={[styles.webTitle, { color: colors.foreground }]}>Parking Lots</Text>
          <Input
            placeholder="Search parking lots..."
            value={search}
            onChangeText={setSearch}
            leftIconText="🔍"
          />
        </View>
        <FlatList
          data={parkingLots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.webList}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/parking/${item.id}`)}>
              <Card style={styles.lotCard}>
                <View style={styles.lotHeader}>
                  <Text style={[styles.lotName, { color: colors.foreground }]}>{item.name}</Text>
                  <Badge
                    label={item.type}
                    variant={item.type === "free" ? "free" : "paid"}
                  />
                </View>
                <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>
                  {item.address}
                </Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.mutedForeground }}>No parking lots found</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!locationPermission}
      >
        {parkingLots?.map((lot) => (
          <Marker
            key={lot.id}
            coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
            onPress={() => setSelectedLot(lot)}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor:
                    lot.type === "free" ? colors.parkingFree : colors.parkingPaid,
                },
              ]}
            >
              <Ionicons name="car" size={16} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.floatingSearch, { top: insets.top + 10 }]}>
        <Input
          placeholder="Search locations..."
          value={search}
          onChangeText={setSearch}
          leftIconText="🔍"
          style={styles.searchInput}
        />
      </View>

      <Card style={{ ...styles.legend, top: insets.top + 80 }}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.parkingFree }]} />
          <Text style={styles.legendText}>Free</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.parkingPaid }]} />
          <Text style={styles.legendText}>Paid</Text>
        </View>
      </Card>

      {selectedLot && (
        <View style={[styles.bottomSheet, { bottom: 100 + insets.bottom }]}>
          <Card padding={false}>
            <TouchableOpacity
              onPress={() => setSelectedLot(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={{ padding: 16 }}>
              <View style={styles.lotHeader}>
                <Text style={[styles.lotName, { color: colors.foreground }]}>
                  {selectedLot.name}
                </Text>
                <Badge
                  label={selectedLot.type}
                  variant={selectedLot.type === "free" ? "free" : "paid"}
                />
              </View>
              <Text style={[styles.lotAddress, { color: colors.mutedForeground }]}>
                {selectedLot.address}
              </Text>
              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/parking/${selectedLot.id}`)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {user?.role === "superadmin" && (
        <TouchableOpacity
          style={[styles.adminFab, { bottom: 100 + insets.bottom, backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin")}
        >
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingSearch: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: "white",
    height: 50,
  },
  legend: {
    position: "absolute",
    right: 16,
    width: 80,
    zIndex: 10,
    padding: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 30,
  },
  lotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  lotName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  lotAddress: {
    fontSize: 14,
    marginBottom: 16,
  },
  detailsButton: {
    flexDirection: "row",
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  adminFab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },
  webHeader: {
    padding: 16,
    gap: 16,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  webList: {
    padding: 16,
    gap: 12,
  },
  lotCard: {
    marginBottom: 4,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
});
