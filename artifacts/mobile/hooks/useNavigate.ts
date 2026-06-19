import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";

const PREF_KEY = "parkease_nav_preference";

type NavApp = "google" | "waze";

function openMap(app: NavApp, lat: number, lng: number, label?: string) {
  const encodedLabel = encodeURIComponent(label ?? "Parking");
  if (app === "google") {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`);
  } else {
    Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
  }
}

export function useNavigate() {
  const navigate = async (lat: number, lng: number, label?: string) => {
    const stored = await AsyncStorage.getItem(PREF_KEY) as NavApp | null;
    if (stored === "google" || stored === "waze") {
      openMap(stored, lat, lng, label);
      return;
    }

    Alert.alert(
      "Open in…",
      "Choose your navigation app",
      [
        {
          text: "🗺 Google Maps",
          onPress: async () => {
            await AsyncStorage.setItem(PREF_KEY, "google");
            openMap("google", lat, lng, label);
          },
        },
        {
          text: "🔵 Waze",
          onPress: async () => {
            await AsyncStorage.setItem(PREF_KEY, "waze");
            openMap("waze", lat, lng, label);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const clearPreference = () => AsyncStorage.removeItem(PREF_KEY);

  return { navigate, clearPreference };
}
