/**
 * LocationWatcher — subscribes to GPS updates, re-checks zone status on
 * each position change, and notifies listeners.
 *
 * Usage:
 *   const watcher = LocationWatcher.getInstance();
 *   const unsub = watcher.subscribe((result) => { ... });
 *   await watcher.start();
 *   // later:
 *   unsub();
 *   watcher.stop();
 */

import * as Location from "expo-location";
import { checkZone, ZoneResult } from "./ZoneService";

type Listener = (result: ZoneResult, coords: { latitude: number; longitude: number }) => void;

class LocationWatcher {
  private static instance: LocationWatcher;
  private subscription: Location.LocationSubscription | null = null;
  private listeners: Set<Listener> = new Set();
  private lastResult: ZoneResult = { zone: null };
  private lastCoords: { latitude: number; longitude: number } | null = null;

  static getInstance(): LocationWatcher {
    if (!LocationWatcher.instance) {
      LocationWatcher.instance = new LocationWatcher();
    }
    return LocationWatcher.instance;
  }

  async start(): Promise<void> {
    if (this.subscription) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 10_000,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const result = checkZone(latitude, longitude);
        this.lastResult = result;
        this.lastCoords = { latitude, longitude };
        this.emit(result, { latitude, longitude });
      },
    );
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.lastCoords) {
      listener(this.lastResult, this.lastCoords);
    }
    return () => this.listeners.delete(listener);
  }

  private emit(result: ZoneResult, coords: { latitude: number; longitude: number }): void {
    this.listeners.forEach((l) => l(result, coords));
  }
}

export default LocationWatcher;
