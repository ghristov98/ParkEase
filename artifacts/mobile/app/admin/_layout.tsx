import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="users" options={{ title: "Manage Users" }} />
      <Stack.Screen name="parking" options={{ title: "Manage Parking" }} />
      <Stack.Screen name="notifications" options={{ title: "Send Notification" }} />
    </Stack>
  );
}
