import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, money, Product } from "@/src/api";
import { catalogImages } from "@/src/catalog";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.surface },
    loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    imageWrap: { height: 500, backgroundColor: colors.surfaceTertiary, position: "relative" },
    image: { width: "100%", height: "100%", resizeMode: "cover" },
    iconButton: { position: "absolute", width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
    imageLabel: { position: "absolute", bottom: 18, left: 18, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    imageLabelText: { color: colors.onSurface, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
    content: { padding: 22 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    titleWrap: { flex: 1 },
    category: { color: colors.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 },
    title: { color: colors.onSurface, fontSize: 27, fontWeight: "800", marginTop: 6, letterSpacing: -0.5 },
    rating: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14 },
    price: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
    oldPrice: { color: colors.muted, fontSize: 14, textDecorationLine: "line-through" },
    discount: { color: colors.success, fontSize: 12, fontWeight: "700" },
    description: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 23, marginTop: 20 },
    label: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 28, marginBottom: 11 },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    option: { minWidth: 48, height: 42, borderRadius: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    optionActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
    colorOption: { height: 42, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    colorActive: { backgroundColor: colors.brandSecondary, borderColor: colors.borderStrong },
    optionText: { color: colors.onSurfaceSecondary, fontSize: 13 },
    optionTextActive: { color: colors.onBrandPrimary, fontWeight: "700" },
    policy: { flexDirection: "row", gap: 24, borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 32, paddingTop: 20 },
    policyTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
    policyText: { color: colors.muted, fontSize: 12, marginTop: 5 },
    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface },
    addButton: { height: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 12 },
    addText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
    pressed: { opacity: 0.82 },
}));

export default function ProductScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams() as { id: string };
    const [product, setProduct] = useState<Product | null>(null);
    const [size, setSize] = useState("");
    const [color, setColor] = useState("");
    const [message, setMessage] = useState("");
    const { addToCart, wishlist, toggleWishlist } = useStore();

    useEffect(() => {
        if (id) {
            api<Product>(`/products/${id}`)
                .then((item) => {
                    setProduct(item);
                    setSize(item.sizes[0]);
                    setColor(item.colors[0]);
                })
                .catch(() => undefined);
        }
    }, [id]);

    if (!product) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.onSurface} />
            </View>
        );
    }

    const saved = wishlist.includes(product.id);
    const add = async () => {
        if (!size || !color) return setMessage("Choose a size and color first");
        try {
            await addToCart(product, size, color);
            setMessage("Added to your bag");
        } catch {
            setMessage("Sign in to add pieces to your bag");
        }
    };

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
                <View style={styles.imageWrap}>
                    <Image source={catalogImages[product.image_key]} style={styles.image} />
                    <Pressable onPress={() => router.back()} style={[styles.iconButton, { top: insets.top + 10, left: 16 }]}>
                        <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
                    </Pressable>
                    <Pressable onPress={() => toggleWishlist(product.id).catch(() => setMessage("Sign in to save favorites"))} style={[styles.iconButton, { top: insets.top + 10, right: 16 }]}>
                        <Ionicons name={saved ? "heart" : "heart-outline"} size={21} color={saved ? colors.error : colors.onSurface} />
                    </Pressable>
                    <View style={styles.imageLabel}>
                        <Text style={styles.imageLabelText}>{product.badge ?? "TRENDIFY EDIT"}</Text>
                    </View>
                </View>
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <View style={styles.titleWrap}>
                            <Text style={styles.category}>{product.category} · {product.gender}</Text>
                            <Text style={styles.title}>{product.name}</Text>
                        </View>
                        <Text style={styles.rating}>{product.rating} ★</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{money(product.price)}</Text>
                        {product.original_price ? <Text style={styles.oldPrice}>{money(product.original_price)}</Text> : null}
                        <Text style={styles.discount}>{Math.round((1 - product.price / (product.original_price ?? product.price)) * 100)}% off</Text>
                    </View>
                    <Text style={styles.description}>{product.description}</Text>
                    <Text style={styles.label}>Select size</Text>
                    <View style={styles.options}>
                        {product.sizes.map((item) => (
                            <Pressable key={item} onPress={() => setSize(item)} style={[styles.option, size === item && styles.optionActive]}>
                                <Text style={[styles.optionText, size === item && styles.optionTextActive]}>{item}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={styles.label}>Select color · {color}</Text>
                    <View style={styles.options}>
                        {product.colors.map((item) => (
                            <Pressable key={item} onPress={() => setColor(item)} style={[styles.colorOption, color === item && styles.colorActive]}>
                                <Text style={[styles.optionText, color === item && styles.optionTextActive]}>{item}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={styles.policy}>
                        <View>
                            <Text style={styles.policyTitle}>Free delivery</Text>
                            <Text style={styles.policyText}>On orders above ₹2,500</Text>
                        </View>
                        <View>
                            <Text style={styles.policyTitle}>Easy returns</Text>
                            <Text style={styles.policyText}>Within 7 days</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}><Pressable onPress={add} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Text style={styles.addText}>{message || "Add to bag"}</Text><Ionicons name="bag-handle-outline" size={20} color={colors.onBrandPrimary} /></Pressable></View>
        </View>
    );
}
