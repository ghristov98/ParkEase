import {
  getGetParkingLotsQueryOptions,
  getGetVehiclesQueryOptions,
  useCreateParkingLot,
  useDeleteParkingLot,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  Car,
  Heart,
  MapPin,
  Minus,
  Navigation,
  PlayCircle,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MapView, Marker, Polygon } from "@/components/NativeMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  checkZone,
  getZonePolygons,
  getParkingMachines,
  getMapCenter,
  ZoneResult,
  ZonePolygon,
} from "@/services/ZoneService";
import LocationWatcher from "@/services/LocationWatcher";
import Svg, {
  Polygon as SvgPolygon,
  Rect,
  Text as SvgText,
  Circle,
} from "react-native-svg";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/contexts/ToastContext";
import {
  municipalParkings,
  OFFICIAL_PENALTY,
  type MunicipalParking,
} from "@/data/municipalParkings";

// ---------------------------------------------------------------------------
// City config
// ---------------------------------------------------------------------------

interface CityConfig {
  id: string;
  label: string;
  center: { latitude: number; longitude: number };
  delta: { latitudeDelta: number; longitudeDelta: number };
}

const CITIES: CityConfig[] = [
  {
    id: "burgas",
    label: "Burgas",
    center: { latitude: 42.495278, longitude: 27.471667 },
    delta: { latitudeDelta: 0.05, longitudeDelta: 0.05 },
  },
];

// ---------------------------------------------------------------------------
// Filter toggles
// ---------------------------------------------------------------------------

interface FilterState {
  blueZone: boolean;
  greenZone: boolean;
  parkingMachines: boolean;
  freeParking: boolean;
  paidParking: boolean;
  penaltyParking: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  blueZone: true,
  greenZone: true,
  parkingMachines: false,
  freeParking: false,
  paidParking: false,
  penaltyParking: false,
};

// ---------------------------------------------------------------------------
// Penalty marker
// ---------------------------------------------------------------------------

interface PenaltyMarker {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  note: string;
}

const PENALTY_STORAGE_KEY = "parkease_penalty_markers";
const FAVOURITES_KEY = "parkease_favourites";

// ---------------------------------------------------------------------------
// Sheet item union type
// ---------------------------------------------------------------------------

type SheetItem =
  | { type: "lot"; data: any }
  | {
      type: "zone";
      data: {
        zone: ZonePolygon;
        zoneInfo: ZoneResult;
        coord: { latitude: number; longitude: number };
      };
    }
  | { type: "municipal"; data: MunicipalParking }
  | { type: "officialPenalty"; data: MunicipalParking };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAP_CENTER = getMapCenter();
const NEARBY_THRESHOLD_M = 300;
const BASE_URL = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
const AMENITIES = [
  { key: "hasSecurityGuard", label: "Security Guard", emoji: "💂" },
  { key: "hasCCTV", label: "CCTV Cameras", emoji: "📷" },
  { key: "hasLighting", label: "Lighting", emoji: "💡" },
  { key: "isCovered", label: "Covered", emoji: "🏠" },
  { key: "hasEVCharging", label: "EV Charging", emoji: "⚡" },
  { key: "hasDisabledAccess", label: "Disabled Access", emoji: "♿" },
] as const;
type AmenityKey = (typeof AMENITIES)[number]["key"];

interface AddForm {
  name: string;
  type: "free" | "paid";
  description: string;
  openingHours: string;
  amenities: Record<AmenityKey, boolean>;
  photos: string[];
  mainPhotoIndex: number;
}

