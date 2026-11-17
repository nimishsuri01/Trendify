import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { Product, money } from "@/src/api";
import { catalogImages } from "@/src/catalog";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export function ProductCard({ product, wide = false }: { product: Product; wide?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const saved = wishlist.includes(product.id);
  const open = () => router.push({ pathname: "/product/[id]", params: { id: product.id } });
  const quickAdd = async () => { try { await addToCart(product, product.sizes[0], product.colors[0]); } catch { open(); } };
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.card, wide && styles.wide, pressed && styles.pressed]} testID={`product-${product.id}`}>
      <View style={styles.imageWrap}>
        <Image source={catalogImages[product.image_key]} style={styles.image} />
        <Pressable onPress={() => toggleWishlist(product.id).catch(() => open())} style={styles.heart} hitSlop={8} accessibilityLabel="Save product">
          <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? colors.error : colors.onSurface} />
        </Pressable>
        {product.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{product.badge}</Text></View> : null}
      </View>
      <View style={styles.info}><Text style={styles.name} numberOfLines={1}>{product.name}</Text><Text style={styles.meta}>{product.category} · {product.rating} ★</Text><View style={styles.priceRow}><Text style={styles.price}>{money(product.price)}</Text>{product.original_price ? <Text style={styles.oldPrice}>{money(product.original_price)}</Text> : null}<Pressable onPress={quickAdd} style={styles.add} accessibilityLabel="Quick add to bag"><Ionicons name="add" size={18} color={colors.onBrandPrimary} /></Pressable></View></View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { width: 166, marginRight: 14 }, wide: { width: "48%", marginRight: 0, marginBottom: 22 }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  imageWrap: { height: 216, borderRadius: 18, overflow: "hidden", backgroundColor: colors.surfaceTertiary, position: "relative" }, image: { width: "100%", height: "100%", resizeMode: "cover" },
  heart: { position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  badge: { position: "absolute", left: 10, bottom: 10, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.surfaceSecondary }, badgeText: { color: colors.onSurface, fontSize: 10, fontWeight: "700", letterSpacing: 0.7, textTransform: "uppercase" },
  info: { paddingTop: 11 }, name: { color: colors.onSurface, fontSize: 14, fontWeight: "700" }, meta: { color: colors.muted, fontSize: 12, marginTop: 5 }, priceRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 7 }, price: { color: colors.onSurface, fontSize: 14, fontWeight: "700" }, oldPrice: { color: colors.muted, fontSize: 12, textDecorationLine: "line-through" }, add: { marginLeft: "auto", width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
}));