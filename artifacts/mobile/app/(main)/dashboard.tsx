import { getGetDashboardQueryOptions, useRedeemLoyaltyPoints } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonDashboardCard } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#9CA3AF",
  Gold: "#F59E0B",
};
const TIER_EMOJIS: Record<string, string> = { Bronze: "🥉", Silver: "🥈", Gold: "🥇" };

// ── Simple SVG bar chart ────────────────────────────────────────────────────
function SpendingChart({ data }: { data: { month: string; amount: number }[] }) {
  const colors = useColors();
  const W = 320;
  const H = 140;
  const padL = 36;
  const padR = 12;
  const padT = 8;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map((d) => d.amount), 0.01);
  const barW = Math.floor(chartW / data.length) - 6;

  return (
    <Svg width={W} height={H}>
      {/* Y-axis grid lines */}
      {[0, 0.5, 1].map((frac) => {
        const y = padT + chartH * (1 - frac);
        return (
          <React.Fragment key={frac}>
            <Line x1={padL} y1={y} x2={W - padR} y2={y} stroke={colors.border} strokeWidth={1} />
            <SvgText x={padL - 4} y={y + 4} fontSize={9} fill={colors.mutedForeground} textAnchor="end">
              {Math.round(maxVal * frac)}
            </SvgText>
          </React.Fragment>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * (chartW / data.length) + 3;
        const barH = Math.max(2, (d.amount / maxVal) * chartH);
        const y = padT + chartH - barH;
        const monthLabel = d.month.slice(5); // "MM"
        return (
          <React.Fragment key={d.month}>
            <Rect x={x} y={y} width={barW} height={barH} rx={3} fill={colors.primary} opacity={0.85} />
            <SvgText x={x + barW / 2} y={H - 6} fontSize={9} fill={colors.mutedForeground} textAnchor="middle">
              {monthLabel}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function DashboardScreen() {
  const { accessToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    ...getGetDashboardQueryOptions(),
    enabled: !!accessToken,
    retry: 0,
  });

  const redeemMutation = useRedeemLoyaltyPoints({
    mutation: {
      onSuccess: (result) => {
        Alert.alert("🎉 Redeemed!", result.message);
        queryClient.invalidateQueries({ queryKey: ["getDashboard"] });
        refetch();
      },
      onError: (err: any) => {
        Alert.alert("Cannot Redeem", err?.message || "Not enough points (100 needed)");
      },
    },
  });

  const currentMonthTotal = useMemo(() => {
    if (!data?.spending?.length) return 0;
    return data.spending[data.spending.length - 1]?.amount ?? 0;
  }, [data]);

  if (!accessToken) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Sign in to view your dashboard</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
        </View>
      </View>
    );
  }

  const loyalty = data?.loyalty;
  const tierColor = TIER_COLORS[loyalty?.tier ?? "Bronze"] ?? TIER_COLORS.Bronze!;
  const tierEmoji = TIER_EMOJIS[loyalty?.tier ?? "Bronze"] ?? "🥉";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        </View>

        {/* ── Spending Overview ─────────────────────────────────────── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>💳 Spending Overview</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Last 6 months</Text>
          </View>
          <View style={styles.currentMonthRow}>
            <Text style={[styles.currentMonthLabel, { color: colors.mutedForeground }]}>This month</Text>
            <Text style={[styles.currentMonthValue, { color: colors.primary }]}>
              {currentMonthTotal.toFixed(2)} EUR
            </Text>
          </View>
          {data?.spending && data.spending.length > 0 ? (
            <View style={styles.chartContainer}>
              <SpendingChart data={data.spending} />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No paid sessions yet</Text>
          )}
        </Card>

        {/* ── Most Visited Spots ───────────────────────────────────── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>📍 Most Visited Spots</Text>
          </View>
          {(data?.mostVisited?.length ?? 0) === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No parking history yet</Text>
          ) : (
            data!.mostVisited.map((spot, i) => (
              <TouchableOpacity
                key={spot.lotId}
                style={[styles.spotRow, { borderBottomColor: colors.border }]}
                onPress={() => router.push(`/parking/${spot.lotId}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.spotRank, { backgroundColor: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : "#CD7F32" }]}>
                  <Text style={styles.spotRankText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.spotName, { color: colors.foreground }]}>{spot.name}</Text>
                  <Text style={[styles.spotAddress, { color: colors.mutedForeground }]}>{spot.address}</Text>
                </View>
                <View style={styles.spotRight}>
                  <Text style={[styles.spotVisits, { color: colors.primary }]}>{spot.visits}</Text>
                  <Text style={[styles.spotVisitsLabel, { color: colors.mutedForeground }]}>visits</Text>
                </View>
                <Text style={[styles.arrowEmoji, { color: colors.mutedForeground }]}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </Card>

        {/* ── CO₂ / Environmental Stats ───────────────────────────── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>🌿 Environmental Impact</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>This month</Text>
          </View>
          <View style={styles.co2Row}>
            <View style={styles.co2Stat}>
              <Text style={styles.co2Emoji}>🚶</Text>
              <Text style={[styles.co2Value, { color: colors.foreground }]}>
                {(data?.co2.kmWalked ?? 0).toFixed(1)} km
              </Text>
              <Text style={[styles.co2Label, { color: colors.mutedForeground }]}>walked</Text>
            </View>
            <View style={[styles.co2Divider, { backgroundColor: colors.border }]} />
            <View style={styles.co2Stat}>
              <Text style={styles.co2Emoji}>🌱</Text>
              <Text style={[styles.co2Value, { color: "#16A34A" }]}>
                {(data?.co2.co2SavedGrams ?? 0)} g
              </Text>
              <Text style={[styles.co2Label, { color: colors.mutedForeground }]}>CO₂ saved</Text>
            </View>
            <View style={[styles.co2Divider, { backgroundColor: colors.border }]} />
            <View style={styles.co2Stat}>
              <Text style={styles.co2Emoji}>🅿️</Text>
              <Text style={[styles.co2Value, { color: colors.foreground }]}>
                {data?.co2.sessionsThisMonth ?? 0}
              </Text>
              <Text style={[styles.co2Label, { color: colors.mutedForeground }]}>sessions</Text>
            </View>
          </View>
          <Text style={[styles.co2Desc, { color: colors.mutedForeground }]}>
            You walked {(data?.co2.kmWalked ?? 0).toFixed(1)} km instead of driving further — saving approximately {data?.co2.co2SavedGrams ?? 0} g of CO₂ this month! 🌍
          </Text>
        </Card>

        {/* ── Loyalty Points ───────────────────────────────────────── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {tierEmoji} Loyalty Points
            </Text>
          </View>

          {/* Tier badge + points balance */}
          <View style={styles.loyaltyHero}>
            <View style={[styles.tierBadge, { backgroundColor: tierColor + "20", borderColor: tierColor }]}>
              <Text style={[styles.tierLabel, { color: tierColor }]}>{loyalty?.tier ?? "Bronze"}</Text>
            </View>
            <Text style={[styles.pointsBalance, { color: colors.foreground }]}>
              {loyalty?.points ?? 0}
            </Text>
            <Text style={[styles.pointsUnit, { color: colors.mutedForeground }]}>points</Text>
          </View>

          {/* Progress to next tier */}
          {loyalty?.nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  {loyalty.tier}
                </Text>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  {loyalty.nextTier} at {loyalty.nextTierAt} pts
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${loyalty.progressPct}%` as any, backgroundColor: tierColor },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: colors.mutedForeground }]}>
                {loyalty.progressPct}% to {loyalty.nextTier}
              </Text>
            </View>
          )}
          {!loyalty?.nextTier && (
            <Text style={[styles.maxTierText, { color: TIER_COLORS.Gold! }]}>🏆 You've reached the highest tier!</Text>
          )}

          {/* Redeem button */}
          <View style={styles.redeemSection}>
            <View style={[styles.redeemInfo, { backgroundColor: colors.muted }]}>
              <Text style={[styles.redeemInfoText, { color: colors.foreground }]}>100 pts = 30 free parking minutes</Text>
            </View>
            <Button
              title="Redeem 100 pts → 30 min"
              onPress={() => redeemMutation.mutate()}
              loading={redeemMutation.isPending}
              disabled={(loyalty?.points ?? 0) < 100}
              fullWidth
              style={{ marginTop: 10 }}
            />
          </View>

          {/* Recent redemptions */}
          {(loyalty?.redemptions?.length ?? 0) > 0 && (
            <View style={styles.redemptionsSection}>
              <Text style={[styles.redemptionsTitle, { color: colors.mutedForeground }]}>Recent redemptions</Text>
              {loyalty!.redemptions.slice(0, 3).map((r) => (
                <View key={r.id} style={[styles.redemptionRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.redemptionText, { color: colors.foreground }]}>
                    -{r.pointsSpent} pts → {r.minutesGranted} min
                  </Text>
                  <Text style={[styles.redemptionDate, { color: colors.mutedForeground }]}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700" },
  card: { marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 12 },
  // Spending
  currentMonthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  currentMonthLabel: { fontSize: 14 },
  currentMonthValue: { fontSize: 22, fontWeight: "700" },
  chartContainer: { alignItems: "center" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 16 },
  // Most visited
  spotRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  spotRank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  spotRankText: { color: "white", fontSize: 13, fontWeight: "700" },
  spotName: { fontSize: 14, fontWeight: "600" },
  spotAddress: { fontSize: 12, marginTop: 1 },
  spotRight: { alignItems: "center" },
  spotVisits: { fontSize: 18, fontWeight: "700" },
  spotVisitsLabel: { fontSize: 11 },
  arrowEmoji: { fontSize: 20 },
  // CO2
  co2Row: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 8, marginBottom: 12 },
  co2Stat: { alignItems: "center", flex: 1 },
  co2Emoji: { fontSize: 24, marginBottom: 4 },
  co2Value: { fontSize: 18, fontWeight: "700" },
  co2Label: { fontSize: 11, marginTop: 2 },
  co2Divider: { width: 1, height: 48 },
  co2Desc: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  // Loyalty
  loyaltyHero: { alignItems: "center", paddingVertical: 8 },
  tierBadge: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 8 },
  tierLabel: { fontSize: 14, fontWeight: "700" },
  pointsBalance: { fontSize: 48, fontWeight: "700", lineHeight: 56 },
  pointsUnit: { fontSize: 14 },
  progressSection: { marginBottom: 12 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPct: { fontSize: 11, textAlign: "right", marginTop: 4 },
  maxTierText: { fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  redeemSection: {},
  redeemInfo: { borderRadius: 8, padding: 10, alignItems: "center" },
  redeemInfoText: { fontSize: 13, fontWeight: "600" },
  redemptionsSection: { marginTop: 16 },
  redemptionsTitle: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  redemptionRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1 },
  redemptionText: { fontSize: 13 },
  redemptionDate: { fontSize: 12 },
});