const DEFAULT_FORM: AddForm = {
  name: "",
  type: "free",
  description: "",
  openingHours: "",
  amenities: {
    hasSecurityGuard: false,
    hasCCTV: false,
    hasLighting: false,
    isCovered: false,
    hasEVCharging: false,
    hasDisabledAccess: false,
  },
  photos: [],
  mainPhotoIndex: 0,
};

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)}m away`
    : `${(meters / 1000).toFixed(1)}km away`;
}

const ZONE_POLYGONS = getZonePolygons();
const PARKING_MACHINES = getParkingMachines();

function detectCity(lat: number, lng: number): CityConfig {
  const named = CITIES.filter((c) => c.id !== "full");
  let best = named[0];
  let bestDist = Infinity;
  for (const city of named) {
    const d = getDistanceMeters(
      lat,
      lng,
      city.center.latitude,
      city.center.longitude
    );
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// SVG Marker components — crisp at all zoom levels
// ---------------------------------------------------------------------------

const ParkingLotSvgMarker = React.memo(
  ({ type }: { type: "free" | "paid" }) => {
    const color = type === "free" ? "#22C55E" : "#F97316";
    return (
      <Svg width={38} height={45} viewBox="0 0 38 45">
        <Rect
          x={2}
          y={2}
          width={34}
          height={34}
          rx={7}
          ry={7}
          fill="white"
          stroke={color}
          strokeWidth={2.5}
        />
        <SvgText
          x={19}
          y={25}
          textAnchor="middle"
          fontSize={19}
          fontWeight="bold"
          fill={color}
        >
          P
        </SvgText>
        {/* Downward pointer */}
        <SvgPolygon points="14,34 24,34 19,44" fill={color} />
      </Svg>
    );
  }
);

const PenaltyMarkerSvg = React.memo(() => (
  <Svg width={40} height={38} viewBox="0 0 40 38">
    <SvgPolygon
      points="20,2 38,36 2,36"
      fill="#EF4444"
      stroke="white"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <SvgText
      x={20}
      y={30}
      textAnchor="middle"
      fontSize={16}
      fill="white"
      fontWeight="bold"
    >
      ⚠
    </SvgText>
  </Svg>
));

// Blue rounded-rectangle with white "P" — municipal paid parking
// Canvas is larger than the visible shape so stroke/shadow never clips
const MunicipalParkingSvgMarker = React.memo(() => (
  <Svg width={44} height={54} viewBox="0 0 44 54" style={{ overflow: "visible" }}>
    <Rect x={4} y={3} width={36} height={36} rx={8} ry={8} fill="#3B5BDB" stroke="#2F4BC4" strokeWidth={2} />
    <SvgText x={22} y={28} textAnchor="middle" fontSize={20} fontWeight="bold" fill="white">
      P
    </SvgText>
    <SvgPolygon points="16,37 28,37 22,52" fill="#3B5BDB" />
  </Svg>
));

// Official penalty — red circle with white ⚠, white ring border
// Smaller radii ensure the ring + stroke never clips at the SVG edge
const OfficialPenaltySvgMarker = React.memo(() => (
  <Svg width={50} height={50} viewBox="0 0 50 50" style={{ overflow: "visible" }}>
    <Circle cx={25} cy={25} r={22} fill="white" />
    <Circle cx={25} cy={25} r={19} fill="#EF4444" />
    <SvgText x={25} y={33} textAnchor="middle" fontSize={21} fill="white" fontWeight="bold">
      ⚠
    </SvgText>
  </Svg>
));

const VehicleSvgMarker = React.memo(({ primaryColor }: { primaryColor: string }) => (
  <Svg width={44} height={44} viewBox="0 0 44 44">
    <Circle cx={22} cy={22} r={20} fill="white" stroke={primaryColor} strokeWidth={2.5} />
    <SvgPolygon
      points="10,27 10,22 13,16 31,16 34,22 34,27"
      fill={primaryColor}
      stroke={primaryColor}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    {/* Cabin */}
    <SvgPolygon
      points="15,16 16,11 28,11 29,16"
      fill={primaryColor}
      strokeLinejoin="round"
    />
    {/* Left wheel */}
    <Circle cx={15} cy={27} r={4} fill="white" stroke={primaryColor} strokeWidth={1.5} />
    {/* Right wheel */}
    <Circle cx={29} cy={27} r={4} fill="white" stroke={primaryColor} strokeWidth={1.5} />
  </Svg>
));

// ---------------------------------------------------------------------------
// Drop animation wrapper — bounce landing from above
// ---------------------------------------------------------------------------

const AnimatedDropMarker = React.memo(({ children }: { children: React.ReactNode }) => {
  const drop = useRef(new Animated.Value(-55)).current;
  useEffect(() => {
    Animated.spring(drop, {
      toValue: 0,
      useNativeDriver: true,
      tension: 55,
      friction: 6,
    }).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY: drop }] }}>
      {children}
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Memoized map marker components
// ---------------------------------------------------------------------------

const ParkingLotMarker = React.memo(({ lot, onPress }: any) => (
  <Marker
    coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
    onPress={onPress}
    anchor={{ x: 0.5, y: 1 }}
  >
    <AnimatedDropMarker>
      <ParkingLotSvgMarker type={lot.type} />
    </AnimatedDropMarker>
  </Marker>
));

const MachineMarker = React.memo(({ lat, lng }: { lat: number; lng: number }) => (
  <Marker coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.machineMarker}>
      <Text style={styles.machineEmoji}>💲</Text>
    </View>
  </Marker>
));

const PenaltyMarkerComponent = React.memo(
  ({ marker, onPress }: { marker: PenaltyMarker; onPress: () => void }) => (
    <Marker
      coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
      onPress={onPress}
    >
      <AnimatedDropMarker>
        <PenaltyMarkerSvg />
      </AnimatedDropMarker>
    </Marker>
  )
);

const MunicipalParkingMarkerComponent = React.memo(
  ({ parking, onPress }: { parking: MunicipalParking; onPress: () => void }) => (
    <Marker
      coordinate={{ latitude: parking.lat, longitude: parking.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
    >
      <AnimatedDropMarker>
        <MunicipalParkingSvgMarker />
      </AnimatedDropMarker>
    </Marker>
  )
);

const OfficialPenaltyMarkerComponent = React.memo(
  ({ onPress }: { onPress: () => void }) => {
    const pulseAnim = useRef(new Animated.Value(0.85)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);
    return (
      <Marker
        coordinate={{ latitude: OFFICIAL_PENALTY.lat, longitude: OFFICIAL_PENALTY.lng }}
        onPress={onPress}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={999}
      >
        {/* Padding wrapper gives the scaled animation room to breathe without clipping */}
        <View style={{ padding: 14, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <OfficialPenaltySvgMarker />
          </Animated.View>
        </View>
      </Marker>
    );
  }
);

// ---------------------------------------------------------------------------
// Sheet geometry — two snap points (collapsed ≈ 38 %, expanded ≈ 75 %)
// ---------------------------------------------------------------------------

const _SCREEN_H = Dimensions.get("window").height;
const SHEET_FULL_H = Math.round(_SCREEN_H * 0.75);
const SHEET_COLLAPSED_OFFSET = Math.round(SHEET_FULL_H - _SCREEN_H * 0.38);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function MapScreen() {
  const [region, setRegion] = useState({
    latitude: MAP_CENTER.lat,
    longitude: MAP_CENTER.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [search, setSearch] = useState("");
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [zoneResult, setZoneResult] = useState<ZoneResult>({ zone: null });
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const [selectedCity, setSelectedCity] = useState("burgas");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const [nearbyMachinesCoord, setNearbyMachinesCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [penaltyMarkers, setPenaltyMarkers] = useState<PenaltyMarker[]>([]);
  const [penaltyMode, setPenaltyMode] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyMarker | null>(null);
  const [penaltyNote, setPenaltyNote] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zonePulse, setZonePulse] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());

  const mapRef = useRef<any>(null);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Sheet animation — two snap points + closed
  // sheetSnapAnim holds the actual translateY value directly
  const sheetSnapAnim = useRef(new Animated.Value(SHEET_FULL_H)).current;
  const sheetPanY = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(Animated.add(sheetSnapAnim, sheetPanY)).current;
  const sheetSnapRef = useRef<"collapsed" | "expanded">("collapsed");
  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "expanded">("collapsed");

  // Stable refs so PanResponder can always call the latest functions
  const closeSheetRef = useRef<() => void>(() => {});
  const snapSheetRef = useRef<(to: "collapsed" | "expanded" | "close") => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        sheetPanY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        sheetPanY.setValue(0);
        const swipedDown = g.dy > 80 || g.vy > 0.8;
        const swipedUp = g.dy < -60 || g.vy < -0.6;
        if (swipedDown) {
          if (sheetSnapRef.current === "expanded") {
            snapSheetRef.current("collapsed");
          } else {
            closeSheetRef.current();
          }
        } else if (swipedUp && sheetSnapRef.current === "collapsed") {
          snapSheetRef.current("expanded");
        } else {
          Animated.spring(sheetPanY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const { user, accessToken } = useAuth();
  const colors = useColors();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showError, showInfo, showConfirm } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createMutation = useCreateParkingLot();
  const deleteMutation = useDeleteParkingLot();
  const isSuperAdmin = user?.role === "superadmin";

  const { data: parkingLots } = useQuery(
    getGetParkingLotsQueryOptions({ search: search || undefined })
  );
  const { data: userVehicles } = useQuery(getGetVehiclesQueryOptions());

  const vehicleMarkers = useMemo(
    () =>
      (userVehicles ?? []).filter(
        (v: any) => v.latitude != null && v.longitude != null
      ),
    [userVehicles]
  );

  // Derived: selectedLot for backwards-compat with sessionFab logic
  const selectedLot = sheetItem?.type === "lot" ? sheetItem.data : null;

  // ---------------------------------------------------------------------------
  // Sheet open / close
  // ---------------------------------------------------------------------------

  const openSheet = useCallback(
    (item: SheetItem) => {
      setSheetItem(item);
      sheetSnapRef.current = "collapsed";
      setSheetSnap("collapsed");
      sheetSnapAnim.setValue(SHEET_FULL_H);
      sheetPanY.setValue(0);
      Animated.spring(sheetSnapAnim, {
        toValue: SHEET_COLLAPSED_OFFSET,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    },
    [sheetSnapAnim, sheetPanY]
  );

  const closeSheet = useCallback(() => {
    Animated.timing(sheetSnapAnim, {
      toValue: SHEET_FULL_H,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSheetItem(null);
      setSelectedZoneId(null);
      sheetPanY.setValue(0);
      sheetSnapRef.current = "collapsed";
    });
  }, [sheetSnapAnim, sheetPanY]);

  // Keep ref current so PanResponder always calls latest closeSheet
  closeSheetRef.current = closeSheet;
  snapSheetRef.current = (to) => {
    if (to === "close") { closeSheet(); return; }
    sheetSnapRef.current = to;
    setSheetSnap(to);
    Animated.spring(sheetSnapAnim, {
      toValue: to === "expanded" ? 0 : SHEET_COLLAPSED_OFFSET,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  // ---------------------------------------------------------------------------
  // Zone pulse animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedZoneId) {
      setZonePulse(false);
      return;
    }
    const timer = setInterval(() => setZonePulse((v) => !v), 650);
    return () => clearInterval(timer);
  }, [selectedZoneId]);

  // ---------------------------------------------------------------------------
  // Favourites
  // ---------------------------------------------------------------------------

  useEffect(() => {
    AsyncStorage.getItem(FAVOURITES_KEY)
      .then((val) => {
        if (val) setFavouriteIds(new Set(JSON.parse(val)));
      })
      .catch(() => {});
  }, []);

  const toggleFavourite = useCallback((id: string) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Load penalty markers from storage
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PENALTY_STORAGE_KEY);
        if (stored) setPenaltyMarkers(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const savePenaltyMarkers = useCallback(async (markers: PenaltyMarker[]) => {
    setPenaltyMarkers(markers);
    try {
      await AsyncStorage.setItem(PENALTY_STORAGE_KEY, JSON.stringify(markers));
    } catch {
      /* ignore */
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Filter panel animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: filterOpen ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [filterOpen]);

  // ---------------------------------------------------------------------------
  // City change
  // ---------------------------------------------------------------------------

  const handleCityChange = useCallback((cityId: string) => {
    setSelectedCity(cityId);
    const city = CITIES.find((c) => c.id === cityId);
    if (city) {
      setRegion({
        latitude: city.center.latitude,
        longitude: city.center.longitude,
        latitudeDelta: city.delta.latitudeDelta,
        longitudeDelta: city.delta.longitudeDelta,
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Filtered data
  // ---------------------------------------------------------------------------

  const filteredZones = useMemo(
    () => ZONE_POLYGONS.filter(
      (z) => (z.type === "blue" && filters.blueZone) || (z.type === "green" && filters.greenZone)
    ),
    [filters.blueZone, filters.greenZone]
  );

  const filteredMachines = useMemo(() => {
    if (nearbyMachinesCoord) {
      return PARKING_MACHINES.filter(
        (m) =>
          getDistanceMeters(
            nearbyMachinesCoord.latitude,
            nearbyMachinesCoord.longitude,
            m.lat,
            m.lng
          ) <= 500
      );
    }
    return filters.parkingMachines ? PARKING_MACHINES : [];
  }, [filters.parkingMachines, nearbyMachinesCoord]);

  const filteredParkingLots = useMemo(() => {
    const lots = (parkingLots ?? []) as any[];
    const cityFiltered =
      selectedCity === "full"
        ? lots
        : lots.filter((lot: any) => {
            const city = CITIES.find((c) => c.id === selectedCity);
            if (!city || lot.latitude == null || lot.longitude == null) return true;
            return (
              getDistanceMeters(
                lot.latitude,
                lot.longitude,
                city.center.latitude,
                city.center.longitude
              ) <= 50000
            );
          });
    return cityFiltered.filter((lot: any) =>
      lot.type === "free"
        ? filters.freeParking
        : lot.type === "paid"
        ? filters.paidParking
        : true
    );
  }, [parkingLots, filters.freeParking, filters.paidParking, selectedCity]);

  const filteredPenaltyMarkers = useMemo(
    () => (filters.penaltyParking ? penaltyMarkers : []),
    [filters.penaltyParking, penaltyMarkers]
  );

  const filteredMunicipalParkings = useMemo(
    () => (filters.paidParking ? municipalParkings : []),
    [filters.paidParking]
  );

  const hasActiveFilters = useMemo(
    () =>
      !filters.blueZone ||
      !filters.greenZone ||
      filters.parkingMachines ||
      filters.freeParking ||
      filters.paidParking ||
      filters.penaltyParking,
    [filters]
  );

  // ---------------------------------------------------------------------------
  // Location permission + initial position
  // ---------------------------------------------------------------------------

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
            const { latitude, longitude } = location.coords;
            userLocationRef.current = { latitude, longitude };
            const nearestCity = detectCity(latitude, longitude);
            setSelectedCity(nearestCity.id);
            setRegion({
              latitude,
              longitude,
              latitudeDelta: nearestCity.delta.latitudeDelta,
              longitudeDelta: nearestCity.delta.longitudeDelta,
            });
            const initial = checkZone(latitude, longitude);
            setZoneResult(initial);
          } catch {
            /* keep default */
          }
        }
      } catch {
        /* keep default */
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const watcher = LocationWatcher.getInstance();
    const unsub = watcher.subscribe((result) => {
      setZoneResult(result);
    });
    watcher.start();
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    Animated.spring(bannerAnim, {
      toValue: zoneResult.zone ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [zoneResult.zone]);

  // ---------------------------------------------------------------------------
  // Nearby lot detection (for superadmin long-press)
  // ---------------------------------------------------------------------------

  const nearbyLot = longPressCoord
    ? (parkingLots ?? []).find(
        (lot: any) =>
          getDistanceMeters(
            longPressCoord.latitude,
            longPressCoord.longitude,
            lot.latitude,
            lot.longitude
          ) <= NEARBY_THRESHOLD_M
      ) ?? null
    : null;

  // ---------------------------------------------------------------------------
  // Map control handlers
  // ---------------------------------------------------------------------------

  const handleZoomIn = useCallback(() => {
    setRegion((r) => {
      const newRegion = {
        ...r,
        latitudeDelta: Math.max(r.latitudeDelta / 2, 0.001),
        longitudeDelta: Math.max(r.longitudeDelta / 2, 0.001),
      };
      mapRef.current?.animateToRegion(newRegion, 300);
      return newRegion;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setRegion((r) => {
      const newRegion = {
        ...r,
        latitudeDelta: Math.min(r.latitudeDelta * 2, 80),
        longitudeDelta: Math.min(r.longitudeDelta * 2, 80),
      };
      mapRef.current?.animateToRegion(newRegion, 300);
      return newRegion;
    });
  }, []);

  const handleCenterOnUser = useCallback(async () => {
    if (!locationPermission) return;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      userLocationRef.current = { latitude, longitude };
      const newRegion = { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
    } catch {
      /* ignore */
    }
  }, [locationPermission]);

  const handleNavigate = useCallback(
    (latitude: number, longitude: number, name: string) => {
      const label = encodeURIComponent(name);
      const url =
        Platform.OS === "ios"
          ? `maps:0,0?q=${label}@${latitude},${longitude}`
          : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
      });
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Long-press & penalty handlers
  // ---------------------------------------------------------------------------

  const handleLongPress = useCallback(
    (e: any) => {
      if (!isSuperAdmin) return;
      const coord = e.nativeEvent.coordinate;
      if (penaltyMode) {
        const newMarker: PenaltyMarker = {
          id: `penalty-${Date.now()}`,
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: Date.now(),
          note: "",
        };
        savePenaltyMarkers([...penaltyMarkers, newMarker]);
        return;
      }
      setLongPressCoord(coord);
      setAddForm(DEFAULT_FORM);
      closeSheet();
    },
    [isSuperAdmin, penaltyMode, penaltyMarkers, savePenaltyMarkers, closeSheet]
  );

  const handlePenaltyPress = useCallback((marker: PenaltyMarker) => {
    setSelectedPenalty(marker);
    setPenaltyNote(marker.note);
  }, []);

  const handleSavePenaltyNote = useCallback(() => {
    if (!selectedPenalty) return;
    const updated = penaltyMarkers.map((m) =>
      m.id === selectedPenalty.id ? { ...m, note: penaltyNote } : m
    );
    savePenaltyMarkers(updated);
    setSelectedPenalty(null);
  }, [selectedPenalty, penaltyNote, penaltyMarkers, savePenaltyMarkers]);

  const handleDeletePenalty = useCallback(() => {
    if (!selectedPenalty) return;
    const updated = penaltyMarkers.filter((m) => m.id !== selectedPenalty.id);
    savePenaltyMarkers(updated);
    setSelectedPenalty(null);
  }, [selectedPenalty, penaltyMarkers, savePenaltyMarkers]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setAddForm((f) => ({ ...f, photos: [...f.photos, ...uris] }));
    }
  };

  const uploadPhoto = async (lotId: string, uri: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("photo", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);
    try {
      const resp = await fetch(`${BASE_URL}/api/parking/${lotId}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.url as string;
    } catch {
      return null;
    }
  };

  const handleAddPark = async () => {
    if (!addForm.name.trim() || !longPressCoord) return;
    setIsSaving(true);
    try {
      const lot = await createMutation.mutateAsync({
        data: {
          name: addForm.name.trim(),
          address: `${longPressCoord.latitude.toFixed(5)}, ${longPressCoord.longitude.toFixed(5)}`,
          latitude: longPressCoord.latitude,
          longitude: longPressCoord.longitude,
          type: addForm.type,
          description: addForm.description.trim() || undefined,
          ...addForm.amenities,
          openingHours: addForm.openingHours || undefined,
        } as any,
      });

      if (addForm.photos.length > 0) {
        for (const uri of addForm.photos) {
          await uploadPhoto(lot.id, uri);
        }
        if (addForm.mainPhotoIndex !== 0) {
          await fetch(`${BASE_URL}/api/parking/${lot.id}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mainPhotoIndex: addForm.mainPhotoIndex }),
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["getParkingLots"] });
      setLongPressCoord(null);
    } catch (err: any) {
      showError(err.message || "Failed to add parking lot");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePark = () => {
    if (!nearbyLot) return;
    showConfirm({
      title: "Remove Parking Lot",
      message: `Remove "${nearbyLot.name}" from the map?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: async () => {
        setIsRemoving(true);
        try {
          await deleteMutation.mutateAsync({ id: nearbyLot.id });
          await queryClient.invalidateQueries({ queryKey: ["getParkingLots"] });
          setLongPressCoord(null);
        } catch (err: any) {
          showError(err.message || "Failed to remove");
        } finally {
          setIsRemoving(false);
        }
      },
    });
  };

  const toggleAmenity = (key: AmenityKey) => {
    setAddForm((f) => ({
      ...f,
      amenities: { ...f.amenities, [key]: !f.amenities[key] },
    }));
  };

  const toggleFilter = (key: keyof FilterState) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  // ---------------------------------------------------------------------------
  // Web fallback
  // ---------------------------------------------------------------------------

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.webHeader}>
          <Text style={[styles.webTitle, { color: colors.foreground }]}>
            Parking Lots
          </Text>
          <Input
            placeholder="Search parking lots..."
            value={search}
            onChangeText={setSearch}
            leftIcon={Search}
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
                  <Text style={[styles.lotName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
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
              <Text style={{ color: colors.mutedForeground }}>
                No parking lots found
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Sheet content helpers
  // ---------------------------------------------------------------------------

  const sheetDistanceText = useMemo(() => {
    if (!userLocationRef.current || !sheetItem) return null;
    if (sheetItem.type === "lot") {
      const { latitude, longitude } = sheetItem.data;
      if (latitude == null || longitude == null) return null;
      const d = getDistanceMeters(
        userLocationRef.current.latitude,
        userLocationRef.current.longitude,
        latitude,
        longitude
      );
      return formatDistance(d);
    }
    if (sheetItem.type === "zone") {
      const { coord } = sheetItem.data;
      const d = getDistanceMeters(
        userLocationRef.current.latitude,
        userLocationRef.current.longitude,
        coord.latitude,
        coord.longitude
      );
      return formatDistance(d);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetItem]);

  // ---------------------------------------------------------------------------
  // Main JSX
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!locationPermission}
        showsCompass={false}
        zoomControlEnabled={false}
        toolbarEnabled={false}
        onLongPress={handleLongPress}
        onPress={() => {
          if (filterOpen) setFilterOpen(false);
        }}
      >
        {/* Zone polygons — tappable with highlight */}
        {filteredZones.map((z: ZonePolygon) => {
          const isSelected = z.id === selectedZoneId;
          const fillColor = isSelected
            ? z.type === "blue"
              ? zonePulse
                ? "rgba(14,75,241,0.42)"
                : "rgba(14,75,241,0.26)"
              : zonePulse
              ? "rgba(34,197,94,0.42)"
              : "rgba(34,197,94,0.26)"
            : z.type === "blue"
            ? "rgba(59,107,245,0.18)"
            : "rgba(34,197,94,0.13)";
          const strokeColor = isSelected
            ? z.type === "blue"
              ? "rgba(14,75,241,1.0)"
              : "rgba(34,197,94,1.0)"
            : z.type === "blue"
            ? "rgba(14,75,241,0.7)"
            : "rgba(34,197,94,0.7)";
          return (
            <Polygon
              key={z.id}
              coordinates={z.coordinates}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={isSelected ? 3.5 : 2}
              tappable
              onPress={(e: any) => {
                const coord = e.nativeEvent.coordinate;
                const zoneInfo = checkZone(coord.latitude, coord.longitude);
                setSelectedZoneId(z.id);
                openSheet({ type: "zone", data: { zone: z, zoneInfo, coord } });
              }}
            />
          );
        })}

        {/* Parking machine markers */}
        {filteredMachines.map(
          (m: { lat: number; lng: number; title: string }, i: number) => (
            <MachineMarker key={`machine-${i}`} lat={m.lat} lng={m.lng} />
          )
        )}

        {/* Parking lot markers */}
        {filteredParkingLots.map((lot: any) => (
          <ParkingLotMarker
            key={lot.id}
            lot={lot}
            onPress={() => {
              openSheet({ type: "lot", data: lot });
              setLongPressCoord(null);
            }}
          />
        ))}

        {/* Vehicle location markers */}
        {vehicleMarkers.map((v: any) => (
          <Marker
            key={`vehicle-${v.id}`}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <AnimatedDropMarker>
              <VehicleSvgMarker primaryColor={colors.primary} />
            </AnimatedDropMarker>
          </Marker>
        ))}

        {/* Municipal paid parking markers (shown when paidParking filter is on) */}
        {filteredMunicipalParkings.map((parking) => (
          <MunicipalParkingMarkerComponent
            key={parking.id}
            parking={parking}
            onPress={() => openSheet({ type: "municipal", data: parking })}
          />
        ))}

        {/* Official penalty parking — always visible, highest zIndex */}
        <OfficialPenaltyMarkerComponent
          onPress={() => openSheet({ type: "officialPenalty", data: OFFICIAL_PENALTY })}
        />

        {/* User-placed penalty markers */}
        {filteredPenaltyMarkers.map((marker) => (
          <PenaltyMarkerComponent
            key={marker.id}
            marker={marker}
            onPress={() => handlePenaltyPress(marker)}
          />
        ))}

        {longPressCoord && (
          <Marker coordinate={longPressCoord} anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.pinEmoji}>📍</Text>
          </Marker>
        )}
      </MapView>

      {/* -------------------------------------------------------------------- */}
      {/* Floating search + city selector                                       */}
      {/* -------------------------------------------------------------------- */}

      <View style={[styles.floatingSearch, { top: insets.top + 10 }]}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search locations..."
            value={search}
            onChangeText={setSearch}
            leftIcon={Search}
            style={[styles.searchInput, { flex: 1 }]}
          />
        </View>

        {/* City selector — only shown when multiple cities available */}
        {CITIES.length > 1 && (
          <View style={[styles.citySelector, { backgroundColor: colors.card }]}>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[
                  styles.citySegment,
                  selectedCity === city.id && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleCityChange(city.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.citySegmentText,
                    { color: selectedCity === city.id ? "#FFF" : colors.foreground },
                  ]}
                >
                  {city.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* -------------------------------------------------------------------- */}
      {/* Filter panel — compact floating card, bottom-right                  */}
      {/* -------------------------------------------------------------------- */}

      <Animated.View
        style={[
          styles.filterPanel,
          {
            bottom: 100 + insets.bottom + 56,
            transform: [
              {
                translateY: filterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [320, 0],
                }),
              },
            ],
            opacity: filterAnim,
          },
        ]}
        pointerEvents={filterOpen ? "auto" : "none"}
      >
        <View style={[styles.filterPanelInner, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: colors.foreground }]}>
              Map Filters
            </Text>
            <Pressable
              onPress={() => setFilterOpen(false)}
              style={({ pressed }) => [styles.filterCloseBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <X size={16} color={colors.mutedForeground} strokeWidth={2.5} />
            </Pressable>
          </View>

          <FilterToggle
            label="🔵 Blue Zone"
            active={filters.blueZone}
            onPress={() => toggleFilter("blueZone")}
          />
          <FilterToggle
            label="🟢 Green Zone"
            active={filters.greenZone}
            onPress={() => toggleFilter("greenZone")}
          />
          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />
          <FilterToggle
            label="🅿️ Parking Machines"
            active={filters.parkingMachines}
            onPress={() => toggleFilter("parkingMachines")}
          />
          <FilterToggle
            label="💳 Paid Parking"
            active={filters.paidParking}
            onPress={() => toggleFilter("paidParking")}
          />
          <FilterToggle
            label="🆓 Free Parking"
            active={filters.freeParking}
            onPress={() => toggleFilter("freeParking")}
          />
          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />
          <FilterToggle
            label="🚫 Penalty Markers"
            active={filters.penaltyParking}
            onPress={() => toggleFilter("penaltyParking")}
          />
          {/* Official penalty — always visible, non-toggleable */}
          <View style={styles.filterToggleRow}>
            <View style={styles.officialPenaltyFilterRow}>
              <View style={styles.officialPenaltyDot} />
              <Text style={[styles.filterToggleLabel, { color: colors.foreground }]}>
                {t("filterOfficialPenaltyLabel")}
              </Text>
            </View>
            <View style={styles.alwaysVisibleBadge}>
              <Text style={styles.alwaysVisibleText}>{t("alwaysVisible")}</Text>
            </View>
          </View>
          {isSuperAdmin && (
            <TouchableOpacity
              style={[
                styles.penaltyModeBtn,
                {
                  borderColor: penaltyMode ? "#EF4444" : colors.border,
                  backgroundColor: penaltyMode ? "#FEF2F2" : colors.muted,
                },
              ]}
              onPress={() => setPenaltyMode((v) => !v)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.penaltyModeText,
                  { color: penaltyMode ? "#DC2626" : colors.foreground },
                ]}
              >
                {penaltyMode ? "⚠️ Penalty Mode ON" : "Place Penalty Marker"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* -------------------------------------------------------------------- */}
      {/* Custom map controls — zoom +/- and centre on location                 */}
      {/* -------------------------------------------------------------------- */}

      {!filterOpen && (
        <View
          style={[
            styles.mapControlsGroup,
            { right: 16, bottom: 100 + insets.bottom + 72 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.mapControlBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={handleZoomIn}
          >
            <Plus size={20} color={colors.foreground} strokeWidth={2.5} />
          </Pressable>
          <View style={[styles.mapControlDivider, { backgroundColor: colors.border }]} />
          <Pressable
            style={({ pressed }) => [
              styles.mapControlBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={handleZoomOut}
          >
            <Minus size={20} color={colors.foreground} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      {!filterOpen && (
        <Pressable
          style={({ pressed }) => [
            styles.mapLocationBtn,
            {
              right: 16,
              bottom: 100 + insets.bottom + 72 + 100,
              backgroundColor: colors.card,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={handleCenterOnUser}
        >
          <MapPin size={20} color={colors.primary} strokeWidth={2} />
        </Pressable>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Nearby machines active banner                                          */}
      {/* -------------------------------------------------------------------- */}

      {nearbyMachinesCoord && (
        <View
          style={[styles.nearbyMachinesBanner, { bottom: 100 + insets.bottom }]}
        >
          <Text style={styles.nearbyMachinesText}>💲 Showing nearby machines</Text>
          <Pressable
            onPress={() => setNearbyMachinesCoord(null)}
            style={({ pressed }) => [
              styles.nearbyMachinesClear,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <X size={14} color={colors.mutedForeground} strokeWidth={2.5} />
            <Text style={styles.nearbyMachinesClearText}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Zone banner — slides in when user is in a zone                        */}
      {/* -------------------------------------------------------------------- */}

      <Animated.View
        style={[
          styles.zoneBanner,
          { top: insets.top + 68 },
          {
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
          zoneResult.zone === "blue"
            ? styles.zoneBannerBlue
            : styles.zoneBannerGreen,
        ]}
        pointerEvents="none"
      >
        <Text style={styles.zoneBannerEmoji}>
          {zoneResult.zone === "blue" ? "🔵" : "🟢"}
        </Text>
        <View>
          <Text style={styles.zoneBannerTitle}>
            {zoneResult.zone === "blue"
              ? "You are in the Blue Zone"
              : "You are in the Green Zone"}
          </Text>
          <Text style={styles.zoneBannerSub}>
            {zoneResult.smsCode
              ? `SMS to ${zoneResult.smsCode} · ${zoneResult.hourlyRate?.toFixed(2)} BGN/hr`
              : "Paid parking applies"}
          </Text>
        </View>
      </Animated.View>

      {/* -------------------------------------------------------------------- */}
      {/* FABs (admin settings / start session)                                 */}
      {/* -------------------------------------------------------------------- */}

      {isSuperAdmin && (
        <Pressable
          style={({ pressed }) => [
            styles.adminFab,
            {
              bottom: 100 + insets.bottom,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
          onPress={() => router.push("/admin")}
        >
          <Settings size={24} color="white" strokeWidth={2} />
        </Pressable>
      )}

      {!isSuperAdmin && (
        <Pressable
          style={({ pressed }) => [
            styles.sessionFab,
            {
              bottom: 100 + insets.bottom,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
          onPress={() => {
            if (selectedLot) {
              router.push(`/parking/${selectedLot.id}`);
            } else {
              showInfo("Tap a parking lot on the map to start a session.", "Select a Lot");
            }
          }}
        >
          <PlayCircle size={26} color="white" strokeWidth={2} />
        </Pressable>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Filter FAB — bottom left                                             */}
      {/* -------------------------------------------------------------------- */}

      <Pressable
        style={({ pressed }) => [
          styles.filterFab,
          {
            bottom: 100 + insets.bottom,
            backgroundColor: filterOpen ? colors.primary : colors.card,
            borderColor: filterOpen ? colors.primary : colors.border,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        onPress={() => setFilterOpen((v) => !v)}
      >
        <SlidersHorizontal
          size={18}
          color={filterOpen ? "white" : colors.foreground}
          strokeWidth={2}
        />
        <Text style={[styles.filterFabLabel, { color: filterOpen ? "white" : colors.foreground }]}>
          Filter
        </Text>
        {hasActiveFilters && !filterOpen && (
          <View style={styles.filterActiveDot} />
        )}
      </Pressable>

      {/* -------------------------------------------------------------------- */}
      {/* Custom bottom sheet info panel                                        */}
      {/* -------------------------------------------------------------------- */}

      {sheetItem && !longPressCoord && !selectedPenalty && (
        <>
          {/* Tap-outside overlay */}
          <Pressable style={styles.sheetOverlay} onPress={closeSheet} />

          {/* Animated sheet */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                height: SHEET_FULL_H,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* Handle zone — swipe to snap, tap to toggle */}
            <View {...panResponder.panHandlers} style={styles.sheetHandleZone}>
              <TouchableOpacity
                onPress={() => {
                  const next = sheetSnapRef.current === "collapsed" ? "expanded" : "collapsed";
                  snapSheetRef.current(next);
                }}
                activeOpacity={1}
                style={styles.sheetTopRow}
              >
                <View style={styles.sheetHandle} />
              </TouchableOpacity>
              <Pressable
                onPress={closeSheet}
                hitSlop={8}
                style={({ pressed }) => [styles.sheetCloseBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <X size={18} color={colors.mutedForeground} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              scrollEnabled={sheetSnap === "expanded"}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >

            {/* ---- Parking lot sheet ---- */}
            {sheetItem.type === "lot" && (
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text
                    style={[styles.sheetName, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {sheetItem.data.name}
                  </Text>
                  <Badge
                    label={sheetItem.data.type}
                    variant={sheetItem.data.type === "free" ? "free" : "paid"}
                  />
                </View>

                {!!sheetItem.data.address && (
                  <Text
                    style={[styles.sheetMeta, { color: colors.mutedForeground }]}
                  >
                    {sheetItem.data.address}
                  </Text>
                )}

                <View style={styles.sheetInfoRow}>
                  {sheetDistanceText && (
                    <View style={styles.sheetInfoChip}>
                      <MapPin size={13} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                        {sheetDistanceText}
                      </Text>
                    </View>
                  )}
                  <View style={styles.sheetInfoChip}>
                    <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                      {sheetItem.data.type === "free"
                        ? "🆓 Free parking"
                        : "💳 Paid parking"}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetDivider} />

                <View style={styles.sheetActionCol}>
                  {/* Favourite — full-width outlined */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      {
                        borderWidth: 1.5,
                        borderColor: favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.border,
                        backgroundColor: favouriteIds.has(sheetItem.data.id) ? "#FEF2F2" : colors.muted,
                        opacity: pressed ? 0.75 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() => toggleFavourite(sheetItem.data.id)}
                  >
                    <Heart
                      size={18}
                      color={favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.mutedForeground}
                      strokeWidth={2}
                      fill={favouriteIds.has(sheetItem.data.id) ? "#EF4444" : "none"}
                    />
                    <Text style={[styles.sheetBtnText, { color: favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.foreground }]}>
                      {favouriteIds.has(sheetItem.data.id) ? "Saved" : "Save to Favourites"}
                    </Text>
                  </Pressable>

                  {/* Navigate — full-width filled */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => handleNavigate(sheetItem.data.latitude, sheetItem.data.longitude, sheetItem.data.name)}
                  >
                    <Navigation size={16} color="white" strokeWidth={2} />
                    <Text style={[styles.sheetBtnText, { color: "white" }]}>Navigate</Text>
                  </Pressable>

                  {/* Start Session */}
                  {!isSuperAdmin && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.sheetBtnFull,
                        { backgroundColor: "#16A34A", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                      onPress={() => router.push(`/parking/${sheetItem.data.id}`)}
                    >
                      <PlayCircle size={16} color="white" strokeWidth={2} />
                      <Text style={[styles.sheetBtnText, { color: "white" }]}>Start Session</Text>
                    </Pressable>
                  )}

                  {/* View Details (admin) */}
                  {isSuperAdmin && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.sheetBtnFull,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                      onPress={() => router.push(`/parking/${sheetItem.data.id}`)}
                    >
                      <Text style={[styles.sheetBtnText, { color: "white" }]}>View Details →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ---- Municipal paid parking sheet ---- */}
            {sheetItem.type === "municipal" && (
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetName, { color: colors.foreground }]} numberOfLines={2}>
                    {lang === "bg" ? sheetItem.data.name : sheetItem.data.nameEn}
                  </Text>
                  <View style={[styles.zoneBadge, { backgroundColor: "#EEF3FF", borderColor: "rgba(59,91,219,0.35)" }]}>
                    <Text style={[styles.zoneBadgeText, { color: "#3B5BDB" }]}>
                      {t("municipalPaidType")}
                    </Text>
                  </View>
                </View>
                <View style={styles.sheetInfoRow}>
                  <View style={styles.sheetInfoChip}>
                    <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                      🏛 {t("operatorLabel")}: {sheetItem.data.operator}
                    </Text>
                  </View>
                  {sheetDistanceText && (
                    <View style={styles.sheetInfoChip}>
                      <MapPin size={13} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                        {sheetDistanceText}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.sheetDivider} />

                <View style={styles.sheetActionCol}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      {
                        borderWidth: 1.5,
                        borderColor: favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.border,
                        backgroundColor: favouriteIds.has(sheetItem.data.id) ? "#FEF2F2" : colors.muted,
                        opacity: pressed ? 0.75 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() => toggleFavourite(sheetItem.data.id)}
                  >
                    <Heart
                      size={18}
                      color={favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.mutedForeground}
                      strokeWidth={2}
                      fill={favouriteIds.has(sheetItem.data.id) ? "#EF4444" : "none"}
                    />
                    <Text style={[styles.sheetBtnText, { color: favouriteIds.has(sheetItem.data.id) ? "#EF4444" : colors.foreground }]}>
                      {favouriteIds.has(sheetItem.data.id) ? "Saved" : "Save to Favourites"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => handleNavigate(sheetItem.data.lat, sheetItem.data.lng, lang === "bg" ? sheetItem.data.name : sheetItem.data.nameEn)}
                  >
                    <Navigation size={16} color="white" strokeWidth={2} />
                    <Text style={[styles.sheetBtnText, { color: "white" }]}>{t("navigateBtn")}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ---- Official penalty parking sheet ---- */}
            {sheetItem.type === "officialPenalty" && (
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetName, { color: colors.foreground }]} numberOfLines={2}>
                    ⚠️ {lang === "bg" ? t("officialPenaltyName") : "Official Penalty Parking"}
                  </Text>
                  <View style={[styles.zoneBadge, { backgroundColor: "#FEF2F2", borderColor: "rgba(239,68,68,0.35)" }]}>
                    <Text style={[styles.zoneBadgeText, { color: "#EF4444" }]}>
                      {lang === "bg" ? "Постоянен" : "Permanent"}
                    </Text>
                  </View>
                </View>
                <View style={styles.sheetInfoRow}>
                  <View style={styles.sheetInfoChip}>
                    <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                      🏛 {t("operatorLabel")}: {sheetItem.data.operator}
                    </Text>
                  </View>
                  <View style={styles.sheetInfoChip}>
                    <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                      ℹ️ {t("officialPenaltyInfo")}
                    </Text>
                  </View>
                  {sheetDistanceText && (
                    <View style={styles.sheetInfoChip}>
                      <MapPin size={13} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                        {sheetDistanceText}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.sheetDivider} />

                <View style={styles.sheetActionCol}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      { backgroundColor: "#EF4444", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => handleNavigate(sheetItem.data.lat, sheetItem.data.lng, t("officialPenaltyName"))}
                  >
                    <Navigation size={16} color="white" strokeWidth={2} />
                    <Text style={[styles.sheetBtnText, { color: "white" }]}>{t("navigateBtn")}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ---- Zone sheet ---- */}
            {sheetItem.type === "zone" && (
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text
                    style={[styles.sheetName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {sheetItem.data.zone.type === "blue"
                      ? "Blue Parking Zone"
                      : "Green Parking Zone"}
                  </Text>
                  <View
                    style={[
                      styles.zoneBadge,
                      {
                        backgroundColor:
                          sheetItem.data.zone.type === "blue"
                            ? "#EEF3FF"
                            : "#F0FFF6",
                        borderColor:
                          sheetItem.data.zone.type === "blue"
                            ? "rgba(14,75,241,0.35)"
                            : "rgba(34,197,94,0.35)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.zoneBadgeText,
                        {
                          color:
                            sheetItem.data.zone.type === "blue"
                              ? "#0E4BF1"
                              : "#16A34A",
                        },
                      ]}
                    >
                      {sheetItem.data.zone.type === "blue" ? "Blue" : "Green"}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetInfoRow}>
                  {sheetDistanceText && (
                    <View style={styles.sheetInfoChip}>
                      <MapPin size={13} color={colors.primary} strokeWidth={2} />
                      <Text
                        style={[
                          styles.sheetInfoText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {sheetDistanceText}
                      </Text>
                    </View>
                  )}
                  {sheetItem.data.zoneInfo.hourlyRate != null && (
                    <View style={styles.sheetInfoChip}>
                      <Text
                        style={[
                          styles.sheetInfoText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        💰 {sheetItem.data.zoneInfo.hourlyRate?.toFixed(2)} BGN/hr
                      </Text>
                    </View>
                  )}
                  {sheetItem.data.zoneInfo.smsCode && (
                    <View style={styles.sheetInfoChip}>
                      <Text
                        style={[
                          styles.sheetInfoText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        📱 SMS: {sheetItem.data.zoneInfo.smsCode}
                      </Text>
                    </View>
                  )}
                  {!sheetItem.data.zoneInfo.hourlyRate && (
                    <View style={styles.sheetInfoChip}>
                      <Text
                        style={[
                          styles.sheetInfoText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        🆓 Free parking zone
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sheetDivider} />

                <View style={styles.sheetActionCol}>
                  {/* Navigate to zone */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      {
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        backgroundColor: colors.muted,
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() =>
                      handleNavigate(
                        sheetItem.data.coord.latitude,
                        sheetItem.data.coord.longitude,
                        sheetItem.data.zone.type === "blue" ? "Blue Parking Zone" : "Green Parking Zone"
                      )
                    }
                  >
                    <Navigation size={16} color={colors.foreground} strokeWidth={2} />
                    <Text style={[styles.sheetBtnText, { color: colors.foreground }]}>Navigate</Text>
                  </Pressable>

                  {/* Show nearby machines */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetBtnFull,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => { setNearbyMachinesCoord(sheetItem.data.coord); closeSheet(); }}
                  >
                    <Text style={[styles.sheetBtnText, { color: "white" }]}>💲 Nearby Machines</Text>
                  </Pressable>
                </View>
              </View>
            )}
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Penalty marker info modal                                             */}
      {/* -------------------------------------------------------------------- */}

      <Modal
        visible={!!selectedPenalty}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPenalty(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedPenalty(null)}
        />
        <View
          style={[
            styles.penaltyModal,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.bubbleHandle} />
          <View style={styles.penaltyModalHeader}>
            <Text style={styles.penaltyEmojiLarge}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bubbleTitle, { color: colors.foreground }]}>
                Penalty Marker
              </Text>
              {selectedPenalty && (
                <Text style={[styles.bubbleCoords, { color: colors.mutedForeground }]}>
                  {selectedPenalty.latitude.toFixed(4)},{" "}
                  {selectedPenalty.longitude.toFixed(4)}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setSelectedPenalty(null)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <X size={20} color={colors.mutedForeground} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Placed:{" "}
              {selectedPenalty
                ? new Date(selectedPenalty.timestamp).toLocaleString()
                : ""}
            </Text>
            <Input
              label="Note"
              placeholder="Add a note about this penalty..."
              value={penaltyNote}
              onChangeText={setPenaltyNote}
              multiline
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSavePenaltyNote}
            >
              <Text style={styles.saveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.removeSection, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.removeBtn, { borderColor: "#EF4444" }]}
              onPress={handleDeletePenalty}
            >
              <Text style={[styles.removeBtnText, { color: "#EF4444" }]}>
                🗑️ Remove Penalty Marker
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* Long-press bubble — superadmin add/remove parking lot                 */}
      {/* -------------------------------------------------------------------- */}

      <Modal
        visible={!!longPressCoord}
        transparent
        animationType="slide"
        onRequestClose={() => setLongPressCoord(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLongPressCoord(null)}
        />
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.bubbleHandle} />

          <View style={styles.bubbleHeader}>
            <Text style={styles.bubblePin}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bubbleTitle, { color: colors.foreground }]}>
                {nearbyLot ? "Parking lot nearby" : "Add Parking Lot"}
              </Text>
              {longPressCoord && (
                <Text style={[styles.bubbleCoords, { color: colors.mutedForeground }]}>
                  {longPressCoord.latitude.toFixed(4)},{" "}
                  {longPressCoord.longitude.toFixed(4)}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setLongPressCoord(null)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <X size={20} color={colors.mutedForeground} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 520 }}
          >
            <View style={styles.section}>
              <Input
                label="Parking Lot Name"
                placeholder="e.g. City Center Parking"
                value={addForm.name}
                onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Type
              </Text>
              <View style={styles.typeRow}>
                {(["free", "paid"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      { borderColor: colors.border },
                      addForm.type === t && {
                        backgroundColor:
                          t === "free" ? colors.parkingFree : colors.parkingPaid,
                        borderColor: "transparent",
                      },
                    ]}
                    onPress={() => setAddForm((f) => ({ ...f, type: t }))}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        {
                          color:
                            addForm.type === t ? "white" : colors.foreground,
                        },
                      ]}
                    >
                      {t === "free" ? "🟢 Free" : "🟠 Paid"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Input
                label="📝  Description"
                placeholder="e.g. Underground parking, max height 2m..."
                value={addForm.description}
                onChangeText={(t) =>
                  setAddForm((f) => ({ ...f, description: t }))
                }
                multiline
              />
            </View>

            <View style={styles.section}>
              <Input
                label="⏰  Opening Hours"
                placeholder="e.g. Mon–Fri 08:00–20:00, Sat–Sun 09:00–18:00"
                value={addForm.openingHours}
                onChangeText={(t) =>
                  setAddForm((f) => ({ ...f, openingHours: t }))
                }
                multiline
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                📸  Photos
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
              >
                {addForm.photos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setAddForm((f) => ({ ...f, mainPhotoIndex: i }))}
                    style={styles.photoThumbWrap}
                  >
                    <Image
                      source={{ uri }}
                      style={[
                        styles.photoThumb,
                        addForm.mainPhotoIndex === i && styles.photoThumbMain,
                      ]}
                    />
                    {addForm.mainPhotoIndex === i && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>MAIN</Text>
                      </View>
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.photoRemoveBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() =>
                        setAddForm((f) => {
                          const photos = f.photos.filter((_, j) => j !== i);
                          return {
                            ...f,
                            photos,
                            mainPhotoIndex: Math.min(
                              f.mainPhotoIndex,
                              Math.max(0, photos.length - 1)
                            ),
                          };
                        })
                      }
                    >
                      <X size={12} color="white" strokeWidth={3} />
                    </Pressable>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.addPhotoBtn,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                  onPress={pickPhotos}
                >
                  <Text style={styles.addPhotoBtnText}>➕</Text>
                  <Text
                    style={[styles.addPhotoBtnLabel, { color: colors.mutedForeground }]}
                  >
                    Add Photo
                  </Text>
                </TouchableOpacity>
              </ScrollView>
              {addForm.photos.length > 1 && (
                <Text
                  style={[styles.mainPhotoHint, { color: colors.mutedForeground }]}
                >
                  Tap a photo to set it as the main map marker image
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                🏷️  Amenities
              </Text>
              <View style={styles.amenityGrid}>
                {AMENITIES.map(({ key, label, emoji }) => {
                  const active = addForm.amenities[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleAmenity(key)}
                      style={[
                        styles.amenityChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active
                            ? colors.primary + "15"
                            : colors.muted,
                        },
                      ]}
                    >
                      <Text style={styles.amenityEmoji}>{emoji}</Text>
                      <Text
                        style={[
                          styles.amenityLabel,
                          { color: active ? colors.primary : colors.foreground },
                        ]}
                      >
                        {label}
                      </Text>
                      {active && (
                        <Text style={[styles.amenityCheck, { color: colors.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.section, { paddingBottom: 4 }]}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primary },
                  (!addForm.name.trim() || isSaving) && { opacity: 0.5 },
                ]}
                onPress={handleAddPark}
                disabled={!addForm.name.trim() || isSaving}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? "Adding…" : "➕  Add Parking Lot"}
                </Text>
              </TouchableOpacity>
            </View>

            {nearbyLot && (
              <View
                style={[styles.removeSection, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.removeLabel, { color: colors.mutedForeground }]}
                >
                  Nearby:{" "}
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {nearbyLot.name}
                  </Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.removeBtn,
                    { borderColor: colors.destructive },
                    isRemoving && { opacity: 0.5 },
                  ]}
                  onPress={handleRemovePark}
                  disabled={isRemoving}
                >
                  <Text
                    style={[styles.removeBtnText, { color: colors.destructive }]}
                  >
                    {isRemoving ? "Removing…" : `🗑️  Remove "${nearbyLot.name}"`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Filter toggle sub-component
// ---------------------------------------------------------------------------

function FilterToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const knobAnim = useRef(new Animated.Value(active ? 16 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(active ? 1 : 0.45)).current;
  const trackColor = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(knobAnim, {
      toValue: active ? 16 : 0,
      useNativeDriver: true,
      tension: 160,
      friction: 12,
    }).start();
    Animated.timing(labelOpacity, {
      toValue: active ? 1 : 0.45,
      duration: 220,
      useNativeDriver: true,
    }).start();
    Animated.timing(trackColor, {
      toValue: active ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [active]);

  const trackBg = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: ["#D1D5DB", "#3B6BF5"],
  });

  return (
    <TouchableOpacity
      style={styles.filterToggleRow}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Animated.Text style={[styles.filterToggleLabel, { opacity: labelOpacity }]}>
        {label}
      </Animated.Text>
      <Animated.View style={[styles.filterToggleSwitch, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[
            styles.filterToggleKnob,
            { transform: [{ translateX: knobAnim }] },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Markers
  machineMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF9800",
  },
  machineEmoji: { fontSize: 13 },
  penaltyEmojiLarge: { fontSize: 28 },
  pinEmoji: { fontSize: 32 },

  // Search + controls
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E7F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingSearch: { position: "absolute", left: 16, right: 16, zIndex: 10 },
  searchInput: { backgroundColor: "white", height: 50 },
  citySelector: {
    flexDirection: "row",
    marginTop: 8,
    borderRadius: 10,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E7F5",
  },
  citySegment: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  citySegmentText: { fontSize: 13, fontWeight: "600" },

  // Filter panel — compact floating card anchored bottom-right
  filterPanel: {
    position: "absolute",
    right: 16,
    width: 248,
    zIndex: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 14,
  },
  filterPanelInner: { padding: 14, gap: 2, borderRadius: 16, overflow: "hidden" },
  filterPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  filterPanelTitle: { fontSize: 15, fontWeight: "700" },
  filterCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterDivider: { height: 1, marginVertical: 4 },
  // Filter FAB — bottom-right pill button
  filterFab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  filterFabLabel: { fontSize: 13, fontWeight: "600" },
  filterActiveDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00C5A8",
    borderWidth: 1.5,
    borderColor: "white",
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  filterToggleLabel: { fontSize: 13, fontWeight: "500" },
  filterToggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D1D5DB",
    padding: 2,
    justifyContent: "center",
  },
  filterToggleSwitchOn: { backgroundColor: "#3B6BF5" },
  filterToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "white",
  },
  filterToggleKnobOn: { alignSelf: "flex-end" },
  penaltyModeBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  penaltyModeText: { fontSize: 12, fontWeight: "600" },
  officialPenaltyFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  officialPenaltyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "white",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  alwaysVisibleBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  alwaysVisibleText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },

  // Custom map controls
  mapControlsGroup: {
    position: "absolute",
    zIndex: 10,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },
  mapLocationBtn: {
    position: "absolute",
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Nearby machines banner
  nearbyMachinesBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF8E1",
    borderWidth: 1.5,
    borderColor: "#FF9800",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  nearbyMachinesText: { fontSize: 13, fontWeight: "600", color: "#E65100" },
  nearbyMachinesClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FF9800",
    borderRadius: 8,
  },
  nearbyMachinesClearText: { fontSize: 12, fontWeight: "700", color: "white" },

  // Zone banner
  zoneBanner: {
    position: "absolute",
    left: 16,
    right: 100,
    zIndex: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  zoneBannerBlue: {
    backgroundColor: "#EEF3FF",
    borderWidth: 1.5,
    borderColor: "rgba(14,75,241,0.25)",
  },
  zoneBannerGreen: {
    backgroundColor: "#F0FFF6",
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.3)",
  },
  zoneBannerEmoji: { fontSize: 22 },
  zoneBannerTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  zoneBannerSub: { fontSize: 11, color: "#555", marginTop: 1 },

  // FABs
  adminFab: {
    position: "absolute",
    left: 16,
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
  sessionFab: {
    position: "absolute",
    left: 16,
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

  // Custom bottom sheet
  sheetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 24,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 18,
  },
  // Handle zone: pan + tap target at top of sheet
  sheetHandleZone: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  sheetTopRow: {
    alignItems: "center",
    paddingVertical: 4,
    width: "100%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
  },
  sheetCloseBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Scrollable content area
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 10,
  },
  sheetName: { fontSize: 18, fontWeight: "700", flex: 1 },
  sheetMeta: { fontSize: 13, marginBottom: 8 },
  sheetInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  sheetInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sheetInfoText: { fontSize: 12, fontWeight: "500" },
  // Divider between info and actions
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    marginBottom: 14,
  },
  // Vertical stacked full-width action buttons
  sheetActionCol: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sheetBtnFull: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 0,
  },
  // Kept for backward compat (zone/penalty still use sheetBtn in some spots)
  sheetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sheetBtnText: { fontWeight: "600", fontSize: 14 },
  sheetFavBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  zoneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  zoneBadgeText: { fontSize: 12, fontWeight: "700" },

  // Penalty modal
  penaltyModal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  penaltyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 12,
  },

  // Long-press bubble (add parking)
  bubble: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  bubbleHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 12,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 12,
  },
  bubblePin: { fontSize: 26 },
  bubbleTitle: { fontSize: 17, fontWeight: "700" },
  bubbleCoords: { fontSize: 11, marginTop: 1 },

  // Form sections
  section: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: -4 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnText: { fontWeight: "600", fontSize: 15 },
  photoRow: { gap: 10, paddingVertical: 4 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  photoThumbMain: { borderWidth: 2.5, borderColor: "#0E4BF1" },
  mainBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#0E4BF1",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mainBadgeText: { color: "white", fontSize: 9, fontWeight: "700" },
  photoRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoBtnText: { fontSize: 20 },
  addPhotoBtnLabel: { fontSize: 10, fontWeight: "600" },
  mainPhotoHint: { fontSize: 11, marginTop: -4 },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  amenityEmoji: { fontSize: 14 },
  amenityLabel: { fontSize: 12, fontWeight: "600" },
  amenityCheck: { fontSize: 12, fontWeight: "800" },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  removeSection: {
    marginTop: 12,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  removeLabel: { fontSize: 13 },
  removeBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: { fontWeight: "700", fontSize: 15 },

  // Web list view
  webHeader: { padding: 16, gap: 16 },
  webTitle: { fontSize: 24, fontWeight: "700" },
  webList: { padding: 16, gap: 12 },
  lotCard: { marginBottom: 4 },
  lotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  lotName: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
  lotAddress: { fontSize: 14, marginBottom: 16 },
  empty: { padding: 40, alignItems: "center" },

  // Modals
  modalBackdrop: { flex: 1 },
});
