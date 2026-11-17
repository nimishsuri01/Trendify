import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { money } from "@/src/api";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
    loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    auth: { flexGrow: 1, backgroundColor: colors.surface, paddingHorizontal: 28 },
    authKicker: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
    authLogo: { color: colors.onSurface, fontSize: 34, letterSpacing: 4, fontWeight: "800", marginTop: 6 },
    authTitle: { color: colors.onSurface, fontSize: 30, fontWeight: "800", marginTop: 48 },
    authSub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 28 },
    input: { height: 54, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.onSurface, fontSize: 15, marginBottom: 4 },
    primary: { minHeight: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 24 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
    error: { color: colors.error, textAlign: "center", fontSize: 13, marginTop: 12 },
    switch: { alignItems: "center", paddingVertical: 22 },
    switchText: { color: colors.onSurface, textDecorationLine: "underline", fontSize: 13 },
    demo: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 22 },
    profileHead: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 13 },
    avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
    avatarText: { color: colors.onBrandSecondary, fontSize: 23, fontWeight: "800" },
    profileInfo: { flex: 1 },
    eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
    profileName: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginTop: 4 },
    profileEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
    stats: { margin: 20, padding: 18, borderRadius: 18, backgroundColor: colors.surfaceTertiary, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 28 },
    statValue: { color: colors.onSurface, fontSize: 21, fontWeight: "800", textAlign: "center" },
    statLabel: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: "center" },
    admin: { marginHorizontal: 20, padding: 16, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    adminTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
    adminText: { color: colors.muted, fontSize: 12, marginTop: 4 },
    sectionHead: { paddingHorizontal: 20, marginTop: 30, marginBottom: 12 },
    sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
    order: { marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    orderTop: { flexDirection: "row", justifyContent: "space-between" },
    orderId: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
    orderStatus: { color: colors.success, fontSize: 11, fontWeight: "700" },
    orderMeta: { color: colors.muted, fontSize: 12, marginTop: 7 },
    timeline: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
    step: { alignItems: "center", flex: 1 },
    stepDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.borderStrong },
    stepDone: { backgroundColor: colors.success },
    stepText: { color: colors.muted, fontSize: 9, marginTop: 6, textAlign: "center" },
    stepTextDone: { color: colors.onSurfaceSecondary, fontWeight: "700" },
    noOrders: { alignItems: "center", paddingHorizontal: 35, paddingTop: 60 },
    noOrdersTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: 12 },
    noOrdersText: { color: colors.muted, fontSize: 13, marginTop: 6 },
}));

export default function AccountScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, login, register, logout, wishlist, orders, loadOrders, loading } = useStore();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user) loadOrders().catch(() => undefined);
    }, [user]);

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.onSurface} />
            </View>
        );
    }

    if (!user) {
        return (
            <ScrollView contentContainerStyle={[styles.auth, { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
                <Text style={styles.authKicker}>WELCOME TO</Text>
                <Text style={styles.authLogo}>TRENDIFY</Text>
                <Text style={styles.authTitle}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
                <Text style={styles.authSub}>{mode === "login" ? "Your next favorite piece is closer than you think." : "Save your edits, orders and everyday essentials."}</Text>
                {mode === "register" ? (
                    <TextInput value={form.name} onChangeText={(value: string) => setForm({ ...form, name: value })} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} />
                ) : null}
                <TextInput value={form.email} onChangeText={(value: string) => setForm({ ...form, email: value })} placeholder="Email address" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
                <TextInput value={form.password} onChangeText={(value: string) => setForm({ ...form, password: value })} placeholder="Password (min 8 characters)" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
                <Pressable
                    disabled={busy}
                    onPress={async () => {
                        setBusy(true);
                        setError("");
                        try {
                            mode === "login" ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
                        } catch (e) {
                            setError(e instanceof Error ? e.message : "Please try again");
                        } finally {
                            setBusy(false);
                        }
                    }}
                    style={styles.primary}
                >
                    {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
                </Pressable>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} style={styles.switch}>
                    <Text style={styles.switchText}>{mode === "login" ? "New to TRENDIFY? Create an account" : "Already have an account? Sign in"}</Text>
                </Pressable>
                <Text style={styles.demo}>Demo admin: admin@trendify.com | Pass: TrendifyAdmin!2026</Text>
            </ScrollView>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 35 }}>
            <View style={styles.profileHead}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
                    <Text style={styles.profileName}>{user.name}</Text>
                    <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                <Pressable onPress={() => logout()}>
                    <Ionicons name="log-out-outline" size={22} color={colors.muted} />
                </Pressable>
            </View>
            <View style={styles.stats}>
                <View>
                    <Text style={styles.statValue}>{orders.length}</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View>
                    <Text style={styles.statValue}>{wishlist.length}</Text>
                    <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View>
                    <Text style={styles.statValue}>7</Text>
                    <Text style={styles.statLabel}>Day returns</Text>
                </View>
            </View>
            {user.role === "admin" ? (
                <Pressable onPress={() => router.push("/admin")} style={styles.admin}>
                    <Ionicons name="grid-outline" size={20} color={colors.onSurface} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.adminTitle}>Open admin studio</Text>
                        <Text style={styles.adminText}>Manage catalog and orders</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={colors.onSurface} />
                </Pressable>
            ) : null}
            <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Order history</Text>
            </View>
            {orders.length ? (
                orders.map((order) => (
                    <View key={order.id} style={styles.order}>
                        <View style={styles.orderTop}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={styles.orderStatus}>{order.status}</Text>
                        </View>
                        <Text style={styles.orderMeta}>{order.items.length} pieces · {money(order.total)}</Text>
                        <View style={styles.timeline}>
                            {order.timeline.map((step) => (
                                <View key={step.label} style={styles.step}>
                                    <View style={[styles.stepDot, step.done ? styles.stepDone : undefined]} />
                                    <Text style={[styles.stepText, step.done ? styles.stepTextDone : undefined]}>{step.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.noOrders}>
                    <Ionicons name="receipt-outline" size={26} color={colors.muted} />
                    <Text style={styles.noOrdersTitle}>No orders yet</Text>
                    <Text style={styles.noOrdersText}>Your next outfit is waiting to happen.</Text>
                </View>
            )}
        </ScrollView>
    );
}
