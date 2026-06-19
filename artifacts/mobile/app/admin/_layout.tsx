import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="parking" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="broadcasts" />
      <Stack.Screen name="events" />
    </Stack>
  );
}
