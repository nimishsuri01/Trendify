import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, money, Order } from "@/src/api";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

type Overview = { revenue: number; orders: number; customers: number; products: number; pending: number };
const statuses = ["Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 22 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "700" },
    title: { color: colors.onSurface, fontSize: 30, fontWeight: "800", marginTop: 4 },
    live: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
    liveText: { color: colors.success, fontSize: 9, fontWeight: "800" },
    metrics: { marginHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metric: { width: "48%", minHeight: 92, padding: 15, borderRadius: 16, backgroundColor: colors.surfaceTertiary },
    metricValue: { color: colors.onSurface, fontSize: 21, fontWeight: "800" },
    metricLabel: { color: colors.muted, fontSize: 12, marginTop: 8 },
    sectionHead: { paddingHorizontal: 20, marginTop: 31, marginBottom: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
    muted: { color: colors.muted, fontSize: 12 },
    order: { marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    orderTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    orderId: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
    orderCustomer: { color: colors.muted, fontSize: 12, marginTop: 6 },
    status: { color: colors.success, fontSize: 11, fontWeight: "700", textAlign: "right" },
    statuses: { gap: 7, paddingTop: 14, flexDirection: "row", flexWrap: "wrap" },
    statusButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 6 },
    statusButtonActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
    statusButtonText: { color: colors.muted, fontSize: 10 },
    statusButtonTextActive: { color: colors.onBrandPrimary, fontWeight: "700" },
    loader: { height: 320 },
    denied: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 30 },
    deniedTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginTop: 14, marginBottom: 20 },
    primary: { backgroundColor: colors.brandPrimary, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 14 },
    primaryText: { color: colors.onBrandPrimary, fontWeight: "700" },
}));

function Metric({ label, value }: { label: string; value: string }) {
    const styles = useStyles();
    return (
        <View style={styles.metric}>
            <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

export default function AdminScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token, user } = useStore();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!token || user?.role !== "admin") return;
        const [nextOverview, nextOrders] = await Promise.all([
            api<Overview>("/admin/overview", {}, token),
            api<Order[]>("/admin/orders", {}, token),
        ]);
        setOverview(nextOverview);
        setOrders(nextOrders);
        setLoading(false);
    };

    useEffect(() => {
        load().catch(() => setLoading(false));
    }, [token, user]);

    if (user?.role !== "admin") {
        return (
            <View style={styles.denied}>
                <Ionicons name="lock-closed-outline" size={30} color={colors.muted} />
                <Text style={styles.deniedTitle}>Admin access only</Text>
                <Pressable onPress={() => router.back()} style={styles.primary}>
                    <Text style={styles.primaryText}>Go back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.back} testID="admin-back">
                        <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.eyebrow}>TRENDIFY / STUDIO</Text>
                        <Text style={styles.title}>Overview</Text>
                    </View>
                    <View style={styles.live}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>
                {loading || !overview ? (
                    <ActivityIndicator color={colors.onSurface} style={styles.loader} />
                ) : (
                    <>
                        <View style={styles.metrics}>
                            <Metric label="Revenue" value={money(overview.revenue)} />
                            <Metric label="Orders" value={String(overview.orders)} />
                            <Metric label="Customers" value={String(overview.customers)} />
                            <Metric label="Products" value={String(overview.products)} />
                        </View>
                        <View style={styles.sectionHead}>
                            <Text style={styles.sectionTitle}>Order queue</Text>
                            <Text style={styles.muted}>{overview.pending} pending</Text>
                        </View>
                        {orders.length ? (
                            orders.map((order) => (
                                <View key={order.id} style={styles.order}>
                                    <View style={styles.orderTop}>
                                        <View>
                                            <Text style={styles.orderId}>{order.id}</Text>
                                            <Text style={styles.orderCustomer}>{order.address.full_name} · {money(order.total)}</Text>
                                        </View>
                                        <Text style={styles.status}>{order.status}</Text>
                                    </View>
                                    <View style={styles.statuses}>
                                        {statuses.map((status) => (
                                            <Pressable
                                                key={status}
                                                onPress={() => api(`/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token ?? undefined).then(load).catch(() => undefined)}
                                                style={[styles.statusButton, order.status === status && styles.statusButtonActive]}
                                                testID={`status-${order.id}-${status}`}
                                            >
                                                <Text style={[styles.statusButtonText, order.status === status && styles.statusButtonTextActive]}>{status}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.muted}>No orders have been placed yet.</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}
