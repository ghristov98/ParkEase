import { Ionicons } from "@expo/vector-icons";
import { getGetNotificationsQueryOptions, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: notificationsData, isLoading, refetch } = useQuery(getGetNotificationsQueryOptions());
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  if (isLoading) return <LoadingScreen />;

  const notifications = notificationsData?.notifications || [];

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      refetch();
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetch();
    } catch (err) {
      // Ignore
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.headerAction, { color: colors.primary }]}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleMarkAsRead(item.id)}
            style={[
              styles.notificationItem,
              { backgroundColor: colors.card },
              !item.isRead && {
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
                backgroundColor: colors.primary + "05",
              },
            ]}
          >
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[styles.notifTitle, { color: colors.foreground }, !item.isRead && styles.bold]}>
                  {item.title}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>{item.body}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              We'll notify you when there's an update about your vehicles or parking.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerAction: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  list: {
    padding: 16,
  },
  notificationItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
  },
  empty: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
