import { getGetNotificationsQueryOptions, useMarkAllNotificationsRead, useMarkNotificationRead, getGetBroadcastsQueryOptions, getGetActiveEventsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
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
  const { data: broadcasts = [], refetch: refetchBroadcasts } = useQuery(getGetBroadcastsQueryOptions());
  const { data: activeEvents = [], refetch: refetchEvents } = useQuery(getGetActiveEventsQueryOptions());
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  if (isLoading) return <LoadingScreen />;

  const notifications = notificationsData?.notifications || [];

  const handleRefreshAll = () => {
    refetch();
    refetchBroadcasts();
    refetchEvents();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      refetch();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetch();
    } catch {}
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reminder": return "🕒";
      case "promotion": return "🏷️";
      case "expiry": return "⏰";
      case "zone": return "🔵";
      default: return "ℹ️";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const formatEventTime = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dayFmt = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });
    if (s.toDateString() === e.toDateString()) {
      return `${dayFmt(s)} · ${fmt(s)} – ${fmt(e)}`;
    }
    return `${dayFmt(s)} ${fmt(s)} – ${dayFmt(e)} ${fmt(e)}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefreshAll} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.headerAction, { color: colors.primary }]}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Active Events Warning ─────────────────────────────── */}
      {activeEvents.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: "#B45309" }]}>⚠️ Active Alerts</Text>
          {activeEvents.map((ev) => (
            <View
              key={ev.id}
              style={[styles.eventCard, { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" }]}
            >
              <View style={styles.eventHeader}>
                <Text style={[styles.eventTitle, { color: "#92400E" }]}>⚠️ {ev.title}</Text>
                {ev.zone && (
                  <View style={[styles.zonePill, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.zonePillText, { color: "#92400E" }]}>{ev.zone}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.eventMessage, { color: "#78350F" }]}>{ev.message}</Text>
              <Text style={[styles.eventTime, { color: "#A16207" }]}>
                🕒 {formatEventTime(ev.startTime, ev.endTime)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Broadcasts / Pinned Announcements ────────────────── */}
      {broadcasts.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>📣 Announcements</Text>
          {broadcasts.map((b) => (
            <View
              key={b.id}
              style={[styles.broadcastCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "40" }]}
            >
              <View style={[styles.broadcastIcon, { backgroundColor: colors.primary + "20" }]}>
                <Text style={{ fontSize: 18 }}>📢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.broadcastTitle, { color: colors.foreground }]}>{b.title}</Text>
                <Text style={[styles.broadcastBody, { color: colors.mutedForeground }]}>{b.body}</Text>
                <Text style={[styles.broadcastTime, { color: colors.mutedForeground }]}>{formatDate(b.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── User Notifications ──────────────────────────────── */}
      {notifications.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent</Text>
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleMarkAsRead(item.id)}
              style={[
                styles.notificationItem,
                { backgroundColor: colors.card },
                !item.isRead && {
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                  backgroundColor: colors.primary + "08",
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
              </View>
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
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {notifications.length === 0 && broadcasts.length === 0 && activeEvents.length === 0 && (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Text style={styles.emptyEmoji}>🔔</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up!</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            We'll notify you when there's an update about your parking or zone alerts.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "700" },
  headerAction: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  sectionBlock: { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },

  // Events
  eventCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  eventHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  eventTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  zonePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  zonePillText: { fontSize: 12, fontWeight: "600" },
  eventMessage: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  eventTime: { fontSize: 12 },

  // Broadcasts
  broadcastCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  broadcastIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  broadcastTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  broadcastBody: { fontSize: 14, lineHeight: 20 },
  broadcastTime: { fontSize: 12, marginTop: 4 },

  // Notifications list
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  typeIcon: { fontSize: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  notifTitle: { fontSize: 16, flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  body: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: "700" },

  // Empty
  empty: { marginTop: 80, alignItems: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
