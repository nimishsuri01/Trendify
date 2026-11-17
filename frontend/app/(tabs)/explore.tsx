import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Product } from "@/src/api";
import { categories } from "@/src/catalog";
import { ProductCard } from "@/src/components/product-card";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
    title: { color: colors.onSurface, fontSize: 34, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
    count: { backgroundColor: colors.surfaceTertiary, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
    countText: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "600" },
    search: { marginHorizontal: 20, backgroundColor: colors.surfaceTertiary, height: 50, borderRadius: 16, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
    searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
    chips: { paddingHorizontal: 20, paddingVertical: 20, gap: 8 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
    chipText: { color: colors.onSurfaceSecondary, fontSize: 12 },
    chipTextActive: { color: colors.onBrandPrimary, fontWeight: "700" },
    sortRow: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    result: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
    sort: { flexDirection: "row", gap: 5, alignItems: "center" },
    sortText: { color: colors.muted, fontSize: 12 },
    grid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    loader: { height: 320 },
    empty: { alignItems: "center", paddingTop: 90, paddingHorizontal: 40 },
    emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: 14 },
    emptyText: { color: colors.muted, fontSize: 14, marginTop: 7, textAlign: "center" },
}));

export default function ExploreScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams() as { category?: string };
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState(params.category ?? "All");
    const [sort, setSort] = useState("newest");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const query = `/products?category=${encodeURIComponent(category === "New Arrivals" ? "" : category)}&search=${encodeURIComponent(search)}&sort=${sort}&limit=30`;
        api<Product[]>(query).then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
    }, [category, search, sort]);

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View>
                        <Text style={styles.eyebrow}>THE TRENDIFY EDIT</Text>
                        <Text style={styles.title}>Explore</Text>
                    </View>
                    <View style={styles.count}>
                        <Text style={styles.countText}>{products.length} pieces</Text>
                    </View>
                </View>
                <View style={styles.search}>
                    <Ionicons name="search-outline" size={20} color={colors.muted} />
                    <TextInput value={search} onChangeText={(text: string) => setSearch(text)} placeholder="Search pieces, categories..." placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {categories.map((item) => (
                        <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
                            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.sortRow}>
                    <Text style={styles.result}>Latest arrivals</Text>
                    <Pressable onPress={() => setSort((current) => current === "newest" ? "price_low" : current === "price_low" ? "price_high" : "newest")} style={styles.sort}>
                        <Ionicons name="swap-vertical-outline" size={16} color={colors.onSurface} />
                        <Text style={styles.sortText}>{sort === "newest" ? "Newest" : sort === "price_low" ? "Price: low" : "Price: high"}</Text>
                    </Pressable>
                </View>
                {loading ? (
                    <ActivityIndicator color={colors.onSurface} style={styles.loader} />
                ) : products.length ? (
                    <View style={styles.grid}>
                        {products.map((product) => <ProductCard key={product.id} product={product} wide />)}
                    </View>
                ) : (
                    <View style={styles.empty}>
                        <Ionicons name="search-outline" size={30} color={colors.muted} />
                        <Text style={styles.emptyTitle}>Nothing found yet</Text>
                        <Text style={styles.emptyText}>Try a different search or category.</Text>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
