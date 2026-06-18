import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import type { ParkingSession } from "@workspace/api-client-react";
import { createSelfNotification } from "@workspace/api-client-react";

const THRESHOLDS = [
  { minutes: 15, label: "15 minutes", key: "15m" },
  { minutes: 5,  label: "5 minutes",  key: "5m"  },
];

async function fireWebNotification(title: string, body: string) {
  if (Platform.OS !== "web") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch { /* ignore */ }
}

export function useSessionExpiryNotifications(
  activeSessions: ParkingSession[] | undefined,
  accessToken: string | null | undefined,
) {
  const firedRef = useRef<Set<string>>(new Set());

  const checkExpiry = useCallback(async () => {
    if (!activeSessions?.length || !accessToken) return;

    for (const session of activeSessions) {
      if (!session.endTime) continue;
      const secondsLeft = Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000);

      for (const threshold of THRESHOLDS) {
        const key = `${session.id}:${threshold.key}`;
        if (firedRef.current.has(key)) continue;
        if (secondsLeft > threshold.minutes * 60) continue;
        if (secondsLeft < 0) continue;

        firedRef.current.add(key);

        const title = "⏱ Parking Expiry";
        const body = `Your parking at ${session.locationName} expires in ${threshold.label}`;

        fireWebNotification(title, body);

        try {
          await createSelfNotification({ title, body, type: "reminder" });
        } catch { /* ignore */ }
      }
    }
  }, [activeSessions, accessToken]);

  useEffect(() => {
    checkExpiry();
    const id = setInterval(checkExpiry, 30_000);
    return () => clearInterval(id);
  }, [checkExpiry]);
}
