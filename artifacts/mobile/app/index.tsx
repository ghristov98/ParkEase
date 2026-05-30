import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, isLoading } = useAuth();
  const colors = useColors();
  if (isLoading) return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
  return <Redirect href={user ? "/(main)/map" : "/(auth)/login"} />;
}
