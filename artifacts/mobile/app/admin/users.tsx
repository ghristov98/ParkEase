import { Ionicons } from "@expo/vector-icons";
import { getGetUsersQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const colors = useColors();
  const { data: usersData, isLoading } = useQuery(getGetUsersQueryOptions({ search: search || undefined }));

  if (isLoading) return <LoadingScreen />;

  const users = usersData?.users || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Input
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
          leftIcon="search-outline"
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.firstName[0]}{item.lastName[0]}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                  {item.email}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge label={item.role} variant={item.role as any} style={styles.badge} />
                  <Badge 
                    label={item.isActive ? "Active" : "Inactive"} 
                    variant={item.isActive ? "active" : "inactive"} 
                  />
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  userCard: {
    marginBottom: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
  },
});
