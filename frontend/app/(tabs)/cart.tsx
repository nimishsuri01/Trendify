import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { catalogImages } from "@/src/catalog";
import { money } from "@/src/api";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.surface },
    emptyScreen: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
    header: { paddingHorizontal: 20, paddingBottom: 22, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
    title: { color: colors.onSurface, fontSize: 34, fontWeight: "800", marginTop: 6 },
    itemCount: { color: colors.muted, fontSize: 12, paddingBottom: 4 },
    items: { paddingHorizontal: 20 },
    item: { flexDirection: "row", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 13 },
    itemImage: { width: 90, height: 112, borderRadius: 14, resizeMode: "cover", backgroundColor: colors.surfaceTertiary },
    itemInfo: { flex: 1 },
    itemName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
    itemMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
    itemPrice: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 8 },
    quantity: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 },
    quantityButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
    quantityText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
    summary: { margin: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.divider },
    summaryTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
    summaryLabel: { color: colors.muted, fontSize: 14 },
    summaryValue: { color: colors.onSurfaceSecondary, fontSize: 14 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider },
    totalLabel: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
    total: { color: colors.onSurface, fontWeight: "800", fontSize: 18 },
    primary: { marginHorizontal: 20, minHeight: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 30 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginTop: 15 },
    emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, marginBottom: 22 },
    checkout: { marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.divider },
    checkoutHead: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    note: { color: colors.success, fontSize: 12, paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
    input: { marginHorizontal: 20, height: 49, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.onSurface, fontSize: 14 },
}));

export default function CartScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { cart, user, updateQuantity, removeItem, createOrder } = useStore();
    const [showCheckout, setShowCheckout] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ full_name: user?.name ?? "", phone: "", email: user?.email ?? "", line1: "", city: "", state: "", pincode: "" });

    const setField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

    const checkout = async () => {
        if (Object.values(form).some((value) => !value.trim())) {
            return Alert.alert("Almost there", "Please complete your delivery details.");
        }
        setSubmitting(true);
        try {
            const order = await createOrder(form);
            Alert.alert("Order placed", `${order.id} is confirmed. Pay on delivery.`, [{ text: "View orders", onPress: () => router.push("/(tabs)/account") }]);
            setShowCheckout(false);
        } catch (error) {
            Alert.alert("Could not place order", error instanceof Error ? error.message : "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <View style={[styles.emptyScreen, { paddingTop: insets.top }]}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="bag-handle-outline" size={30} color={colors.onSurface} />
                </View>
                <Text style={styles.emptyTitle}>Your bag is waiting</Text>
                <Text style={styles.emptyText}>Sign in to save your pieces, add to bag, and check out.</Text>
                <Pressable onPress={() => router.push("/(tabs)/account")} style={styles.primary}>
                    <Text style={styles.primaryText}>Sign in to shop</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 38 }} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View>
                        <Text style={styles.eyebrow}>YOUR SELECTION</Text>
                        <Text style={styles.title}>Your bag</Text>
                    </View>
                    <Text style={styles.itemCount}>{cart.items.length} items</Text>
                </View>
                {cart.items.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="sparkles-outline" size={28} color={colors.muted} />
                        <Text style={styles.emptyTitle}>Your bag is empty</Text>
                        <Text style={styles.emptyText}>Find something that feels like you.</Text>
                        <Pressable onPress={() => router.push("/(tabs)/explore")} style={styles.primary}>
                            <Text style={styles.primaryText}>Explore pieces</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View style={styles.items}>
                            {cart.items.map((item) => (
                                <View key={item.id} style={styles.item}>
                                    <Image source={catalogImages[item.image_key]} style={styles.itemImage} />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemMeta}>{item.color} · Size {item.size}</Text>
                                        <Text style={styles.itemPrice}>{money(item.price)}</Text>
                                        <View style={styles.quantity}>
                                            <Pressable onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)} style={styles.quantityButton}>
                                                <Ionicons name="remove" size={16} color={colors.onSurface} />
                                            </Pressable>
                                            <Text style={styles.quantityText}>{item.quantity}</Text>
                                            <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.quantityButton}>
                                                <Ionicons name="add" size={16} color={colors.onSurface} />
                                            </Pressable>
                                        </View>
                                    </View>
                                    <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                                        <Ionicons name="close" size={19} color={colors.muted} />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                        <View style={styles.summary}>
                            <Text style={styles.summaryTitle}>Order summary</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal</Text>
                                <Text style={styles.summaryValue}>{money(cart.subtotal)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Shipping</Text>
                                <Text style={styles.summaryValue}>{cart.shipping ? money(cart.shipping) : "Free"}</Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.total}>{money(cart.total)}</Text>
                            </View>
                        </View>
                        <Pressable onPress={() => setShowCheckout(true)} style={styles.primary}>
                            <Text style={styles.primaryText}>Continue to checkout</Text>
                            <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
                        </Pressable>
                        {showCheckout ? (
                            <View style={styles.checkout}>
                                <View style={styles.checkoutHead}>
                                    <Text style={styles.summaryTitle}>Delivery details</Text>
                                    <Pressable onPress={() => setShowCheckout(false)}>
                                        <Ionicons name="close" size={20} color={colors.onSurface} />
                                    </Pressable>
                                </View>
                                <Text style={styles.note}>Cash on Delivery · Secure checkout</Text>
                                {[
                                    ["full_name", "Full name"],
                                    ["phone", "Phone number"],
                                    ["email", "Email"],
                                    ["line1", "Address"],
                                    ["city", "City"],
                                    ["state", "State"],
                                    ["pincode", "PIN code"],
                                ].map(([key, placeholder]) => (
                                    <TextInput
                                        key={key}
                                        value={form[key as keyof typeof form]}
                                        onChangeText={(value: string) => setField(key, value)}
                                        placeholder={placeholder}
                                        placeholderTextColor={colors.muted}
                                        style={styles.input}
                                        keyboardType={key === "phone" || key === "pincode" ? "phone-pad" : key === "email" ? "email-address" : "default"}
                                    />
                                ))}
                                <Pressable disabled={submitting} onPress={checkout} style={styles.primary}>
                                    {submitting ? (
                                        <ActivityIndicator color={colors.onBrandPrimary} />
                                    ) : (
                                        <Text style={styles.primaryText}>Place COD order · {money(cart.total)}</Text>
                                    )}
                                </Pressable>
                            </View>
                        ) : null}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
