import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Product } from "@/src/api";
import { catalogImages, categories } from "@/src/catalog";
import { ProductCard } from "@/src/components/product-card";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    kicker: { color: colors.muted, fontSize: 9, letterSpacing: 1.8, fontWeight: "700" },
    logo: { color: colors.onSurface, fontSize: 25, letterSpacing: 3.5, fontWeight: "800", marginTop: 4 },
    bag: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
    dot: { position: "absolute", right: 0, top: 0, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    dotText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "700" },
    hero: { height: 465, marginHorizontal: 16, borderRadius: 24, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
    heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
    heroOverlay: { position: "absolute", inset: 0, padding: 24, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.20)" },
    heroEyebrow: { color: colors.onBrandPrimary, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
    heroTitle: { color: colors.onBrandPrimary, fontSize: 42, lineHeight: 43, fontWeight: "800", marginTop: 10, letterSpacing: -1 },
    heroSub: { color: colors.onBrandPrimary, fontSize: 14, marginTop: 10, opacity: 0.9 },
    heroButton: { marginTop: 22, backgroundColor: colors.onBrandPrimary, borderRadius: 25, height: 50, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 12 },
    heroButtonText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
    pressed: { opacity: 0.8 },
    categories: { paddingHorizontal: 20, gap: 10, paddingVertical: 24 },
    category: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, height: 36, borderRadius: 18, justifyContent: "center" },
    categoryText: { color: colors.onSurfaceSecondary, fontSize: 12 },
    sectionHead: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
    eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
    sectionTitle: { color: colors.onSurface, fontSize: 25, fontWeight: "800", letterSpacing: -0.5, marginTop: 5 },
    link: { color: colors.onSurface, fontSize: 13, textDecorationLine: "underline" },
    loader: { height: 240 },
    productRail: { paddingHorizontal: 20 },
    collection: { marginHorizontal: 20, marginTop: 34, height: 280, borderRadius: 20, overflow: "hidden" },
    collectionImage: { width: "100%", height: "100%", resizeMode: "cover" },
    collectionOverlay: { position: "absolute", inset: 0, padding: 20, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.25)" },
    collectionTitle: { color: colors.onBrandPrimary, fontSize: 24, fontWeight: "800" },
    collectionSub: { color: colors.onBrandPrimary, fontSize: 14, marginTop: 4 },
    collectionLink: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "700", marginTop: 15 },
    quote: { paddingHorizontal: 32, paddingVertical: 48, alignItems: "center" },
    quoteMark: { color: colors.brandSecondary, fontSize: 55, height: 48, fontWeight: "800" },
    quoteText: { textAlign: "center", color: colors.onSurface, fontSize: 20, lineHeight: 28, fontWeight: "600" },
    quoteBy: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 16, fontWeight: "700" },
}));

export default function HomeScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { cart } = useStore();

    useEffect(() => {
        api<Product[]>("/products?sort=newest&limit=8").then(setProducts).catch(() => undefined).finally(() => setLoading(false));
    }, []);

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.kicker}>EST. 2026 · INDIA</Text>
                        <Text style={styles.logo}>TRENDIFY</Text>
                    </View>
                    <Pressable onPress={() => router.push("/(tabs)/cart")} style={styles.bag}>
                        <Ionicons name="bag-handle-outline" size={22} color={colors.onSurface} />
                        {cart.items.length > 0 ? (
                            <View style={styles.dot}>
                                <Text style={styles.dotText}>{cart.items.length}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>
                <View style={styles.hero}>
                    <Image source={catalogImages.hero} style={styles.heroImage} />
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroEyebrow}>THE NEW STANDARD</Text>
                        <Text style={styles.heroTitle}>Define your{"\n"}style.</Text>
                        <Text style={styles.heroSub}>Quiet confidence, thoughtfully made.</Text>
                        <Pressable onPress={() => router.push("/(tabs)/explore")} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
                            <Text style={styles.heroButtonText}>Shop the edit</Text>
                            <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
                        </Pressable>
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                    {categories.slice(0, 7).map((item) => (
                        <Pressable key={item} onPress={() => router.push({ pathname: "/(tabs)/explore", params: { category: item } })} style={styles.category}>
                            <Text style={styles.categoryText}>{item}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.sectionHead}>
                    <View>
                        <Text style={styles.eyebrow}>CURATED FOR YOU</Text>
                        <Text style={styles.sectionTitle}>Trending now</Text>
                    </View>
                    <Pressable onPress={() => router.push("/(tabs)/explore")}>
                        <Text style={styles.link}>View all</Text>
                    </Pressable>
                </View>
                {loading ? (
                    <ActivityIndicator color={colors.onSurface} style={styles.loader} />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
                        {products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
                    </ScrollView>
                )}
                <Pressable onPress={() => router.push({ pathname: "/(tabs)/explore", params: { category: "Women" } })} style={styles.collection}>
                    <Image source={catalogImages.denim} style={styles.collectionImage} />
                    <View style={styles.collectionOverlay}>
                        <Text style={styles.collectionTitle}>The everyday edit</Text>
                        <Text style={styles.collectionSub}>Pieces that do more.</Text>
                        <Text style={styles.collectionLink}>Explore collection  ↗</Text>
                    </View>
                </Pressable>
                <View style={styles.quote}>
                    <Text style={styles.quoteMark}>“</Text>
                    <Text style={styles.quoteText}>Style is the quietest way to tell the world who you are.</Text>
                    <Text style={styles.quoteBy}>— TRENDIFY JOURNAL</Text>
                </View>
            </ScrollView>
        </View>
    );
}
